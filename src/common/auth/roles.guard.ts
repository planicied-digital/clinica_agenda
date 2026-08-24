import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { JwtPayload } from './jwt-payload';

// Roda depois do JwtAuthGuard (registrado em seguida em AppModule) — assume
// que request.user já foi populado pela estratégia JWT.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const papeisPermitidos = this.reflector.getAllAndOverride<PapelUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!papeisPermitidos || papeisPermitidos.length === 0) {
      return true;
    }

    const usuario: JwtPayload | undefined = context.switchToHttp().getRequest().user;
    if (!usuario || !papeisPermitidos.includes(usuario.papel)) {
      throw new ForbiddenException('Papel do usuário não tem permissão para este recurso');
    }
    return true;
  }
}
