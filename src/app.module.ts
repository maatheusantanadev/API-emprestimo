import { Module } from '@nestjs/common';
import { ClockModule } from './common/clock/clock';
import { SecurityModule } from './common/security/password-hasher';
import { AppConfigModule } from './config/app-config.module';
import { HealthController } from './health/health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { AutorizacoesModule } from './modules/autorizacoes/autorizacoes.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { EmprestimosModule } from './modules/emprestimos/emprestimos.module';
import { FuncionariosModule } from './modules/funcionarios/funcionarios.module';
import { MargemModule } from './modules/margem/margem.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Mapa de rotas (cada módulo é dono das rotas do seu recurso):
 *
 *   POST /empresas                                -> EmpresasController.criar          (201)
 *   POST /funcionarios                            -> FuncionariosController.criar      (201)
 *   POST /funcionarios/:id/autorizacao-consulta   -> AutorizacoesController.autorizar  (200)
 *   GET  /funcionarios/:id/margem                 -> MargemController.consultar        (200)
 *   POST /emprestimos/simular                     -> EmprestimosController.simular     (200)
 *   POST /emprestimos                             -> EmprestimosController.solicitar   (201)
 *   GET  /emprestimos                             -> EmprestimosController.listar      (200)
 *   GET  /emprestimos/:id                         -> EmprestimosController.detalhar    (200)
 */
@Module({
  imports: [
    AppConfigModule,
    ClockModule,
    SecurityModule,
    PrismaModule,
    IntegrationsModule,
    EmpresasModule,
    FuncionariosModule,
    AutorizacoesModule,
    MargemModule,
    EmprestimosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
