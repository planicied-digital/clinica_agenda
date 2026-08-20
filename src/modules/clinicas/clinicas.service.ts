import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { UpdateClinicaDto } from './dto/update-clinica.dto';

@Injectable()
export class ClinicasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClinicaDto) {
    return this.prisma.clinica.create({ data: dto });
  }

  findAll() {
    return this.prisma.clinica.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id } });
    if (!clinica) {
      throw new NotFoundException(`Clínica ${id} não encontrada`);
    }
    return clinica;
  }

  async update(id: string, dto: UpdateClinicaDto) {
    await this.findOne(id);
    return this.prisma.clinica.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: preserva histórico clínico (trilha de auditoria/LGPD — seção 8).
    return this.prisma.clinica.update({ where: { id }, data: { ativa: false } });
  }
}
