import { Injectable } from '@nestjs/common';
import { InvalidInputError } from '../../../common/errors/domain.errors';
import { AutorizacoesService } from '../../autorizacoes/services/autorizacoes.service';
import { FuncionariosService } from '../../funcionarios/services/funcionarios.service';
import { cabeNaMargem } from '../../margem/margem.calculator';
import { MargemService } from '../../margem/services/margem.service';
import { OPCOES_PARCELAMENTO, calcularValorParcela } from '../domain/parcelamento';

export interface SimularEmprestimoInput {
  funcionarioId: string;
  valorSolicitado: number;
}

export interface OpcaoParcelamento {
  numeroParcelas: number;
  valorParcela: number;
}

export interface SimulacaoEmprestimo {
  funcionarioId: string;
  valorSolicitado: number;
  margemDisponivel: number;
  parcelas: OpcaoParcelamento[];
}

@Injectable()
export class SimulacaoService {
  constructor(
    private readonly funcionarios: FuncionariosService,
    private readonly autorizacoes: AutorizacoesService,
    private readonly margem: MargemService,
  ) {}

  /**
   * POST /emprestimos/simular — não consulta o Dataprev (margem calculada localmente).
   * 404 funcionário -> 403 autorização -> 400 valor acima da margem.
   */
  async simular(input: SimularEmprestimoInput): Promise<SimulacaoEmprestimo> {
    const funcionario = await this.funcionarios.buscarOuFalhar(input.funcionarioId);
    await this.autorizacoes.exigirAutorizacaoAtiva(funcionario.id);

    const { margemDisponivel } = await this.margem.calcular(funcionario);
    if (!cabeNaMargem(input.valorSolicitado, margemDisponivel)) {
      throw new InvalidInputError('Valor solicitado excede a margem consignável disponível', {
        valorSolicitado: input.valorSolicitado,
        margemDisponivel,
      });
    }

    return {
      funcionarioId: funcionario.id,
      valorSolicitado: input.valorSolicitado,
      margemDisponivel,
      parcelas: OPCOES_PARCELAMENTO.map((numeroParcelas) => ({
        numeroParcelas,
        valorParcela: calcularValorParcela(input.valorSolicitado, numeroParcelas),
      })),
    };
  }
}
