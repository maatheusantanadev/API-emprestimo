import { Emprestimo, StatusEmprestimo } from '../entities/emprestimo.entity';
import { SimulacaoEmprestimo } from '../services/simulacao.service';

/** Schema `ParcelaEmprestimo` do contrato. */
export interface ParcelaEmprestimoResponse {
  numero: number;
  valor: number;
  dataVencimento: string;
}

/** Schema `Emprestimo` do contrato (dados internos como gatewayTransacaoId não são expostos). */
export interface EmprestimoResponse {
  id: string;
  funcionarioId: string;
  valorSolicitado: number;
  numeroParcelas: number;
  valorParcela: number;
  status: StatusEmprestimo;
  motivoRejeicao: string | null;
  parcelas: ParcelaEmprestimoResponse[];
  createdAt: string;
}

/** Schema `ListaEmprestimos` do contrato. */
export interface ListaEmprestimosResponse {
  data: EmprestimoResponse[];
}

/** Schema `SimulacaoEmprestimo` do contrato. */
export type SimulacaoEmprestimoResponse = SimulacaoEmprestimo;

export function presentEmprestimo(emprestimo: Emprestimo): EmprestimoResponse {
  return {
    id: emprestimo.id,
    funcionarioId: emprestimo.funcionarioId,
    valorSolicitado: emprestimo.valorSolicitado,
    numeroParcelas: emprestimo.numeroParcelas,
    valorParcela: emprestimo.valorParcela,
    status: emprestimo.status,
    motivoRejeicao: emprestimo.motivoRejeicao,
    parcelas: emprestimo.parcelas.map((parcela) => ({
      numero: parcela.numero,
      valor: parcela.valor,
      dataVencimento: parcela.dataVencimento,
    })),
    createdAt: emprestimo.createdAt.toISOString(),
  };
}

export function presentListaEmprestimos(emprestimos: Emprestimo[]): ListaEmprestimosResponse {
  return { data: emprestimos.map(presentEmprestimo) };
}

export function presentSimulacao(simulacao: SimulacaoEmprestimo): SimulacaoEmprestimoResponse {
  return {
    funcionarioId: simulacao.funcionarioId,
    valorSolicitado: simulacao.valorSolicitado,
    margemDisponivel: simulacao.margemDisponivel,
    parcelas: simulacao.parcelas.map(({ numeroParcelas, valorParcela }) => ({
      numeroParcelas,
      valorParcela,
    })),
  };
}
