import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HorariosAtendimentoService } from './horarios-atendimento.service';
import { CreateHorarioAtendimentoDto } from './dto/create-horario-atendimento.dto';
import { UpdateHorarioAtendimentoDto } from './dto/update-horario-atendimento.dto';
import { ListHorariosAtendimentoQueryDto } from './dto/list-horarios-atendimento-query.dto';

@Controller('horarios-atendimento')
export class HorariosAtendimentoController {
  constructor(private readonly horariosAtendimentoService: HorariosAtendimentoService) {}

  @Post()
  create(@Body() dto: CreateHorarioAtendimentoDto) {
    return this.horariosAtendimentoService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListHorariosAtendimentoQueryDto) {
    return this.horariosAtendimentoService.findAll(query.clinicaId, query.medicoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.horariosAtendimentoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHorarioAtendimentoDto) {
    return this.horariosAtendimentoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horariosAtendimentoService.remove(id);
  }
}
