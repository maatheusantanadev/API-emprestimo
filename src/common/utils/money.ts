import { Prisma } from '@prisma/client';

/** Arredonda para 2 casas decimais (centavos), evitando erros de ponto flutuante. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Converte o Decimal do Prisma (NUMERIC no Postgres) para number na borda da persistência. */
export function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

/** Valor monetário com exatamente 2 casas para gravação em coluna NUMERIC(12,2). */
export function toDecimalString(value: number): string {
  return roundMoney(value).toFixed(2);
}
