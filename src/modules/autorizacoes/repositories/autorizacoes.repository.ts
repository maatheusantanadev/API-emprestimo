import {
  AutorizacaoConsulta,
  NovaAutorizacaoConsulta,
} from '../entities/autorizacao.entity';

export const AUTORIZACOES_REPOSITORY = Symbol('AUTORIZACOES_REPOSITORY');

export interface AutorizacoesRepository {
  create(data: NovaAutorizacaoConsulta): Promise<AutorizacaoConsulta>;
  /** Autorização com maior validade que ainda não expirou em `agora`, se houver. */
  findAtiva(funcionarioId: string, agora: Date): Promise<AutorizacaoConsulta | null>;
}
