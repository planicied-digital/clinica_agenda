import { SetMetadata } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Sem @Roles(...), qualquer usuário autenticado (independente do papel) acessa
// a rota — restrição por papel é opt-in, aplicada nos endpoints sensíveis.
export const Roles = (...papeis: PapelUsuario[]) => SetMetadata(ROLES_KEY, papeis);
