import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class ListMedicosQueryDto {
  @IsString()
  clinicaId: string;

  @IsOptional()
  @IsBooleanString()
  ativo?: string;
}
