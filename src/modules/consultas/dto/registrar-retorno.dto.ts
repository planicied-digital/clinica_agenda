import { IsInt, Min } from 'class-validator';

export class RegistrarRetornoDto {
  @IsInt()
  @Min(0)
  prazoDiasMin: number;

  @IsInt()
  @Min(0)
  prazoDiasMax: number;
}
