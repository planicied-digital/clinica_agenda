import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { ListConsultasQueryDto } from './dto/list-consultas-query.dto';
import { DisponibilidadeQueryDto } from './dto/disponibilidade-query.dto';
import { CancelarConsultaDto } from './dto/cancelar-consulta.dto';
import { RemarcarConsultaDto } from './dto/remarcar-consulta.dto';
import { RegistrarComparecimentoDto } from './dto/registrar-comparecimento.dto';
import { RegistrarRetornoDto } from './dto/registrar-retorno.dto';

@Controller('consultas')
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  // Precisa vir antes de ':id' para não ser capturado como parâmetro de rota.
  @Get('disponibilidade')
  disponibilidade(@Query() query: DisponibilidadeQueryDto) {
    return this.consultasService.disponibilidade(query);
  }

  @Post()
  create(@Body() dto: CreateConsultaDto) {
    return this.consultasService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListConsultasQueryDto) {
    return this.consultasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConsultaDto) {
    return this.consultasService.update(id, dto);
  }

  @Post(':id/confirmar')
  confirmar(@Param('id') id: string) {
    return this.consultasService.confirmar(id);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id') id: string, @Body() dto: CancelarConsultaDto) {
    return this.consultasService.cancelar(id, dto);
  }

  @Post(':id/remarcar')
  remarcar(@Param('id') id: string, @Body() dto: RemarcarConsultaDto) {
    return this.consultasService.remarcar(id, dto);
  }

  @Post(':id/registrar-comparecimento')
  registrarComparecimento(@Param('id') id: string, @Body() dto: RegistrarComparecimentoDto) {
    return this.consultasService.registrarComparecimento(id, dto);
  }

  @Post(':id/registrar-retorno')
  registrarRetorno(@Param('id') id: string, @Body() dto: RegistrarRetornoDto) {
    return this.consultasService.registrarRetorno(id, dto);
  }
}
