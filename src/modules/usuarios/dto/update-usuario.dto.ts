import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PapelUsuario } from '@prisma/client';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Troca de senha: se omitido, a senha atual é mantida.
  @IsOptional()
  @IsString()
  @MinLength(8)
  senha?: string;

  @IsOptional()
  @IsEnum(PapelUsuario)
  papel?: PapelUsuario;

  @IsOptional()
  @IsString()
  medicoId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
