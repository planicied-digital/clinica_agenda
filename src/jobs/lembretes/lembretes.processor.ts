import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

// Processa a régua de lembretes da seção 6 do briefing (48h/2h antes,
// escalonamento por não resposta). Disparo real via módulo whatsapp
// entra no próximo passo (integração com a Cloud API/BSP).
@Processor('lembretes')
export class LembretesProcessor extends WorkerHost {
  private readonly logger = new Logger(LembretesProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Job "${job.name}" (id=${job.id}) recebido — processamento ainda não implementado`);
  }
}
