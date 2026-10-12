export interface Funcionario {
  id: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
  salario: number;
  empresaId: string;
  createdAt: Date;
}

/** Funcionário com o CNPJ da empresa — necessário para consultar o Dataprev. */
export interface FuncionarioComEmpresa extends Funcionario {
  empresaCnpj: string;
}

export interface NovoFuncionario {
  nomeCompleto: string;
  cpf: string;
  email: string;
  senhaHash: string;
  salario: number;
  empresaId: string;
}
