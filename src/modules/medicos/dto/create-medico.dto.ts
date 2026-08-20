import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMedicoDto {
  @IsString()
  clinicaId: string;

  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  especialidade: string;

  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
