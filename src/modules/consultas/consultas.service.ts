import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DiaSemana, Prisma, StatusConsulta, StatusFilaEspera, TipoFilaEspera } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

// Tempo que o próximo da fila de espera tem para responder à oferta antes de
// passarmos para o seguinte. TODO: tornar configurável por clínica.
const EXPIRACAO_OFERTA_FILA_MINUTOS = 30;

@Injectable()
export class ConsultasService {
  constructor(private readonly prisma: PrismaService) {}

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

    // TODO: disparar CONFIRMACAO_SOLICITACAO (paciente com WhatsApp) ou
    // ALERTA_SECRETARIA (paciente sem WhatsApp) quando o módulo de
    // notificações/whatsapp existir.

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

    await this.acionarFilaDeEspera(atualizada);
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

    // Libera o horário antigo para a fila de espera (mesma lógica do cancelamento — seção 4).
    await this.acionarFilaDeEspera(consultaAntiga);

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

    // TODO: oferecer horário dentro da janela no ato e, se não houver vaga,
    // criar FilaDeEspera tipo JANELA_PERIODO prioritária (seção 5) — depende
    // do módulo de fila de espera dedicado, ainda não implementado.

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

  // Notifica o próximo paciente da fila de espera do médico quando uma vaga
  // é liberada por cancelamento ou remarcação (seção 4/6).
  private async acionarFilaDeEspera(consultaLiberada: {
    id: string;
    clinicaId: string;
    medicoId: string;
    dataHoraInicio: Date;
  }) {
    const proximo = await this.prisma.filaDeEspera.findFirst({
      where: {
        clinicaId: consultaLiberada.clinicaId,
        medicoId: consultaLiberada.medicoId,
        tipo: TipoFilaEspera.VAGA_ESPECIFICA,
        status: StatusFilaEspera.AGUARDANDO,
      },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
    });

    if (!proximo) {
      return;
    }

    await this.prisma.filaDeEspera.update({
      where: { id: proximo.id },
      data: {
        status: StatusFilaEspera.NOTIFICADO,
        consultaVagaId: consultaLiberada.id,
        dataHoraSlot: consultaLiberada.dataHoraInicio,
        notificadoEm: new Date(),
        expiraEm: new Date(Date.now() + EXPIRACAO_OFERTA_FILA_MINUTOS * 60_000),
      },
    });

    // TODO: disparo real da oferta via WhatsApp quando o módulo existir; e um
    // job (fila `fila-espera`, já registrada) para expirar e passar adiante
    // se o paciente não responder dentro de EXPIRACAO_OFERTA_FILA_MINUTOS.
  }
}
