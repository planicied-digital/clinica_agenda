import { DiaSemana } from '@prisma/client';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateHorarioAtendimentoDto {
  @IsString()
  clinicaId: string;

  @IsString()
  medicoId: string;

  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;

  // Minutos desde 00:00 (ex.: 480 = 08:00) — ver comentário no schema.
  @IsInt()
  @Min(0)
  @Max(1439)
  horaInicioMinutos: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  horaFimMinutos: number;
}
