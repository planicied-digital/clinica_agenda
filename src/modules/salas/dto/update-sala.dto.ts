import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSalaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
