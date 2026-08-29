import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizarTelefone } from '../../common/utils/telefone.util';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Injectable()
export class PacientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePacienteDto) {
    await this.assertClinicaExists(dto.clinicaId);
    return this.prisma.paciente.create({
      data: {
        ...dto,
        telefone: normalizarTelefone(dto.telefone),
        // dataNascimento chega como "YYYY-MM-DD" (sem horário) — por spec do
        // ECMAScript, new Date() de uma string só-data é SEMPRE interpretada
        // como UTC, independente do TZ do processo. Isso é seguro enquanto o
        // valor só for guardado/reexibido cru (input type=date no front); se
        // algum dia for formatado com toLocaleDateString()/toLocaleString()
        // (que usam o TZ local, hoje America/Manaus), o dia pode "voltar" um
        // pra trás — formate em UTC (ex: .toISOString().slice(0,10)) nesse caso.
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      },
    });
  }

  findAll(clinicaId: string, busca?: string) {
    return this.prisma.paciente.findMany({
      where: {
        clinicaId,
        ...(busca
          ? {
              OR: [
                { nome: { contains: busca, mode: 'insensitive' as const } },
                { telefone: { contains: busca } },
                { cpf: { contains: busca } },
              ],
            }
          : {}),
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Reconhecimento automático por telefone/CPF (seção 5 — paciente antigo).
  buscarPorContato(clinicaId: string, telefone?: string, cpf?: string) {
    if (!telefone && !cpf) {
      return null;
    }
    return this.prisma.paciente.findFirst({
      where: {
        clinicaId,
        OR: [
          ...(telefone ? [{ telefone: normalizarTelefone(telefone) }] : []),
          ...(cpf ? [{ cpf }] : []),
        ],
      },
      include: { medicoHabitual: true },
    });
  }

  async findOne(id: string) {
    const paciente = await this.prisma.paciente.findUnique({ where: { id } });
    if (!paciente) {
      throw new NotFoundException(`Paciente ${id} não encontrado`);
    }
    return paciente;
  }

  async update(id: string, dto: UpdatePacienteDto) {
    await this.findOne(id);
    return this.prisma.paciente.update({
      where: { id },
      data: {
        ...dto,
        telefone: dto.telefone ? normalizarTelefone(dto.telefone) : undefined,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      },
    });
  }

  private async assertClinicaExists(clinicaId: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) {
      throw new NotFoundException(`Clínica ${clinicaId} não encontrada`);
    }
  }
}
