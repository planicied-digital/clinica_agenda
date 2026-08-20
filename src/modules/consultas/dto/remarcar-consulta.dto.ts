import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RemarcarConsultaDto {
  @IsDateString()
  novaDataHoraInicio: string;

  // Opcional: se omitido, mantém a mesma duração da consulta original.
  @IsOptional()
  @IsDateString()
  novaDataHoraFim?: string;

  @IsOptional()
  @IsString()
  salaId?: string;
}
