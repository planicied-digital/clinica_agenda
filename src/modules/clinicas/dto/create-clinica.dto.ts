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

  // Aceito e persistido, mas hoje não lida por nenhum serviço — o fuso
  // efetivo de toda a aplicação é o TZ do processo (env var no Dockerfile,
  // atualmente America/Manaus), igual para todas as clínicas. Se este campo
  // divergir do TZ real do container, os cálculos de disponibilidade/lembrete
  // dessa clínica ficam incorretos silenciosamente. Ver ConsultasService.disponibilidade.
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
