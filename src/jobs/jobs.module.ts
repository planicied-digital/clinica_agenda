import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LembretesProcessor } from './lembretes/lembretes.processor';
import { FilaEsperaProcessor } from './fila-espera/fila-espera.processor';
import { NotificacoesModule } from '../modules/notificacoes/notificacoes.module';
import { FilaEsperaModule } from '../modules/fila-espera/fila-espera.module';
import { WhatsappModule } from '../modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'lembretes' }, { name: 'fila-espera' }),
    NotificacoesModule,
    FilaEsperaModule,
    WhatsappModule,
  ],
  providers: [LembretesProcessor, FilaEsperaProcessor],
})
export class JobsModule {}
