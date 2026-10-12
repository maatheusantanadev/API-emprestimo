import { Inject, Injectable } from '@nestjs/common';
import { AutorizacoesService } from '../../autorizacoes/services/autorizacoes.service';
import { EConsignadoService } from '../../e-consignado/services/e-consignado.service';
import {
  EMPRESTIMOS_REPOSITORY,
  EmprestimosRepository,
} from '../../emprestimos/repositories/emprestimos.repository';
import { Funcionario } from '../../funcionarios/entities/funcionario.entity';
import { FuncionariosService } from '../../funcionarios/services/funcionarios.service';
import { Margem, calcularMargem } from '../margem.calculator';

export interface MargemFuncionario extends Margem {
  funcionarioId: string;
}

@Injectable()
export class MargemService {
  constructor(
    @Inject(EMPRESTIMOS_REPOSITORY)
    private readonly emprestimos: Pick<EmprestimosRepository, 'resumoAtivos'>,
    private readonly funcionarios: FuncionariosService,
    private readonly autorizacoes: AutorizacoesService,
    private readonly eConsignado: EConsignadoService,
  ) {}

  /**
   * GET /funcionarios/:id/margem
   * 404 funcionário -> 403 autorização -> 422/502 Dataprev -> cálculo local.
   */
  async consultar(funcionarioId: string): Promise<MargemFuncionario> {
    const funcionario = await this.funcionarios.buscarComEmpresaOuFalhar(funcionarioId);
    await this.autorizacoes.exigirAutorizacaoAtiva(funcionario.id);
    await this.eConsignado.garantirEmpresaHabilitada(funcionario.empresaCnpj);

    return { funcionarioId: funcionario.id, ...(await this.calcular(funcionario)) };
  }

  /** Cálculo local (sem Dataprev), também usado pela simulação. */
  async calcular(funcionario: Funcionario): Promise<Margem> {
    const { somaParcelasMensais } = await this.emprestimos.resumoAtivos(funcionario.id);
    return calcularMargem(funcionario.salario, somaParcelasMensais);
  }
}
