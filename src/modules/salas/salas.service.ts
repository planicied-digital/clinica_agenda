import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaDto } from './dto/update-sala.dto';

@Injectable()
export class SalasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalaDto) {
    // @@unique([clinicaId, nome]) no schema vale pro registro inteiro, mesmo
    // inativo — criar de novo com o mesmo nome de uma sala desativada colidiria
    // com a constraint. Reativa em vez de deixar estourar erro de unicidade.
    const existente = await this.prisma.sala.findUnique({
      where: { clinicaId_nome: { clinicaId: dto.clinicaId, nome: dto.nome } },
    });
    if (existente) {
      if (existente.ativa) {
        throw new ConflictException(`Já existe uma sala ativa com o nome "${dto.nome}" nesta clínica`);
      }
      return this.prisma.sala.update({
        where: { id: existente.id },
        data: { ativa: true, descricao: dto.descricao },
      });
    }

    return this.prisma.sala.create({ data: dto });
  }

  findAll(clinicaId: string) {
    return this.prisma.sala.findMany({
      where: { clinicaId, ativa: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const sala = await this.prisma.sala.findUnique({ where: { id } });
    if (!sala) {
      throw new NotFoundException(`Sala ${id} não encontrada`);
    }
    return sala;
  }

  async update(id: string, dto: UpdateSalaDto) {
    const sala = await this.findOne(id);

    if (dto.nome && dto.nome !== sala.nome) {
      const conflito = await this.prisma.sala.findUnique({
        where: { clinicaId_nome: { clinicaId: sala.clinicaId, nome: dto.nome } },
      });
      if (conflito) {
        throw new ConflictException(`Já existe uma sala com o nome "${dto.nome}" nesta clínica`);
      }
    }

    return this.prisma.sala.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: Consulta.salaId referencia esse registro — apagar de verdade
    // quebraria o histórico de consultas antigas marcadas nessa sala.
    return this.prisma.sala.update({ where: { id }, data: { ativa: false } });
  }
}
