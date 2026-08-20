import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DiaSemana, Prisma, StatusConsulta, StatusFilaEspera, TipoFilaEspera } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { FilaEsperaService } from '../fila-espera/fila-espera.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { ListConsultasQueryDto } from './dto/list-consultas-query.dto';
import { DisponibilidadeQueryDto } from './dto/disponibilidade-query.dto';
import { CancelarConsultaDto } from './dto/cancelar-consulta.dto';
import { RemarcarConsultaDto } from './dto/remarcar-consulta.dto';
import { RegistrarComparecimentoDto } from './dto/registrar-comparecimento.dto';
import { RegistrarRetornoDto } from './dto/registrar-retorno.dto';

// Índice 0 = domingo, igual a Date.prototype.getDay().
const DIAS_SEMANA: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.SEGUNDA,
  DiaSemana.TERCA,
  DiaSemana.QUARTA,
  DiaSemana.QUINTA,
  DiaSemana.SEXTA,
  DiaSemana.SABADO,
];

const STATUS_FINALIZADOS: StatusConsulta[] = [
  StatusConsulta.CANCELADA,
  StatusConsulta.REALIZADA,
  StatusConsulta.NAO_COMPARECEU,
  StatusConsulta.REMARCADA,
];

// Prioridade dada às reservas de retorno na fila de espera (seção 5 — "parte
// das vagas do médico fica reservada para retornos, prioridade de agenda").
const PRIORIDADE_RETORNO = 10;

