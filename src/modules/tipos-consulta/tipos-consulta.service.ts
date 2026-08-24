import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTipoConsultaDto } from './dto/create-tipo-consulta.dto';
import { UpdateTipoConsultaDto } from './dto/update-tipo-consulta.dto';

@Injectable()
export class TiposConsultaService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTipoConsultaDto) {
    return this.prisma.tipoConsulta.create({ data: dto });
  }

  findAll(clinicaId: string, medicoId?: string) {
    const where: Prisma.TipoConsultaWhereInput = { clinicaId, ativo: true };
    if (medicoId) {
      where.OR = [{ medicoId: null }, { medicoId }];
    }

    return this.prisma.tipoConsulta.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async findOne(id: string) {
    const tipoConsulta = await this.prisma.tipoConsulta.findUnique({ where: { id } });
    if (!tipoConsulta) {
      throw new NotFoundException(`Tipo de consulta ${id} não encontrado`);
    }
    return tipoConsulta;
  }

  async update(id: string, dto: UpdateTipoConsultaDto) {
    await this.findOne(id);
    return this.prisma.tipoConsulta.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: Consulta.tipoConsultaId referencia esse registro — apagar de
    // verdade quebraria o histórico de consultas antigas desse tipo.
    return this.prisma.tipoConsulta.update({ where: { id }, data: { ativo: false } });
  }
}
