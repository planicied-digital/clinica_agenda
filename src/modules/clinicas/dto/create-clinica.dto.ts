import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateClinicaDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reguaLembrete1Horas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reguaLembrete2Horas?: number;
}
