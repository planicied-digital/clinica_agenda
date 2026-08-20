import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LembretesProcessor } from './lembretes/lembretes.processor';
import { FilaEsperaProcessor } from './fila-espera/fila-espera.processor';

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
  ],
  providers: [LembretesProcessor, FilaEsperaProcessor],
  exports: [BullModule],
})
export class JobsModule {}
