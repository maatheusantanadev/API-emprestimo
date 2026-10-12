export interface AutorizacaoConsulta {
  id: string;
  funcionarioId: string;
  autorizadoEm: Date;
  expiraEm: Date;
}

export interface NovaAutorizacaoConsulta {
  funcionarioId: string;
  autorizadoEm: Date;
  expiraEm: Date;
}
