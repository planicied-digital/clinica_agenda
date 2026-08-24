import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PapelUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  clinicaId: string;

  @IsString()
  @MinLength(2)
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  @IsEnum(PapelUsuario)
  papel: PapelUsuario;

  // Só faz sentido quando papel = MEDICO (vincula o login ao registro de Medico).
  @IsOptional()
  @IsString()
  medicoId?: string;
}
