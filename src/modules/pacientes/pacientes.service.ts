import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizarTelefone } from '../../common/utils/telefone.util';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

// Nomes amigáveis pros campos que têm constraint única (clinicaId, <campo>)
// em Paciente — usado pra traduzir o P2002 do Prisma numa mensagem que a
// secretária entende, em vez do 500 cru que subia antes.
const CAMPO_UNICO_LABEL: Record<string, string> = {
  telefone: 'telefone',
  cpf: 'CPF',
};

@Injectable()
export class PacientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePacienteDto) {
    await this.assertClinicaExists(dto.clinicaId);
    try {
      return await this.prisma.paciente.create({
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
    } catch (erro) {
      throw this.paraConflitoDeUnicidade(erro);
    }
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

  // Traduz P2002 (constraint única "clinicaId_<campo>") num 409 com mensagem
  // amigável, em vez de deixar o PrismaClientKnownRequestError subir cru e
  // virar um 500 genérico pro front-end (era o que acontecia antes).
  private paraConflitoDeUnicidade(erro: unknown): unknown {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      const campos = (erro.meta?.target as string[] | undefined) ?? [];
      const campoConhecido = campos.find((c) => c in CAMPO_UNICO_LABEL);
      if (campoConhecido) {
        const label = CAMPO_UNICO_LABEL[campoConhecido];
        return new ConflictException(
          `Já existe um paciente cadastrado com esse ${label} nesta clínica — busque por ${label} antes de cadastrar um novo.`,
        );
      }
    }
    return erro;
  }

  private async assertClinicaExists(clinicaId: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) {
      throw new NotFoundException(`Clínica ${clinicaId} não encontrada`);
    }
  }
}
