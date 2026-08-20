import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ClinicasService } from './clinicas.service';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { UpdateClinicaDto } from './dto/update-clinica.dto';

@Controller('clinicas')
export class ClinicasController {
  constructor(private readonly clinicasService: ClinicasService) {}

  @Post()
  create(@Body() dto: CreateClinicaDto) {
    return this.clinicasService.create(dto);
  }

  @Get()
  findAll() {
    return this.clinicasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClinicaDto) {
    return this.clinicasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clinicasService.remove(id);
  }
}
