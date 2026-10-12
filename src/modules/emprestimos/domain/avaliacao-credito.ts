import { cabeNaMargem } from '../../margem/margem.calculator';
import { scoreSuficiente } from './score-policy';

export const LIMITE_EMPRESTIMOS_ATIVOS = 3;

export const MOTIVOS_REJEICAO = {
  SCORE_INSUFICIENTE: 'Score insuficiente para a faixa salarial',
  MARGEM_INSUFICIENTE: 'Valor solicitado excede a margem consignável disponível',
  LIMITE_ATIVOS: `Limite de ${LIMITE_EMPRESTIMOS_ATIVOS} empréstimos ativos atingido`,
  PAGAMENTO_RECUSADO: 'Pagamento recusado pelo gateway',
} as const;

export interface DadosAvaliacaoCredito {
  salario: number;
  score: number;
  valorSolicitado: number;
  margemDisponivel: number;
  quantidadeEmprestimosAtivos: number;
}

export type ResultadoAvaliacao = { aprovado: true } | { aprovado: false; motivo: string };

/** Regras de crédito na ordem do contrato: score -> margem -> limite de ativos. */
export function avaliarCredito(dados: DadosAvaliacaoCredito): ResultadoAvaliacao {
  if (!scoreSuficiente(dados.score, dados.salario)) {
    return { aprovado: false, motivo: MOTIVOS_REJEICAO.SCORE_INSUFICIENTE };
  }
  if (!cabeNaMargem(dados.valorSolicitado, dados.margemDisponivel)) {
    return { aprovado: false, motivo: MOTIVOS_REJEICAO.MARGEM_INSUFICIENTE };
  }
  if (dados.quantidadeEmprestimosAtivos >= LIMITE_EMPRESTIMOS_ATIVOS) {
    return { aprovado: false, motivo: MOTIVOS_REJEICAO.LIMITE_ATIVOS };
  }
  return { aprovado: true };
}
