import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

// Processa o timeout de ofertas da fila de espera (seção 6): se o paciente
// notificado não responder a tempo, expira a oferta e notifica o próximo.
@Processor('fila-espera')
export class FilaEsperaProcessor extends WorkerHost {
  private readonly logger = new Logger(FilaEsperaProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Job "${job.name}" (id=${job.id}) recebido — processamento ainda não implementado`);
  }
}
