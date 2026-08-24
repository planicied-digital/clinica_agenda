import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './jwt-payload';

// Extrai o usuário autenticado (payload do JWT) anexado pelo JwtAuthGuard.
export const UsuarioAtual = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
