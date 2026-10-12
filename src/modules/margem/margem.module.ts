import { Module } from '@nestjs/common';
import { AutorizacoesModule } from '../autorizacoes/autorizacoes.module';
import { EConsignadoModule } from '../e-consignado/e-consignado.module';
import { EmprestimosPersistenceModule } from '../emprestimos/emprestimos-persistence.module';
import { FuncionariosModule } from '../funcionarios/funcionarios.module';
import { MargemService } from './services/margem.service';
import { MargemController } from './controllers/margem.controller';

@Module({
  imports: [FuncionariosModule, AutorizacoesModule, EConsignadoModule, EmprestimosPersistenceModule],
  controllers: [MargemController],
  providers: [MargemService],
  exports: [MargemService],
})
export class MargemModule {}
