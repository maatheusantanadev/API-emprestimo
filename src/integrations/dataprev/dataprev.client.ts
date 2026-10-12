export const DATAPREV_CLIENT = Symbol('DATAPREV_CLIENT');

/**
 * Porta para o Dataprev (e-Consignado).
 * Qualquer indisponibilidade (HTTP != 2xx, timeout, rede, resposta inválida)
 * é sinalizada com ExternalServiceUnavailableError (-> 502).
 */
export interface DataprevClient {
  isEmpresaHabilitada(cnpj: string): Promise<boolean>;
  consultarScore(cpf: string): Promise<number>;
}
