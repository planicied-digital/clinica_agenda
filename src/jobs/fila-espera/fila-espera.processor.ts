import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FilaEsperaService } from '../../modules/fila-espera/fila-espera.service';

interface ExpirarOfertaJobData {
  filaEsperaId: string;
}

// Processa o timeout de ofertas da fila de espera (seção 6): se o paciente
// notificado não responder a tempo, expira a oferta e repassa ao próximo —
// a lógica de repasse fica em FilaEsperaService, que também reagenda a
// próxima expiração.
@Processor('fila-espera')
export class FilaEsperaProcessor extends WorkerHost {
  private readonly logger = new Logger(FilaEsperaProcessor.name);

  constructor(private readonly filaEsperaService: FilaEsperaService) {
    super();
  }

  async process(job: Job<ExpirarOfertaJobData>): Promise<void> {
    if (job.name !== 'expirar-oferta') {
      this.logger.warn(`Job "${job.name}" desconhecido na fila de espera`);
      return;
    }
    await this.filaEsperaService.processarExpiracao(job.data.filaEsperaId);
  }
}
