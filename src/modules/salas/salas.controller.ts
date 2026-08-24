import { Controller, Get, Query } from '@nestjs/common';
import { SalasService } from './salas.service';
import { ListSalasQueryDto } from './dto/list-salas-query.dto';

@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Get()
  findAll(@Query() query: ListSalasQueryDto) {
    return this.salasService.findAll(query.clinicaId);
  }
}
