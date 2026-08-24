import { Module } from '@nestjs/common';
import { TiposConsultaService } from './tipos-consulta.service';
import { TiposConsultaController } from './tipos-consulta.controller';

@Module({
  controllers: [TiposConsultaController],
  providers: [TiposConsultaService],
  exports: [TiposConsultaService],
})
export class TiposConsultaModule {}
