import { Clock } from '../../src/common/clock/clock';
import { ExternalServiceUnavailableError } from '../../src/common/errors/domain.errors';
import { DataprevClient } from '../../src/integrations/dataprev/dataprev.client';
import {
  PagamentoRequest,
  PaymentGatewayClient,
  ResultadoPagamento,
} from '../../src/integrations/payment-gateway/payment-gateway.client';

export const DATA_PADRAO = '2025-05-05T12:00:00.000Z';

export class FakeClock implements Clock {
  private current = new Date(DATA_PADRAO);

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date | string): void {
    this.current = new Date(date);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  reset(): void {
    this.set(DATA_PADRAO);
  }
}

/** Mesmo comportamento determinístico do servidor de mocks. */
export function scorePadraoDoMock(cpf: string): number {
  const final = cpf.slice(-2);
  if (final === '00') return 300;
  if (final === '50') return 500;
  if (final === '99') return 900;
  return 650;
}

export class FakeDataprevClient implements DataprevClient {
  indisponivel = false;
  readonly scores = new Map<string, number>();
  readonly chamadas: string[] = [];

  async isEmpresaHabilitada(cnpj: string): Promise<boolean> {
    this.chamadas.push(`empresa:${cnpj}`);
    this.falharSeIndisponivel();
    return !cnpj.endsWith('0000');
  }

  async consultarScore(cpf: string): Promise<number> {
    this.chamadas.push(`score:${cpf}`);
    this.falharSeIndisponivel();
    return this.scores.get(cpf) ?? scorePadraoDoMock(cpf);
  }

  reset(): void {
    this.indisponivel = false;
    this.scores.clear();
    this.chamadas.length = 0;
  }

  private falharSeIndisponivel(): void {
    if (this.indisponivel) {
      throw new ExternalServiceUnavailableError('Dataprev indisponível no momento. Tente novamente mais tarde.');
    }
  }
}

export class FakePaymentGateway implements PaymentGatewayClient {
  resultado: ResultadoPagamento = { status: 'aprovado', transacaoId: 'tx-fake' };
  readonly chamadas: PagamentoRequest[] = [];

  async processarPagamento(request: PagamentoRequest): Promise<ResultadoPagamento> {
    this.chamadas.push(request);
    // Cede o event loop, como uma chamada de rede real (relevante para testes de concorrência).
    await new Promise((resolve) => setImmediate(resolve));
    return this.resultado;
  }

  reset(): void {
    this.resultado = { status: 'aprovado', transacaoId: 'tx-fake' };
    this.chamadas.length = 0;
  }
}
