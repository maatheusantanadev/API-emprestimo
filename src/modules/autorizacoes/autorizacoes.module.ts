import { Module } from '@nestjs/common';
import { FuncionariosModule } from '../funcionarios/funcionarios.module';
import { AutorizacoesService } from './services/autorizacoes.service';
import { AUTORIZACOES_REPOSITORY } from './repositories/autorizacoes.repository';
import { PrismaAutorizacoesRepository } from './repositories/prisma-autorizacoes.repository';
import { AutorizacoesController } from './controllers/autorizacoes.controller';

@Module({
  imports: [FuncionariosModule],
  controllers: [AutorizacoesController],
  providers: [
    AutorizacoesService,
    { provide: AUTORIZACOES_REPOSITORY, useClass: PrismaAutorizacoesRepository },
  ],
  exports: [AutorizacoesService],
})
export class AutorizacoesModule {}
