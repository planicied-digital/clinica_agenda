import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RespostaPaciente, StatusNotificacao, TipoNotificacao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { formatarDataHora } from '../../common/utils/data.util';
import { ListNotificacoesQueryDto } from './dto/list-notificacoes-query.dto';

const STATUS_AGUARDANDO_RESPOSTA: StatusNotificacao[] = [
  StatusNotificacao.ENVIADA,
  StatusNotificacao.ENTREGUE,
  StatusNotificacao.LIDA,
];

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  findAll(query: ListNotificacoesQueryDto) {
    const where: Prisma.NotificacaoWhereInput = { clinicaId: query.clinicaId };
    if (query.consultaId) where.consultaId = query.consultaId;
    if (query.pacienteId) where.pacienteId = query.pacienteId;
    if (query.status) where.status = query.status;

    return this.prisma.notificacao.findMany({ where, orderBy: { agendadaPara: 'desc' } });
  }

  // Encontra a última notificação em aberto do paciente e registra a resposta
  // com um update condicional (guardado pelo status lido) para que um webhook
  // duplicado/retransmitido pela Meta não processe a mesma resposta duas vezes
  // (idempotência exigida pela seção 8).
  async registrarRespostaSeAindaPendente(pacienteId: string, resposta: RespostaPaciente, textoBruto?: string) {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: {
        pacienteId,
        status: { in: STATUS_AGUARDANDO_RESPOSTA },
        consultaId: { not: null },
      },
      orderBy: { agendadaPara: 'desc' },
    });

    if (!notificacao) {
      return null;
    }

    const { count } = await this.prisma.notificacao.updateMany({
      where: { id: notificacao.id, status: notificacao.status },
      data: {
        status: StatusNotificacao.RESPONDIDA,
        respostaPaciente: resposta,
        respostaTextoBruto: textoBruto,
        respondidaEm: new Date(),
      },
    });

    if (count === 0) {
      return null; // outra requisição concorrente já processou essa resposta.
    }

    return notificacao;
  }

  async atualizarStatusPorWhatsappMessageId(whatsappMessageId: string, status: StatusNotificacao) {
    const notificacao = await this.prisma.notificacao.findUnique({ where: { whatsappMessageId } });
    if (!notificacao) {
      return null;
    }

    const data: Prisma.NotificacaoUpdateInput = { status };
    if (status === StatusNotificacao.ENVIADA) data.enviadaEm = new Date();
    if (status === StatusNotificacao.ENTREGUE) data.entregueEm = new Date();
    // Não há coluna própria para "lida" no schema atual — só o status muda.

    return this.prisma.notificacao.update({ where: { id: notificacao.id }, data });
  }

  // Confirmação inicial ao criar a consulta (seção 4) — pede para o paciente
  // confirmar antes de entrar na régua de lembretes.
  async enviarConfirmacaoSolicitacao(params: {
    clinicaId: string;
    consultaId: string;
    pacienteId: string;
    telefone: string;
    dataHoraInicio: Date;
  }) {
    return this.registrarEnvio({
      clinicaId: params.clinicaId,
      consultaId: params.consultaId,
      pacienteId: params.pacienteId,
      tipo: TipoNotificacao.CONFIRMACAO_SOLICITACAO,
      envio: () =>
        this.whatsappService.enviarBotoes(
          params.telefone,
          `Sua consulta foi agendada para ${formatarDataHora(params.dataHoraInicio)}. Podemos confirmar?`,
          [
            { id: 'CONFIRMAR', titulo: 'Confirmar' },
            { id: 'CANCELAR', titulo: 'Cancelar' },
          ],
        ),
    });
  }

  // Novo horário proposto numa remarcação — mesma régua de confirmação, tipo
  // de notificação próprio (REMARCACAO) para diferenciar no histórico.
  async enviarRemarcacao(params: {
    clinicaId: string;
    consultaId: string;
    pacienteId: string;
    telefone: string;
    dataHoraInicio: Date;
  }) {
    return this.registrarEnvio({
      clinicaId: params.clinicaId,
      consultaId: params.consultaId,
      pacienteId: params.pacienteId,
      tipo: TipoNotificacao.REMARCACAO,
      envio: () =>
        this.whatsappService.enviarBotoes(
          params.telefone,
          `Sua consulta foi remarcada para ${formatarDataHora(params.dataHoraInicio)}. Podemos confirmar?`,
          [
            { id: 'CONFIRMAR', titulo: 'Confirmar' },
            { id: 'CANCELAR', titulo: 'Cancelar' },
          ],
        ),
    });
  }

  // Régua de lembretes configurável por clínica (seção 6) — etapa 1 (padrão
  // 48h antes) ou etapa 2 (padrão 2h antes), disparadas pelo LembretesProcessor.
  async enviarLembrete(params: {
    clinicaId: string;
    consultaId: string;
    pacienteId: string;
    telefone: string;
    dataHoraInicio: Date;
    etapa: 1 | 2;
  }) {
    return this.registrarEnvio({
      clinicaId: params.clinicaId,
      consultaId: params.consultaId,
      pacienteId: params.pacienteId,
      tipo: params.etapa === 1 ? TipoNotificacao.LEMBRETE_1 : TipoNotificacao.LEMBRETE_2,
      envio: () =>
        this.whatsappService.enviarBotoes(
          params.telefone,
          `Lembrete: você tem consulta em ${formatarDataHora(params.dataHoraInicio)}. Confirma presença?`,
          [
            { id: 'CONFIRMAR', titulo: 'Confirmar' },
            { id: 'CANCELAR', titulo: 'Cancelar' },
            { id: 'REMARCAR', titulo: 'Remarcar' },
          ],
        ),
    });
  }

  // Oferta de vaga liberada para o próximo da fila de espera (seção 4/6).
  async enviarOfertaFilaEspera(params: {
    clinicaId: string;
    pacienteId: string;
    telefone: string;
    dataHoraSlot: Date;
  }) {
    return this.registrarEnvio({
      clinicaId: params.clinicaId,
      pacienteId: params.pacienteId,
      tipo: TipoNotificacao.FILA_ESPERA_OFERTA,
      envio: () =>
        this.whatsappService.enviarBotoes(
          params.telefone,
          `Uma vaga foi liberada para ${formatarDataHora(params.dataHoraSlot)}. Você aceita esse horário?`,
          [
            { id: 'ACEITAR_VAGA', titulo: 'Aceitar' },
            { id: 'RECUSAR_VAGA', titulo: 'Recusar' },
          ],
        ),
    });
  }

  // Escalonamento para contato manual (seção 4): paciente sem WhatsApp, sem
  // resposta após o 2º lembrete, pediu remarcação, ou aceitou vaga da fila.
  // Não envia WhatsApp — só registra a pendência para o painel da secretária
  // (painel ainda não implementado, ver roteiro no README/briefing).
  async enviarAlertaSecretaria(params: {
    clinicaId: string;
    consultaId?: string | null;
    pacienteId: string;
    motivo: string;
  }) {
    this.logger.warn(`Alerta secretária (${params.motivo}) — paciente ${params.pacienteId}`);
    return this.prisma.notificacao.create({
      data: {
        clinicaId: params.clinicaId,
        consultaId: params.consultaId ?? undefined,
        pacienteId: params.pacienteId,
        tipo: TipoNotificacao.ALERTA_SECRETARIA,
        status: StatusNotificacao.PENDENTE,
        agendadaPara: new Date(),
      },
    });
  }

  // Registra a notificação como PENDENTE, tenta o envio via WhatsApp e marca
  // ENVIADA (com o whatsappMessageId para correlação de status) ou FALHOU —
  // confiabilidade de notificações exigida pela seção 8.
  private async registrarEnvio(params: {
    clinicaId: string;
    consultaId?: string;
    pacienteId: string;
    tipo: TipoNotificacao;
    envio: () => Promise<string | undefined>;
  }) {
    const notificacao = await this.prisma.notificacao.create({
      data: {
        clinicaId: params.clinicaId,
        consultaId: params.consultaId,
        pacienteId: params.pacienteId,
        tipo: params.tipo,
        status: StatusNotificacao.PENDENTE,
        agendadaPara: new Date(),
      },
    });

    try {
      const whatsappMessageId = await params.envio();
      return await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { status: StatusNotificacao.ENVIADA, enviadaEm: new Date(), whatsappMessageId },
      });
    } catch (erro) {
      this.logger.error(
        `Falha ao enviar notificação ${notificacao.id} (${params.tipo})`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      return this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { status: StatusNotificacao.FALHOU, erro: erro instanceof Error ? erro.message : String(erro) },
      });
    }
  }
}
