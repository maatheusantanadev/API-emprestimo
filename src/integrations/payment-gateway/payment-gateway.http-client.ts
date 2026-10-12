import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../../config/env.config';
import { HttpRequestError, JsonHttpClient } from '../http/json-http.client';
import {
  PagamentoRequest,
  PaymentGatewayClient,
  ResultadoPagamento,
} from './payment-gateway.client';

interface GatewayResponseBody {
  status?: unknown;
  transacaoId?: unknown;
  motivo?: unknown;
}

const asStringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

@Injectable()
export class PaymentGatewayHttpClient implements PaymentGatewayClient {
  private readonly logger = new Logger(PaymentGatewayHttpClient.name);

  constructor(
    private readonly http: JsonHttpClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async processarPagamento(request: PagamentoRequest): Promise<ResultadoPagamento> {
    let body: GatewayResponseBody | null;
    try {
      body = (await this.http.request(`${this.config.gatewayBaseUrl}/pagamento`, {
        method: 'POST',
        body: { valor: request.valor, funcionarioCpf: request.funcionarioCpf },
        timeoutMs: this.config.externalTimeoutMs,
      })) as GatewayResponseBody | null;
    } catch (error) {
      if (error instanceof HttpRequestError) return this.falha(error.message);
      throw error;
    }

    switch (body?.status) {
      case 'aprovado':
        return { status: 'aprovado', transacaoId: asStringOrNull(body.transacaoId) };
      case 'recusado':
        return { status: 'recusado', motivo: asStringOrNull(body.motivo) };
      default:
        return this.falha(`status inesperado do gateway: ${JSON.stringify(body?.status)}`);
    }
  }

  private falha(motivo: string): ResultadoPagamento {
    this.logger.warn(`Falha no gateway de pagamento: ${motivo}`);
    return { status: 'falha', motivo };
  }
}