@Injectable()
export class ConsultasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly filaEsperaService: FilaEsperaService,
    @InjectQueue('lembretes') private readonly lembretesQueue: Queue,
  ) {}

  async create(dto: CreateConsultaDto) {
    const medico = await this.prisma.medico.findUnique({ where: { id: dto.medicoId } });
    if (!medico || medico.clinicaId !== dto.clinicaId) {
      throw new NotFoundException(`Médico ${dto.medicoId} não encontrado nesta clínica`);
    }

    const paciente = await this.prisma.paciente.findUnique({ where: { id: dto.pacienteId } });
    if (!paciente || paciente.clinicaId !== dto.clinicaId) {
      throw new NotFoundException(`Paciente ${dto.pacienteId} não encontrado nesta clínica`);
    }

    const dataHoraInicio = new Date(dto.dataHoraInicio);
    let dataHoraFim = dto.dataHoraFim ? new Date(dto.dataHoraFim) : undefined;

    if (!dataHoraFim) {
      if (!dto.tipoConsultaId) {
        throw new BadRequestException('Informe dataHoraFim ou tipoConsultaId para calcular a duração');
      }
      const tipoConsulta = await this.prisma.tipoConsulta.findUnique({ where: { id: dto.tipoConsultaId } });
      if (!tipoConsulta) {
        throw new NotFoundException(`Tipo de consulta ${dto.tipoConsultaId} não encontrado`);
      }
      dataHoraFim = new Date(dataHoraInicio.getTime() + tipoConsulta.duracaoMinutos * 60_000);
    }

    if (dataHoraFim <= dataHoraInicio) {
      throw new BadRequestException('dataHoraFim deve ser depois de dataHoraInicio');
    }

    await this.assertSlotLivre(dto.clinicaId, dto.medicoId, dataHoraInicio, dataHoraFim);

    // Sem WhatsApp: entra em SOLICITADA e cai para contato manual da secretária
    // (seção 4). Com WhatsApp: aguarda a confirmação automática.
    const statusInicial = paciente.temWhatsapp ? StatusConsulta.AGUARDANDO_CONFIRMACAO : StatusConsulta.SOLICITADA;

    const consulta = await this.prisma.consulta.create({
      data: {
        clinicaId: dto.clinicaId,
        medicoId: dto.medicoId,
        pacienteId: dto.pacienteId,
        tipoConsultaId: dto.tipoConsultaId,
        salaId: dto.salaId,
        dataHoraInicio,
        dataHoraFim,
        origem: dto.origem,
        motivo: dto.motivo,
        observacoes: dto.observacoes,
        status: statusInicial,
      },
    });

    if (paciente.temWhatsapp) {
      await this.notificacoesService.enviarConfirmacaoSolicitacao({
        clinicaId: consulta.clinicaId,
        consultaId: consulta.id,
        pacienteId: consulta.pacienteId,
        telefone: paciente.telefone,
        dataHoraInicio: consulta.dataHoraInicio,
      });
      await this.agendarLembretes(consulta);
    } else {
      await this.notificacoesService.enviarAlertaSecretaria({
        clinicaId: consulta.clinicaId,
        consultaId: consulta.id,
        pacienteId: consulta.pacienteId,
        motivo: 'Paciente sem WhatsApp — contato manual necessário',
      });
    }

    return consulta;
  }

  findAll(query: ListConsultasQueryDto) {
    const where: Prisma.ConsultaWhereInput = { clinicaId: query.clinicaId };

    if (query.medicoId) where.medicoId = query.medicoId;
    if (query.salaId) where.salaId = query.salaId;
    if (query.pacienteId) where.pacienteId = query.pacienteId;
    if (query.status) where.status = query.status;

    if (query.data) {
      const inicio = new Date(`${query.data}T00:00:00`);
      const fim = new Date(inicio);
      fim.setHours(23, 59, 59, 999);
      where.dataHoraInicio = { gte: inicio, lte: fim };
    }

    return this.prisma.consulta.findMany({
      where,
      orderBy: { dataHoraInicio: 'asc' },
      include: { paciente: true, medico: true, tipoConsulta: true, sala: true },
    });
  }

  async findOne(id: string) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: { paciente: true, medico: true, tipoConsulta: true, sala: true },
    });
    if (!consulta) {
      throw new NotFoundException(`Consulta ${id} não encontrada`);
    }
    return consulta;
  }

  async update(id: string, dto: UpdateConsultaDto) {
    await this.findOne(id);
    return this.prisma.consulta.update({ where: { id }, data: dto });
  }

  async confirmar(id: string) {
    const consulta = await this.findOne(id);
    if (![StatusConsulta.SOLICITADA, StatusConsulta.AGUARDANDO_CONFIRMACAO].includes(consulta.status)) {
      throw new BadRequestException(`Consulta com status ${consulta.status} não pode ser confirmada`);
    }
    return this.prisma.consulta.update({ where: { id }, data: { status: StatusConsulta.CONFIRMADA } });
  }

  async cancelar(id: string, dto: CancelarConsultaDto) {
    const consulta = await this.findOne(id);
    if (STATUS_FINALIZADOS.includes(consulta.status)) {
      throw new BadRequestException(`Consulta com status ${consulta.status} não pode ser cancelada`);
    }

    const atualizada = await this.prisma.consulta.update({
      where: { id },
      data: {
        status: StatusConsulta.CANCELADA,
        canceladaEm: new Date(),
        motivoCancelamento: dto.motivo,
      },
    });

    await this.cancelarLembretesPendentes(id);
    await this.filaEsperaService.ofertarProximo({
      consultaId: atualizada.id,
      clinicaId: atualizada.clinicaId,
      medicoId: atualizada.medicoId,
      dataHoraInicio: atualizada.dataHoraInicio,
    });
    return atualizada;
  }

  async remarcar(id: string, dto: RemarcarConsultaDto) {
    const consultaAntiga = await this.findOne(id);
    if (STATUS_FINALIZADOS.includes(consultaAntiga.status)) {
      throw new BadRequestException(`Consulta com status ${consultaAntiga.status} não pode ser remarcada`);
    }

    const novaDataHoraInicio = new Date(dto.novaDataHoraInicio);
    const duracaoMs = consultaAntiga.dataHoraFim.getTime() - consultaAntiga.dataHoraInicio.getTime();
    const novaDataHoraFim = dto.novaDataHoraFim ? new Date(dto.novaDataHoraFim) : new Date(novaDataHoraInicio.getTime() + duracaoMs);

    if (novaDataHoraFim <= novaDataHoraInicio) {
      throw new BadRequestException('novaDataHoraFim deve ser depois de novaDataHoraInicio');
    }

    await this.assertSlotLivre(consultaAntiga.clinicaId, consultaAntiga.medicoId, novaDataHoraInicio, novaDataHoraFim, consultaAntiga.id);

    const novaConsulta = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.consulta.create({
        data: {
          clinicaId: consultaAntiga.clinicaId,
          medicoId: consultaAntiga.medicoId,
          pacienteId: consultaAntiga.pacienteId,
          tipoConsultaId: consultaAntiga.tipoConsultaId,
          salaId: dto.salaId ?? consultaAntiga.salaId,
          dataHoraInicio: novaDataHoraInicio,
          dataHoraFim: novaDataHoraFim,
          origem: consultaAntiga.origem,
          motivo: consultaAntiga.motivo,
          status: StatusConsulta.AGUARDANDO_CONFIRMACAO,
          remarcadaDeId: consultaAntiga.id,
        },
      });

      await tx.consulta.update({
        where: { id: consultaAntiga.id },
        data: { status: StatusConsulta.REMARCADA },
      });

      return criada;
    });

    await this.cancelarLembretesPendentes(consultaAntiga.id);

    if (consultaAntiga.paciente.temWhatsapp) {
      await this.notificacoesService.enviarRemarcacao({
        clinicaId: novaConsulta.clinicaId,
        consultaId: novaConsulta.id,
        pacienteId: novaConsulta.pacienteId,
        telefone: consultaAntiga.paciente.telefone,
        dataHoraInicio: novaConsulta.dataHoraInicio,
      });
      await this.agendarLembretes(novaConsulta);
    }

    // Libera o horário antigo para a fila de espera (mesma lógica do cancelamento — seção 4/6).
    await this.filaEsperaService.ofertarProximo({
      consultaId: consultaAntiga.id,
      clinicaId: consultaAntiga.clinicaId,
      medicoId: consultaAntiga.medicoId,
      dataHoraInicio: consultaAntiga.dataHoraInicio,
    });

    return novaConsulta;
  }

  async registrarComparecimento(id: string, dto: RegistrarComparecimentoDto) {
    const consulta = await this.findOne(id);
    const statusPermitidos: StatusConsulta[] = [
      StatusConsulta.CONFIRMADA,
      StatusConsulta.SOLICITADA,
      StatusConsulta.AGUARDANDO_CONFIRMACAO,
    ];
    if (!statusPermitidos.includes(consulta.status)) {
      throw new BadRequestException(`Consulta com status ${consulta.status} não pode ter comparecimento registrado`);
    }

    const atualizada = await this.prisma.consulta.update({
      where: { id },
      data: { status: dto.compareceu ? StatusConsulta.REALIZADA : StatusConsulta.NAO_COMPARECEU },
    });

    // TODO: se não compareceu, sugerir remarcação automaticamente (seção 4) —
    // depende do módulo de notificações/whatsapp, ainda não implementado.

    return atualizada;
  }

  async registrarRetorno(id: string, dto: RegistrarRetornoDto) {
    const consulta = await this.findOne(id);

    const retornoJanelaInicio = new Date(consulta.dataHoraInicio.getTime() + dto.prazoDiasMin * 86_400_000);
    const retornoJanelaFim = new Date(consulta.dataHoraInicio.getTime() + dto.prazoDiasMax * 86_400_000);

    const atualizada = await this.prisma.consulta.update({
      where: { id },
      data: {
        necessitaRetorno: true,
        retornoPrazoDiasMin: dto.prazoDiasMin,
        retornoPrazoDiasMax: dto.prazoDiasMax,
        retornoJanelaInicio,
        retornoJanelaFim,
      },
    });

    // Reserva prioritária na fila de espera para a janela de retorno (seção 5/6).
    // Oferecer o horário no ato é responsabilidade do painel/frontend (ainda
    // não existe) usando GET /consultas/disponibilidade; aqui garantimos que o
    // paciente não se perca caso isso não aconteça antes de sair da clínica.
    // JANELA_PERIODO não é repassada automaticamente como VAGA_ESPECIFICA —
    // não há um horário específico para oferecer, só a janela recomendada.
    await this.prisma.filaDeEspera.create({
      data: {
        clinicaId: atualizada.clinicaId,
        medicoId: atualizada.medicoId,
        pacienteId: atualizada.pacienteId,
        tipo: TipoFilaEspera.JANELA_PERIODO,
        janelaInicio: retornoJanelaInicio,
        janelaFim: retornoJanelaFim,
        prioridade: PRIORIDADE_RETORNO,
        status: StatusFilaEspera.AGUARDANDO,
      },
    });

    await this.notificacoesService.enviarAlertaSecretaria({
      clinicaId: atualizada.clinicaId,
      consultaId: atualizada.id,
      pacienteId: atualizada.pacienteId,
      motivo: 'Retorno registrado — acompanhar agendamento dentro da janela recomendada',
    });

    return atualizada;
  }

  async disponibilidade(query: DisponibilidadeQueryDto) {
    const medico = await this.prisma.medico.findUnique({ where: { id: query.medicoId } });
    if (!medico) {
      throw new NotFoundException(`Médico ${query.medicoId} não encontrado`);
    }

    let duracaoMinutos = query.duracaoMinutos;
    if (!duracaoMinutos) {
      if (!query.tipoConsultaId) {
        throw new BadRequestException('Informe duracaoMinutos ou tipoConsultaId');
      }
      const tipoConsulta = await this.prisma.tipoConsulta.findUnique({ where: { id: query.tipoConsultaId } });
      if (!tipoConsulta) {
        throw new NotFoundException(`Tipo de consulta ${query.tipoConsultaId} não encontrado`);
      }
      duracaoMinutos = tipoConsulta.duracaoMinutos;
    }

    // Assume que o servidor roda no timezone da clínica (MVP de região única —
    // seção 7). Se a operação virar multi-timezone, isso precisa de conversão explícita.
    const dataBase = new Date(`${query.data}T00:00:00`);
    const diaSemana = DIAS_SEMANA[dataBase.getDay()];

    const horarios = await this.prisma.horarioAtendimento.findMany({
      where: { medicoId: query.medicoId, diaSemana, ativo: true },
    });
    if (horarios.length === 0) {
      return [];
    }

    const inicioDoDia = new Date(dataBase);
    const fimDoDia = new Date(dataBase);
    fimDoDia.setHours(23, 59, 59, 999);

    const [bloqueios, consultasOcupadas] = await Promise.all([
      this.prisma.bloqueio.findMany({
        where: {
          clinicaId: medico.clinicaId,
          OR: [{ medicoId: medico.id }, { medicoId: null }],
          dataHoraInicio: { lt: fimDoDia },
          dataHoraFim: { gt: inicioDoDia },
        },
      }),
      this.prisma.consulta.findMany({
        where: {
          medicoId: medico.id,
          status: { notIn: [StatusConsulta.CANCELADA, StatusConsulta.REMARCADA] },
          dataHoraInicio: { lt: fimDoDia },
          dataHoraFim: { gt: inicioDoDia },
        },
      }),
    ]);

    const ocupados = [...bloqueios, ...consultasOcupadas].map((o) => ({
      inicio: o.dataHoraInicio,
      fim: o.dataHoraFim,
    }));

    const agora = new Date();
    const slots: { inicio: Date; fim: Date }[] = [];

    for (const horario of horarios) {
      let cursor = horario.horaInicioMinutos;
      while (cursor + duracaoMinutos <= horario.horaFimMinutos) {
        const slotInicio = this.minutosParaData(dataBase, cursor);
        const slotFim = this.minutosParaData(dataBase, cursor + duracaoMinutos);

        const colide = ocupados.some((o) => slotInicio < o.fim && slotFim > o.inicio);
        if (!colide && slotInicio > agora) {
          slots.push({ inicio: slotInicio, fim: slotFim });
        }
        cursor += duracaoMinutos;
      }
    }

    return slots;
  }

  private minutosParaData(base: Date, minutos: number): Date {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(minutos);
    return d;
  }

  private async assertSlotLivre(
    clinicaId: string,
    medicoId: string,
    inicio: Date,
    fim: Date,
    ignorarConsultaId?: string,
  ) {
    const conflitoConsulta = await this.prisma.consulta.findFirst({
      where: {
        medicoId,
        status: { notIn: [StatusConsulta.CANCELADA, StatusConsulta.REMARCADA] },
        dataHoraInicio: { lt: fim },
        dataHoraFim: { gt: inicio },
        ...(ignorarConsultaId ? { id: { not: ignorarConsultaId } } : {}),
      },
    });
    if (conflitoConsulta) {
      throw new ConflictException('Já existe uma consulta nesse horário para o médico');
    }

    const conflitoBloqueio = await this.prisma.bloqueio.findFirst({
      where: {
        clinicaId,
        OR: [{ medicoId }, { medicoId: null }],
        dataHoraInicio: { lt: fim },
        dataHoraFim: { gt: inicio },
      },
    });
    if (conflitoBloqueio) {
      throw new ConflictException('Horário bloqueado (feriado, férias ou evento)');
    }
  }

  // Agenda a régua de lembretes configurável por clínica (seção 6 — padrão
  // 48h/2h antes). jobId estável por etapa+consulta: reagendar a mesma
  // consulta não duplica o job, e cancelarLembretesPendentes sabe como achá-lo.
  private async agendarLembretes(consulta: { id: string; clinicaId: string; dataHoraInicio: Date }) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id: consulta.clinicaId } });
    if (!clinica) {
      return;
    }

    const agendarEtapa = async (jobName: 'lembrete1' | 'lembrete2', horasAntes: number) => {
      const delay = consulta.dataHoraInicio.getTime() - Date.now() - horasAntes * 3_600_000;
      if (delay <= 0) {
        return; // consulta marcada em cima da hora — pula essa etapa da régua.
      }
      await this.lembretesQueue.add(jobName, { consultaId: consulta.id }, { delay, jobId: `${jobName}:${consulta.id}` });
    };

    await agendarEtapa('lembrete1', clinica.reguaLembrete1Horas);
    await agendarEtapa('lembrete2', clinica.reguaLembrete2Horas);
  }

  // Remove jobs de lembrete/escalonamento pendentes de uma consulta que não
  // precisa mais deles (cancelada ou remarcada para outro horário).
  private async cancelarLembretesPendentes(consultaId: string) {
    const jobIds = ['lembrete1', 'lembrete2', 'verificar-resposta'].map((etapa) => `${etapa}:${consultaId}`);
    await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await this.lembretesQueue.getJob(jobId);
        await job?.remove();
      }),
    );
  }
}
