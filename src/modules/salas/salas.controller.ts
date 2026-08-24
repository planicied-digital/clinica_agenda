import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaDto } from './dto/update-sala.dto';
import { ListSalasQueryDto } from './dto/list-salas-query.dto';

@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Post()
  create(@Body() dto: CreateSalaDto) {
    return this.salasService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListSalasQueryDto) {
    return this.salasService.findAll(query.clinicaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalaDto) {
    return this.salasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salasService.remove(id);
  }
}
