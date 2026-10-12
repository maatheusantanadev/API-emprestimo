export const IDENTIFICADORES_REPOSITORY = Symbol('IDENTIFICADORES_REPOSITORY');

export type TipoIdentificador = 'cpf' | 'cnpj' | 'email';

export interface Identificador {
  tipo: TipoIdentificador;
  valor: string;
}

/**
 * Consulta o registro global de identificadores (CPF, CNPJ, e-mail) compartilhado
 * entre empresas e funcionários. A gravação acontece dentro da transação de
 * criação de cada entidade (ver repositórios de empresa e funcionário).
 */
export interface IdentificadoresRepository {
  /** Retorna, dentre os informados, os identificadores que já estão em uso. */
  findExistentes(identificadores: Identificador[]): Promise<Identificador[]>;
}
