import { Empresa, NovaEmpresa } from '../entities/empresa.entity';

export const EMPRESAS_REPOSITORY = Symbol('EMPRESAS_REPOSITORY');

export interface EmpresasRepository {
  /** Cria a empresa e registra CNPJ, CPF do representante e e-mail como identificadores únicos (atômico). */
  create(data: NovaEmpresa): Promise<Empresa>;
  exists(id: string): Promise<boolean>;
}
