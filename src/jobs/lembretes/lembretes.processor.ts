import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { StatusConsulta } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../../modules/notificacoes/notificacoes.service';

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

    await this.notificacoesService.enviarLembrete({
      clinicaId: consulta.clinicaId,
      consultaId: consulta.id,
      pacienteId: consulta.pacienteId,
      telefone: consulta.paciente.telefone,
      dataHoraInicio: consulta.dataHoraInicio,
      etapa,
    });

    if (etapa === 2) {
      await this.lembretesQueue.add(
        'verificar-resposta',
        { consultaId },
        { delay: PRAZO_ESCALONAMENTO_MINUTOS * 60_000, jobId: `verificar-resposta:${consultaId}` },
      );
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
