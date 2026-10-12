import { Module } from '@nestjs/common';
import { IdentificadoresModule } from '../identificadores/identificadores.module';
import { EmpresasService } from './services/empresas.service';
import { EMPRESAS_REPOSITORY } from './repositories/empresas.repository';
import { PrismaEmpresasRepository } from './repositories/prisma-empresas.repository';
import { EmpresasController } from './controllers/empresas.controller';

@Module({
  imports: [IdentificadoresModule],
  controllers: [EmpresasController],
  providers: [EmpresasService, { provide: EMPRESAS_REPOSITORY, useClass: PrismaEmpresasRepository }],
  exports: [EmpresasService],
})
export class EmpresasModule {}
