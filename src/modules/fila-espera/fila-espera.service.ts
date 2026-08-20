import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { StatusFilaEspera, TipoFilaEspera } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

// Tempo que o paciente notificado tem para responder à oferta antes de
// passarmos para o próximo da fila (seção 6). TODO: tornar configurável por clínica.
export const EXPIRACAO_OFERTA_FILA_MINUTOS = 30;

interface VagaLiberada {
  consultaId: string;
  clinicaId: string;
  medicoId: string;
  dataHoraInicio: Date;
}

@Injectable()
export class FilaEsperaService {
  private readonly logger = new Logger(FilaEsperaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    @InjectQueue('fila-espera') private readonly filaEsperaQueue: Queue,
  ) {}

  // Notificação sequencial da fila (seção 4/6): oferece a vaga ao 1º da fila
  // (por prioridade/ordem de chegada) e agenda a expiração da oferta. Se a
  // fila estiver vazia, o horário simplesmente volta a ficar disponível.
  async ofertarProximo(vaga: VagaLiberada) {
    const proximo = await this.prisma.filaDeEspera.findFirst({
      where: {
        clinicaId: vaga.clinicaId,
        medicoId: vaga.medicoId,
        tipo: TipoFilaEspera.VAGA_ESPECIFICA,
        status: StatusFilaEspera.AGUARDANDO,
      },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
      include: { paciente: true },
    });

    if (!proximo) {
      this.logger.log(`Fila de espera vazia para médico ${vaga.medicoId} — horário volta a ficar disponível`);
      return null;
    }

    const atualizado = await this.prisma.filaDeEspera.update({
      where: { id: proximo.id },
      data: {
        status: StatusFilaEspera.NOTIFICADO,
        consultaVagaId: vaga.consultaId,
        dataHoraSlot: vaga.dataHoraInicio,
        notificadoEm: new Date(),
        expiraEm: new Date(Date.now() + EXPIRACAO_OFERTA_FILA_MINUTOS * 60_000),
      },
    });

    await this.notificacoesService.enviarOfertaFilaEspera({
      clinicaId: atualizado.clinicaId,
      pacienteId: proximo.pacienteId,
      telefone: proximo.paciente.telefone,
      dataHoraSlot: vaga.dataHoraInicio,
    });

    await this.filaEsperaQueue.add(
      'expirar-oferta',
      { filaEsperaId: atualizado.id },
      { delay: EXPIRACAO_OFERTA_FILA_MINUTOS * 60_000, jobId: `expirar-oferta:${atualizado.id}` },
    );

    return atualizado;
  }

  // Chamado pelo FilaEsperaProcessor quando a oferta expira sem resposta:
  // marca EXPIRADO (guardado por status para não repassar duas vezes a mesma
  // vaga, caso a resposta chegue quase no mesmo instante da expiração) e
  // repassa a vaga para o próximo da fila.
  async processarExpiracao(filaEsperaId: string) {
    const { count } = await this.prisma.filaDeEspera.updateMany({
      where: { id: filaEsperaId, status: StatusFilaEspera.NOTIFICADO },
      data: { status: StatusFilaEspera.EXPIRADO },
    });
    if (count === 0) {
      return null; // já tinha sido aceito/recusado antes de expirar.
    }

    const expirado = await this.prisma.filaDeEspera.findUnique({ where: { id: filaEsperaId } });
    if (!expirado?.consultaVagaId || !expirado.dataHoraSlot) {
      return null;
    }

    return this.ofertarProximo({
      consultaId: expirado.consultaVagaId,
      clinicaId: expirado.clinicaId,
      medicoId: expirado.medicoId,
      dataHoraInicio: expirado.dataHoraSlot,
    });
  }

  // Resposta do paciente (ACEITAR_VAGA/RECUSAR_VAGA) recebida via webhook do
  // WhatsApp. Idempotente pelo mesmo motivo de registrarRespostaSeAindaPendente.
  async registrarResposta(pacienteId: string, aceitou: boolean) {
    const oferta = await this.prisma.filaDeEspera.findFirst({
      where: { pacienteId, status: StatusFilaEspera.NOTIFICADO },
      orderBy: { notificadoEm: 'desc' },
    });
    if (!oferta) {
      return null;
    }

    const { count } = await this.prisma.filaDeEspera.updateMany({
      where: { id: oferta.id, status: StatusFilaEspera.NOTIFICADO },
      data: {
        status: aceitou ? StatusFilaEspera.ACEITO : StatusFilaEspera.RECUSADO,
        respondidoEm: new Date(),
      },
    });
    if (count === 0) {
      return null; // resposta concorrente já processada (ex.: expirou no mesmo instante).
    }

    if (aceitou) {
      // TODO: reservar a vaga automaticamente criando a Consulta. Por ora só
      // alerta a secretária para confirmar e formalizar o agendamento — evita
      // criar uma Consulta sem checar de novo conflitos de última hora.
      await this.notificacoesService.enviarAlertaSecretaria({
        clinicaId: oferta.clinicaId,
        consultaId: oferta.consultaVagaId,
        pacienteId: oferta.pacienteId,
        motivo: 'Paciente aceitou vaga da fila de espera — confirmar e agendar manualmente',
      });
      return oferta;
    }

    if (oferta.tipo === TipoFilaEspera.VAGA_ESPECIFICA && oferta.consultaVagaId && oferta.dataHoraSlot) {
      await this.ofertarProximo({
        consultaId: oferta.consultaVagaId,
        clinicaId: oferta.clinicaId,
        medicoId: oferta.medicoId,
        dataHoraInicio: oferta.dataHoraSlot,
      });
    }

    return oferta;
  }
}
