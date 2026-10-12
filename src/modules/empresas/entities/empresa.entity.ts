/** Empresa conveniada. A senha nunca sai da camada de persistência. */
export interface Empresa {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeRepresentante: string;
  cpfRepresentante: string;
  email: string;
  createdAt: Date;
}

export interface NovaEmpresa {
  cnpj: string;
  razaoSocial: string;
  nomeRepresentante: string;
  cpfRepresentante: string;
  email: string;
  senhaHash: string;
}
