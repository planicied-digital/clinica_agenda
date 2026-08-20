import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { ListPacientesQueryDto } from './dto/list-pacientes-query.dto';
import { BuscarPacienteQueryDto } from './dto/buscar-paciente-query.dto';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Post()
  create(@Body() dto: CreatePacienteDto) {
    return this.pacientesService.create(dto);
  }

  // Precisa vir antes de ':id' para não ser capturado como parâmetro de rota.
  @Get('buscar')
  buscar(@Query() query: BuscarPacienteQueryDto) {
    return this.pacientesService.buscarPorContato(query.clinicaId, query.telefone, query.cpf);
  }

  @Get()
  findAll(@Query() query: ListPacientesQueryDto) {
    return this.pacientesService.findAll(query.clinicaId, query.busca);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacientesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePacienteDto) {
    return this.pacientesService.update(id, dto);
  }
}
