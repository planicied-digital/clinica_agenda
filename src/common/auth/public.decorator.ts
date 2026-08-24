import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca uma rota como isenta do JwtAuthGuard global (ex.: login, webhook do
// WhatsApp). O padrão do resto da aplicação é "fecha por padrão" — só fica
// pública a rota explicitamente marcada.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
