import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { UpdateMedicoDto } from './dto/update-medico.dto';
import { ListMedicosQueryDto } from './dto/list-medicos-query.dto';

@Controller('medicos')
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

  @Post()
  create(@Body() dto: CreateMedicoDto) {
    return this.medicosService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListMedicosQueryDto) {
    const ativo = query.ativo === undefined ? undefined : query.ativo === 'true';
    return this.medicosService.findAll(query.clinicaId, ativo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMedicoDto) {
    return this.medicosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicosService.remove(id);
  }
}
