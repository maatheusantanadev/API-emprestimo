import { Empresa } from '../entities/empresa.entity';

/** Schema `Empresa` do contrato. */
export interface EmpresaResponse {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeRepresentante: string;
  cpfRepresentante: string;
  email: string;
  createdAt: string;
}

export function presentEmpresa(empresa: Empresa): EmpresaResponse {
  return {
    id: empresa.id,
    cnpj: empresa.cnpj,
    razaoSocial: empresa.razaoSocial,
    nomeRepresentante: empresa.nomeRepresentante,
    cpfRepresentante: empresa.cpfRepresentante,
    email: empresa.email,
    createdAt: empresa.createdAt.toISOString(),
  };
}
