import { IsOptional, IsString } from 'class-validator';

export class CancelarConsultaDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
