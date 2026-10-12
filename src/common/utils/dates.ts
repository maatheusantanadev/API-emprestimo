import { addMonths } from 'date-fns';

/** Data de calendário no formato do contrato: YYYY-MM-DD. */
export type IsoDate = string;

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Soma `months` meses ao DIA (em UTC) do instante informado, com a semântica do
 * addMonths do date-fns: se o dia não existir no mês alvo, usa o último dia do mês
 * (ex.: 31/01 + 1 mês = 28/02).
 *
 * O dia de referência é extraído em UTC — o mesmo dia exibido no `createdAt` da API —
 * e o cálculo é feito sobre uma data "local" sem horário, tornando o resultado
 * independente do fuso horário do servidor.
 */
export function addMonthsToIsoDate(instant: Date, months: number): IsoDate {
  const base = new Date(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate());
  const result = addMonths(base, months);
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`;
}

/** Coluna DATE do Postgres <-> IsoDate (o Prisma representa DATE como meia-noite UTC). */
export function isoDateToDbDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function dbDateToIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}
