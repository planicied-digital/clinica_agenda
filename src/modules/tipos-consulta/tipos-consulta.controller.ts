import { Controller, Get, Query } from '@nestjs/common';
import { TiposConsultaService } from './tipos-consulta.service';
import { ListTiposConsultaQueryDto } from './dto/list-tipos-consulta-query.dto';

@Controller('tipos-consulta')
export class TiposConsultaController {
  constructor(private readonly tiposConsultaService: TiposConsultaService) {}

  @Get()
  findAll(@Query() query: ListTiposConsultaQueryDto) {
    return this.tiposConsultaService.findAll(query.clinicaId, query.medicoId);
  }
}
