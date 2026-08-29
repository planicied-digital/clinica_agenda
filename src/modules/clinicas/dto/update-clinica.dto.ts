import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  // Ver mesmo comentário em CreateClinicaDto — campo não lido por nenhum
  // serviço; o fuso efetivo é o TZ do processo (Dockerfile), global pra todas
  // as clínicas.
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

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
