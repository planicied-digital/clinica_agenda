import { DiaSemana } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateHorarioAtendimentoDto {
  @IsOptional()
  @IsEnum(DiaSemana)
  diaSemana?: DiaSemana;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  horaInicioMinutos?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  horaFimMinutos?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
