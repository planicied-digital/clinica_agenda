import { PapelUsuario } from '@prisma/client';

// Conteúdo assinado no JWT (ver AuthService.login). Carrega papel/clinicaId
// direto no token para que os guards não precisem consultar o banco a cada
// request — só o login e a troca de senha invalidam um token já emitido
// (via expiração; não há revogação ativa no MVP).
export interface JwtPayload {
  sub: string;
  email: string;
  papel: PapelUsuario;
  clinicaId: string;
  medicoId: string | null;
}
