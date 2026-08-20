import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { StatusConsulta, StatusNotificacao, TipoNotificacao } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../../modules/notificacoes/notificacoes.service';
import { WhatsappService } from '../../modules/whatsapp/whatsapp.service';
import { formatarDataHora } from '../../common/utils/data.util';

const STATUS_FINALIZADOS: StatusConsulta[] = [
  StatusConsulta.CANCELADA,
  StatusConsulta.REALIZADA,
  StatusConsulta.NAO_COMPARECEU,
  StatusConsulta.REMARCADA,
];

// Prazo dado ao paciente para responder ao 2º lembrete antes de escalar para
// contato manual da secretária (seção 4/6). Sem prazo definido no briefing —
// valor conservador, ajustável depois (idealmente por clínica).
const PRAZO_ESCALONAMENTO_MINUTOS = 60;

// Lembretes são mensagens proativas da clínica (seção 6), quase sempre fora
// da janela de 24h de atendimento desde a última mensagem do paciente — a
// Cloud API exige um template pré-aprovado nesse caso (texto/botões livres
// seriam rejeitados pela Meta, ver comentário em WhatsappService.enviarTemplate).
// Nomes precisam existir como templates aprovados no Meta Business Manager.
const TEMPLATE_LEMBRETE_1 = 'lembrete_consulta_48h';
const TEMPLATE_LEMBRETE_2 = 'lembrete_consulta_2h';
const IDIOMA_TEMPLATE = 'pt_BR';

interface LembreteJobData {
  consultaId: string;
}

// Processa a régua de lembretes da seção 6 (48h/2h antes, configurável por
// clínica) e o escalonamento por não resposta descrito na seção 4.
@Processor('lembretes')
export class LembretesProcessor extends WorkerHost {
  private readonly logger = new Logger(LembretesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly whatsappService: WhatsappService,
    @InjectQueue('lembretes') private readonly lembretesQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<LembreteJobData>): Promise<void> {
    switch (job.name) {
      case 'lembrete1':
        return this.processarLembrete(job.data.consultaId, 1);
      case 'lembrete2':
        return this.processarLembrete(job.data.consultaId, 2);
      case 'verificar-resposta':
        return this.processarVerificacaoResposta(job.data.consultaId);
      default:
        this.logger.warn(`Job "${job.name}" desconhecido na fila de lembretes`);
    }
  }

  private async processarLembrete(consultaId: string, etapa: 1 | 2) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: consultaId },
      include: { paciente: true },
    });
    if (!consulta || STATUS_FINALIZADOS.includes(consulta.status)) {
      this.logger.log(`Lembrete ${etapa} ignorado — consulta ${consultaId} não existe mais ou já foi finalizada`);
      return;
    }
    if (!consulta.paciente.temWhatsapp) {
      return; // fluxo manual da secretária, fora da régua automática (seção 4).
    }

    const tipo = etapa === 1 ? TipoNotificacao.LEMBRETE_1 : TipoNotificacao.LEMBRETE_2;

    const notificacao = await this.prisma.notificacao.create({
      data: {
        clinicaId: consulta.clinicaId,
        consultaId: consulta.id,
        pacienteId: consulta.pacienteId,
        tipo,
        status: StatusNotificacao.PENDENTE,
        agendadaPara: new Date(),
      },
    });

    try {
      const whatsappMessageId = await this.enviarPorTipo(tipo, consulta.paciente.telefone, consulta.dataHoraInicio);
      await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { status: StatusNotificacao.ENVIADA, enviadaEm: new Date(), whatsappMessageId },
      });
    } catch (erro) {
      this.logger.error(
        `Falha ao enviar lembrete ${etapa} (notificação ${notificacao.id})`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { status: StatusNotificacao.FALHOU, erro: erro instanceof Error ? erro.message : String(erro) },
      });
    }

    if (etapa === 2) {
      await this.lembretesQueue.add(
        'verificar-resposta',
        { consultaId },
        { delay: PRAZO_ESCALONAMENTO_MINUTOS * 60_000, jobId: `verificar-resposta:${consultaId}` },
      );
    }
  }

  // Escolhe o método do WhatsappService conforme o tipo de notificação —
  // lembretes usam template (proativos, fora da janela de 24h); outros tipos
  // processados nesta fila poderiam usar texto/botões (sessão ainda aberta),
  // mas hoje só LEMBRETE_1/LEMBRETE_2 passam por aqui.
  private enviarPorTipo(tipo: TipoNotificacao, telefone: string, dataHoraInicio: Date): Promise<string | undefined> {
    const dataFormatada = formatarDataHora(dataHoraInicio);

    switch (tipo) {
      case TipoNotificacao.LEMBRETE_1:
        return this.whatsappService.enviarTemplate(telefone, TEMPLATE_LEMBRETE_1, IDIOMA_TEMPLATE, [dataFormatada]);
      case TipoNotificacao.LEMBRETE_2:
        return this.whatsappService.enviarTemplate(telefone, TEMPLATE_LEMBRETE_2, IDIOMA_TEMPLATE, [dataFormatada]);
      default:
        throw new Error(`Tipo de notificação sem envio de WhatsApp mapeado: ${tipo}`);
    }
  }

  private async processarVerificacaoResposta(consultaId: string) {
    const consulta = await this.prisma.consulta.findUnique({ where: { id: consultaId } });
    if (!consulta || STATUS_FINALIZADOS.includes(consulta.status)) {
      return;
    }
    if (consulta.status !== StatusConsulta.AGUARDANDO_CONFIRMACAO && consulta.status !== StatusConsulta.SOLICITADA) {
      return; // paciente já confirmou nesse meio-tempo.
    }

    // Não respondeu ao 2º lembrete: escala para contato manual da secretária
    // (seção 4). Desistência por inatividade é uma decisão da secretária após
    // tentar o contato, não um cancelamento automático por timeout — por isso
    // aqui só alertamos, sem cancelar a consulta.
    await this.notificacoesService.enviarAlertaSecretaria({
      clinicaId: consulta.clinicaId,
      consultaId: consulta.id,
      pacienteId: consulta.pacienteId,
      motivo: 'Paciente não respondeu ao 2º lembrete',
    });
  }
}
