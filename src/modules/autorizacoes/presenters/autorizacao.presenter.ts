import { AutorizacaoConcedida } from '../services/autorizacoes.service';

/** Schema `Autorizacao` do contrato. */
export interface AutorizacaoResponse {
  funcionarioId: string;
  autorizado: boolean;
  expiraEm: string;
}

export function presentAutorizacao(autorizacao: AutorizacaoConcedida): AutorizacaoResponse {
  return {
    funcionarioId: autorizacao.funcionarioId,
    autorizado: autorizacao.autorizado,
    expiraEm: autorizacao.expiraEm.toISOString(),
  };
}
