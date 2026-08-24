import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusConsulta } from '@prisma/client';

export class ListConsultasQueryDto {
  @IsString()
  clinicaId: string;

  @IsOptional()
  @IsString()
  medicoId?: string;

  @IsOptional()
  @IsString()
  salaId?: string;

  @IsOptional()
  @IsString()
  pacienteId?: string;

  // Filtra por um único dia (YYYY-MM-DD). Tem prioridade sobre dataInicio/dataFim.
  @IsOptional()
  @IsDateString()
  data?: string;

  // Intervalo de dias (YYYY-MM-DD, inclusive) — usado pela agenda semanal e por
  // relatórios (ex.: taxa de comparecimento) que precisam de uma janela maior
  // que um único dia. Qualquer um dos dois pode ser omitido para um intervalo aberto.
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsEnum(StatusConsulta)
  status?: StatusConsulta;
}
