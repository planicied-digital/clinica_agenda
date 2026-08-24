import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TiposConsultaService } from './tipos-consulta.service';
import { CreateTipoConsultaDto } from './dto/create-tipo-consulta.dto';
import { UpdateTipoConsultaDto } from './dto/update-tipo-consulta.dto';
import { ListTiposConsultaQueryDto } from './dto/list-tipos-consulta-query.dto';

@Controller('tipos-consulta')
export class TiposConsultaController {
  constructor(private readonly tiposConsultaService: TiposConsultaService) {}

  @Post()
  create(@Body() dto: CreateTipoConsultaDto) {
    return this.tiposConsultaService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListTiposConsultaQueryDto) {
    return this.tiposConsultaService.findAll(query.clinicaId, query.medicoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiposConsultaService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTipoConsultaDto) {
    return this.tiposConsultaService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tiposConsultaService.remove(id);
  }
}
