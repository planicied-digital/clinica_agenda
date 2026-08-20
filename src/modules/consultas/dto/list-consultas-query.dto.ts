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

  // Filtra por um único dia (YYYY-MM-DD).
  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsEnum(StatusConsulta)
  status?: StatusConsulta;
}
