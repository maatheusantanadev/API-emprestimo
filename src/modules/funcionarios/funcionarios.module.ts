import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { IdentificadoresModule } from '../identificadores/identificadores.module';
import { FuncionariosService } from './services/funcionarios.service';
import { FUNCIONARIOS_REPOSITORY } from './repositories/funcionarios.repository';
import { PrismaFuncionariosRepository } from './repositories/prisma-funcionarios.repository';
import { FuncionariosController } from './controllers/funcionarios.controller';

@Module({
  imports: [EmpresasModule, IdentificadoresModule],
  controllers: [FuncionariosController],
  providers: [
    FuncionariosService,
    { provide: FUNCIONARIOS_REPOSITORY, useClass: PrismaFuncionariosRepository },
  ],
  exports: [FuncionariosService],
})
export class FuncionariosModule {}
