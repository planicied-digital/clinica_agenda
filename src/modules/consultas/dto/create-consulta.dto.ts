import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrigemConsulta } from '@prisma/client';

export class CreateConsultaDto {
  @IsString()
  clinicaId: string;

  @IsString()
  medicoId: string;

  @IsString()
  pacienteId: string;

  @IsOptional()
  @IsString()
  tipoConsultaId?: string;

  @IsOptional()
  @IsString()
  salaId?: string;

  @IsDateString()
  dataHoraInicio: string;

  // Opcional: se omitido, calculado a partir da duração do tipoConsultaId.
  @IsOptional()
  @IsDateString()
  dataHoraFim?: string;

  @IsEnum(OrigemConsulta)
  origem: OrigemConsulta;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
