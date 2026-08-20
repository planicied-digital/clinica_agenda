import { IsOptional, IsString } from 'class-validator';

export class ListPacientesQueryDto {
  @IsString()
  clinicaId: string;

  @IsOptional()
  @IsString()
  busca?: string;
}
