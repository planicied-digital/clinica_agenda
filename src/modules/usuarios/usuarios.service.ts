import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const SALT_ROUNDS = 10;

// Nunca deixar o hash da senha sair do módulo, nem em respostas de API nem em logs.
export type UsuarioSemSenha = Omit<Usuario, 'senhaHash'>;

function semSenha(usuario: Usuario): UsuarioSemSenha {
  const { senhaHash: _senhaHash, ...resto } = usuario;
  return resto;
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto): Promise<UsuarioSemSenha> {
    const existente = await this.prisma.usuario.findUnique({
      where: { clinicaId_email: { clinicaId: dto.clinicaId, email: dto.email } },
    });
    if (existente) {
      throw new ConflictException(`Já existe um usuário com o e-mail ${dto.email} nesta clínica`);
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    const usuario = await this.prisma.usuario.create({
      data: {
        clinicaId: dto.clinicaId,
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        papel: dto.papel,
        medicoId: dto.medicoId,
      },
    });
    return semSenha(usuario);
  }

  async findAll(clinicaId?: string): Promise<UsuarioSemSenha[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { ativo: true, clinicaId },
      orderBy: { nome: 'asc' },
    });
    return usuarios.map(semSenha);
  }

  async findOne(id: string): Promise<UsuarioSemSenha> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return semSenha(usuario);
  }

  // Usado pelo AuthService para validar login — só aqui o senhaHash sai do módulo.
  // Email é único por clínica (schema), não globalmente; no MVP (uma clínica por
  // deploy) buscar pelo primeiro ativo com esse e-mail é suficiente.
  findByEmailComSenha(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findFirst({ where: { email, ativo: true } });
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<UsuarioSemSenha> {
    await this.findOne(id);
    const senhaHash = dto.senha ? await bcrypt.hash(dto.senha, SALT_ROUNDS) : undefined;
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        nome: dto.nome,
        email: dto.email,
        papel: dto.papel,
        medicoId: dto.medicoId,
        ativo: dto.ativo,
        senhaHash,
      },
    });
    return semSenha(usuario);
  }

  async remove(id: string): Promise<UsuarioSemSenha> {
    await this.findOne(id);
    // Soft delete: preserva trilha de auditoria (seção 8) e evita quebrar
    // referências históricas (notificações, consultas registradas por esse usuário).
    const usuario = await this.prisma.usuario.update({ where: { id }, data: { ativo: false } });
    return semSenha(usuario);
  }
}
