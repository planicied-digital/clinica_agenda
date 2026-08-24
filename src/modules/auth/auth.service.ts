import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { JwtPayload } from '../../common/auth/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.usuariosService.findByEmailComSenha(email);
    // Mesma mensagem para e-mail inexistente e senha errada — evita
    // confirmar a um atacante se o e-mail existe na base.
    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      clinicaId: usuario.clinicaId,
      medicoId: usuario.medicoId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        clinicaId: usuario.clinicaId,
        medicoId: usuario.medicoId,
      },
    };
  }
}
