import { addMonthsToIsoDate } from '../../../common/utils/dates';
import { roundMoney } from '../../../common/utils/money';
import { ParcelaEmprestimo } from '../entities/emprestimo.entity';

export const MIN_PARCELAS = 1;
export const MAX_PARCELAS = 4;
export const OPCOES_PARCELAMENTO: readonly number[] = [1, 2, 3, 4];

/** Sem juros: valor ÷ parcelas, arredondado a 2 casas (sem ajuste na última parcela). */
export function calcularValorParcela(valorSolicitado: number, numeroParcelas: number): number {
  return roundMoney(valorSolicitado / numeroParcelas);
}

/** A parcela N vence N meses após a data de solicitação (semântica do addMonths). */
export function gerarParcelas(
  valorSolicitado: number,
  numeroParcelas: number,
  dataSolicitacao: Date,
): ParcelaEmprestimo[] {
  const valor = calcularValorParcela(valorSolicitado, numeroParcelas);
  return Array.from({ length: numeroParcelas }, (_, index) => ({
    numero: index + 1,
    valor,
    dataVencimento: addMonthsToIsoDate(dataSolicitacao, index + 1),
  }));
}
