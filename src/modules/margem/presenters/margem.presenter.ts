import { MargemFuncionario } from '../services/margem.service';

/** Schema `Margem` do contrato. */
export interface MargemResponse {
  funcionarioId: string;
  salario: number;
  margemTotal: number;
  margemUtilizada: number;
  margemDisponivel: number;
}

export function presentMargem(margem: MargemFuncionario): MargemResponse {
  return {
    funcionarioId: margem.funcionarioId,
    salario: margem.salario,
    margemTotal: margem.margemTotal,
    margemUtilizada: margem.margemUtilizada,
    margemDisponivel: margem.margemDisponivel,
  };
}
