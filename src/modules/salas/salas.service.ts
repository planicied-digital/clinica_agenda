import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(clinicaId: string) {
    return this.prisma.sala.findMany({
      where: { clinicaId, ativa: true },
      orderBy: { nome: 'asc' },
    });
  }
}
