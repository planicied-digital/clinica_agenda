import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { ClinicasModule } from './modules/clinicas/clinicas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { MedicosModule } from './modules/medicos/medicos.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { TiposConsultaModule } from './modules/tipos-consulta/tipos-consulta.module';
import { SalasModule } from './modules/salas/salas.module';
import { HorariosAtendimentoModule } from './modules/horarios-atendimento/horarios-atendimento.module';
import { BloqueiosModule } from './modules/bloqueios/bloqueios.module';
import { ConsultasModule } from './modules/consultas/consultas.module';
import { FilaEsperaModule } from './modules/fila-espera/fila-espera.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { WhatsappWebhookModule } from './modules/whatsapp/webhook/whatsapp-webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrismaModule,
    JobsModule,
    AuthModule,
    ClinicasModule,
    UsuariosModule,
    MedicosModule,
    PacientesModule,
    TiposConsultaModule,
    SalasModule,
    HorariosAtendimentoModule,
    BloqueiosModule,
    ConsultasModule,
    FilaEsperaModule,
    NotificacoesModule,
    WhatsappModule,
    WhatsappWebhookModule,
  ],
  providers: [
    // Ordem importa: JwtAuthGuard roda antes e popula request.user; RolesGuard
    // depende disso. Todas as rotas exigem JWT por padrão (ver @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
