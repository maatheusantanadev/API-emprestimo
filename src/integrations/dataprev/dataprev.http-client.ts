import { Inject, Injectable, Logger } from '@nestjs/common';
import { ExternalServiceUnavailableError } from '../../common/errors/domain.errors';
import { APP_CONFIG, AppConfig } from '../../config/env.config';
import { HttpRequestError, JsonHttpClient } from '../http/json-http.client';
import { DataprevClient } from './dataprev.client';

const DATAPREV_INDISPONIVEL = 'Dataprev indisponível no momento. Tente novamente mais tarde.';

@Injectable()
export class DataprevHttpClient implements DataprevClient {
  private readonly logger = new Logger(DataprevHttpClient.name);

  constructor(
    private readonly http: JsonHttpClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async isEmpresaHabilitada(cnpj: string): Promise<boolean> {
    const body = await this.get(`/empresa/${encodeURIComponent(cnpj)}/status`);
    const habilitada = (body as { habilitada?: unknown } | null)?.habilitada;
    if (typeof habilitada !== 'boolean') {
      throw this.unavailable('resposta sem o campo "habilitada" booleano');
    }
    return habilitada;
  }

  async consultarScore(cpf: string): Promise<number> {
    const body = await this.get(`/funcionario/${encodeURIComponent(cpf)}/score`);
    const score = (body as { score?: unknown } | null)?.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw this.unavailable('resposta sem o campo "score" numérico');
    }
    return score;
  }

  private async get(path: string): Promise<unknown> {
    try {
      return await this.http.request(`${this.config.dataprevBaseUrl}${path}`, {
        timeoutMs: this.config.externalTimeoutMs,
      });
    } catch (error) {
      if (error instanceof HttpRequestError) throw this.unavailable(error.message, error.kind);
      throw error;
    }
  }

  private unavailable(reason: string, kind?: string): ExternalServiceUnavailableError {
    this.logger.warn(`Falha ao consultar Dataprev: ${reason}`);
    return new ExternalServiceUnavailableError(DATAPREV_INDISPONIVEL, kind ? { motivo: kind } : undefined);
  }
}
