import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHorarioAtendimentoDto } from './dto/create-horario-atendimento.dto';
import { UpdateHorarioAtendimentoDto } from './dto/update-horario-atendimento.dto';

@Injectable()
export class HorariosAtendimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHorarioAtendimentoDto) {
    await this.assertMedicoNaClinica(dto.medicoId, dto.clinicaId);
    this.assertIntervaloValido(dto.horaInicioMinutos, dto.horaFimMinutos);

    return this.prisma.horarioAtendimento.create({ data: dto });
  }

  findAll(clinicaId: string, medicoId?: string) {
    return this.prisma.horarioAtendimento.findMany({
      where: { clinicaId, ativo: true, ...(medicoId ? { medicoId } : {}) },
      // DiaSemana é um enum nativo do Postgres declarado na ordem
      // domingo→sábado — orderBy nele usa essa ordem ordinal, não alfabética.
      orderBy: [{ diaSemana: 'asc' }, { horaInicioMinutos: 'asc' }],
    });
  }

  async findOne(id: string) {
    const horario = await this.prisma.horarioAtendimento.findUnique({ where: { id } });
    if (!horario) {
      throw new NotFoundException(`Horário de atendimento ${id} não encontrado`);
    }
    return horario;
  }

  async update(id: string, dto: UpdateHorarioAtendimentoDto) {
    const horario = await this.findOne(id);
    this.assertIntervaloValido(
      dto.horaInicioMinutos ?? horario.horaInicioMinutos,
      dto.horaFimMinutos ?? horario.horaFimMinutos,
    );

    return this.prisma.horarioAtendimento.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: manter o histórico e evitar que uma reativação futura vire
    // um create novo — o mesmo padrão de TiposConsultaService/SalasService.
    return this.prisma.horarioAtendimento.update({ where: { id }, data: { ativo: false } });
  }

  private assertIntervaloValido(horaInicioMinutos: number, horaFimMinutos: number) {
    if (horaFimMinutos <= horaInicioMinutos) {
      throw new BadRequestException('horaFimMinutos deve ser depois de horaInicioMinutos');
    }
  }

  private async assertMedicoNaClinica(medicoId: string, clinicaId: string) {
    const medico = await this.prisma.medico.findUnique({ where: { id: medicoId } });
    if (!medico || medico.clinicaId !== clinicaId) {
      throw new NotFoundException(`Médico ${medicoId} não encontrado nesta clínica`);
    }
  }
}
