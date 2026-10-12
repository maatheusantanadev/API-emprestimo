import { Funcionario } from '../entities/funcionario.entity';

/** Schema `Funcionario` do contrato. */
export interface FuncionarioResponse {
  id: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
  salario: number;
  empresaId: string;
  createdAt: string;
}

export function presentFuncionario(funcionario: Funcionario): FuncionarioResponse {
  return {
    id: funcionario.id,
    nomeCompleto: funcionario.nomeCompleto,
    cpf: funcionario.cpf,
    email: funcionario.email,
    salario: funcionario.salario,
    empresaId: funcionario.empresaId,
    createdAt: funcionario.createdAt.toISOString(),
  };
}
