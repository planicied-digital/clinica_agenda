import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const JWT_SECRET_PLACEHOLDER = 'troque-este-valor-em-producao';
const JWT_SECRET_MIN_LENGTH = 32;

// Falha o boot em produção se segredos ainda estiverem com valor de
// desenvolvimento — em dev/test esses valores vazios/placeholder são
// tolerados (ver validation.schema.ts), mas subir assim pra produção deixaria
// o JWT forjável e o webhook do WhatsApp aceitando eventos não autenticados.
export function assertProductionConfig(config: ConfigService): void {
  if (config.get<string>('nodeEnv') !== 'production') {
    return;
  }

  const logger = new Logger('ProductionConfig');
  const erros: string[] = [];

  const jwtSecret = config.get<string>('jwt.secret');
  if (!jwtSecret || jwtSecret === JWT_SECRET_PLACEHOLDER || jwtSecret.length < JWT_SECRET_MIN_LENGTH) {
    erros.push(`JWT_SECRET precisa ser um valor único com pelo menos ${JWT_SECRET_MIN_LENGTH} caracteres (gere com: openssl rand -base64 48)`);
  }

  if (!config.get<string>('whatsapp.appSecret')) {
    erros.push('WHATSAPP_APP_SECRET é obrigatório em produção (valida a assinatura do webhook — App settings > Basic, na Meta)');
  }
  if (!config.get<string>('whatsapp.webhookVerifyToken')) {
    erros.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN é obrigatório em produção');
  }
  if (!config.get<string>('whatsapp.accessToken')) {
    erros.push('WHATSAPP_ACCESS_TOKEN é obrigatório em produção');
  }
  if (!config.get<string>('whatsapp.phoneNumberId')) {
    erros.push('WHATSAPP_PHONE_NUMBER_ID é obrigatório em produção');
  }

  if (erros.length > 0) {
    for (const erro of erros) {
      logger.error(erro);
    }
    throw new Error(`Configuração insegura para produção (${erros.length} problema(s) acima) — corrija o .env antes de subir.`);
  }
}
