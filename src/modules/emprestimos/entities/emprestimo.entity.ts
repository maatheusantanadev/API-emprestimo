import { IsoDate } from '../../../common/utils/dates';

export const STATUS_EMPRESTIMO = ['aprovado', 'rejeitado', 'erro_processamento'] as const;
export type StatusEmprestimo = (typeof STATUS_EMPRESTIMO)[number];

export interface ParcelaEmprestimo {
  numero: number;
  valor: number;
  dataVencimento: IsoDate;
}

export interface Emprestimo {
  id: string;
  funcionarioId: string;
  valorSolicitado: number;
  numeroParcelas: number;
  valorParcela: number;
  status: StatusEmprestimo;
  motivoRejeicao: string | null;
  gatewayTransacaoId: string | null;
  parcelas: ParcelaEmprestimo[];
  createdAt: Date;
}

export type NovoEmprestimo = Omit<Emprestimo, 'id'>;

export interface FiltrosEmprestimo {
  funcionarioId?: string;
  status?: StatusEmprestimo;
}

/** Agregado dos empréstimos com status "aprovado" (ativos) de um funcionário. */
export interface ResumoEmprestimosAtivos {
  quantidade: number;
  somaParcelasMensais: number;
}
