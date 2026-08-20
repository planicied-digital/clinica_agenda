import { Controller, Get, Query } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { ListNotificacoesQueryDto } from './dto/list-notificacoes-query.dto';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  findAll(@Query() query: ListNotificacoesQueryDto) {
    return this.notificacoesService.findAll(query);
  }
}
