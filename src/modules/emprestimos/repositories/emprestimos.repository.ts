import {
  Emprestimo,
  FiltrosEmprestimo,
  NovoEmprestimo,
  ResumoEmprestimosAtivos,
} from '../entities/emprestimo.entity';

export const EMPRESTIMOS_REPOSITORY = Symbol('EMPRESTIMOS_REPOSITORY');

export interface EmprestimosRepository {
  /** Persiste o empréstimo e suas parcelas atomicamente. */
  create(data: NovoEmprestimo): Promise<Emprestimo>;
  findById(id: string): Promise<Emprestimo | null>;
  findMany(filtros: FiltrosEmprestimo): Promise<Emprestimo[]>;
  resumoAtivos(funcionarioId: string): Promise<ResumoEmprestimosAtivos>;
}
