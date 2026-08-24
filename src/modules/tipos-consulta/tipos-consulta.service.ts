import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TiposConsultaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(clinicaId: string, medicoId?: string) {
    const where: Prisma.TipoConsultaWhereInput = { clinicaId, ativo: true };
    if (medicoId) {
      where.OR = [{ medicoId: null }, { medicoId }];
    }

    return this.prisma.tipoConsulta.findMany({ where, orderBy: { nome: 'asc' } });
  }
}
