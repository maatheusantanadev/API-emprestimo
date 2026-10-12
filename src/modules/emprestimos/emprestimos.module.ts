import { Module } from '@nestjs/common';
import { KeyedMutex } from '../../common/concurrency/keyed-mutex';
import { AutorizacoesModule } from '../autorizacoes/autorizacoes.module';
import { EConsignadoModule } from '../e-consignado/e-consignado.module';
import { FuncionariosModule } from '../funcionarios/funcionarios.module';
import { MargemModule } from '../margem/margem.module';
import { EmprestimosPersistenceModule } from './emprestimos-persistence.module';
import { EmprestimosService } from './services/emprestimos.service';
import { SimulacaoService } from './services/simulacao.service';
import { EmprestimosController } from './controllers/emprestimos.controller';

@Module({
  imports: [
    EmprestimosPersistenceModule,
    FuncionariosModule,
    AutorizacoesModule,
    EConsignadoModule,
    MargemModule,
  ],
  controllers: [EmprestimosController],
  providers: [EmprestimosService, SimulacaoService, KeyedMutex],
})
export class EmprestimosModule {}
