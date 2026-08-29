import { IsOptional, IsString } from 'class-validator';

export class ListHorariosAtendimentoQueryDto {
  @IsString()
  clinicaId: string;

  @IsOptional()
  @IsString()
  medicoId?: string;
}
