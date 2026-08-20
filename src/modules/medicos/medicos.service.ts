import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { UpdateMedicoDto } from './dto/update-medico.dto';

@Injectable()
export class MedicosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMedicoDto) {
    await this.assertClinicaExists(dto.clinicaId);
    return this.prisma.medico.create({ data: dto });
  }

  findAll(clinicaId: string, ativo?: boolean) {
    return this.prisma.medico.findMany({
      where: { clinicaId, ...(ativo !== undefined ? { ativo } : {}) },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const medico = await this.prisma.medico.findUnique({ where: { id } });
    if (!medico) {
      throw new NotFoundException(`Médico ${id} não encontrado`);
    }
    return medico;
  }

  async update(id: string, dto: UpdateMedicoDto) {
    await this.findOne(id);
    return this.prisma.medico.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.medico.update({ where: { id }, data: { ativo: false } });
  }

  private async assertClinicaExists(clinicaId: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) {
      throw new NotFoundException(`Clínica ${clinicaId} não encontrada`);
    }
  }
}
