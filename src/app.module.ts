import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrismaModule,
    JobsModule,
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
  ],
})
export class AppModule {}
