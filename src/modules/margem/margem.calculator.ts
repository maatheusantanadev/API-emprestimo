import { fromCents, toCents } from '../../common/utils/money';

/** 35% do salário pode ser comprometido com parcelas de consignado. */
export const PERCENTUAL_MARGEM_CONSIGNAVEL = 35;

export interface Margem {
  salario: number;
  margemTotal: number;
  margemUtilizada: number;
  margemDisponivel: number;
}

/**
 * margemTotal       = 35% do salário
 * margemUtilizada   = soma das parcelas mensais dos empréstimos "aprovado"
 * margemDisponivel  = margemTotal − margemUtilizada
 *
 * Cálculo feito em centavos (inteiros) para não acumular erro de ponto flutuante.
 */
export function calcularMargem(salario: number, somaParcelasAtivas: number): Margem {
  const totalCents = Math.round((toCents(salario) * PERCENTUAL_MARGEM_CONSIGNAVEL) / 100);
  const utilizadaCents = toCents(somaParcelasAtivas);

  return {
    salario,
    margemTotal: fromCents(totalCents),
    margemUtilizada: fromCents(utilizadaCents),
    margemDisponivel: fromCents(totalCents - utilizadaCents),
  };
}

export function cabeNaMargem(valorSolicitado: number, margemDisponivel: number): boolean {
  return toCents(valorSolicitado) <= toCents(margemDisponivel);
}
