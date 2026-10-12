import {
  Funcionario,
  FuncionarioComEmpresa,
  NovoFuncionario,
} from '../entities/funcionario.entity';

export const FUNCIONARIOS_REPOSITORY = Symbol('FUNCIONARIOS_REPOSITORY');

export interface FuncionariosRepository {
  /** Cria o funcionário e registra CPF e e-mail como identificadores únicos (atômico). */
  create(data: NovoFuncionario): Promise<Funcionario>;
  findById(id: string): Promise<Funcionario | null>;
  findByIdComEmpresa(id: string): Promise<FuncionarioComEmpresa | null>;
}
