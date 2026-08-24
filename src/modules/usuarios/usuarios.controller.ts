import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

// Gestão de logins é sensível (papel, vínculo com médico) — restrita a ADMIN.
@Controller('usuarios')
@Roles(PapelUsuario.ADMIN)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  findAll(@Query('clinicaId') clinicaId?: string) {
    return this.usuariosService.findAll(clinicaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
