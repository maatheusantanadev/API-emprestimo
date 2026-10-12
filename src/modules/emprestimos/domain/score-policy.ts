import { toCents } from '../../../common/utils/money';

interface FaixaSalarial {
  /** Limite superior inclusivo da faixa, em centavos. */
  ateCents: number;
  scoreMinimo: number;
}

const FAIXAS: readonly FaixaSalarial[] = [
  { ateCents: 2_000_00, scoreMinimo: 400 },
  { ateCents: 4_000_00, scoreMinimo: 500 },
  { ateCents: 8_000_00, scoreMinimo: 600 },
  { ateCents: 12_000_00, scoreMinimo: 700 },
  { ateCents: Number.POSITIVE_INFINITY, scoreMinimo: 800 },
];

export function scoreMinimoParaSalario(salario: number): number {
  const cents = toCents(salario);
  const faixa = FAIXAS.find((f) => cents <= f.ateCents) ?? FAIXAS[FAIXAS.length - 1];
  return faixa.scoreMinimo;
}

export function scoreSuficiente(score: number, salario: number): boolean {
  return score >= scoreMinimoParaSalario(salario);
}
