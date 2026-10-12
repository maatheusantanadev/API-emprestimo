import { Injectable } from '@nestjs/common';

export type HttpFailureKind = 'timeout' | 'network' | 'http_status' | 'invalid_body';

/** Falha técnica em uma chamada HTTP externa (nunca exposta diretamente ao cliente da API). */
export class HttpRequestError extends Error {
  constructor(
    readonly kind: HttpFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export interface JsonRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs: number;
}

/** Cliente HTTP mínimo baseado no fetch nativo, com timeout obrigatório. */
@Injectable()
export class JsonHttpClient {
  async request(url: string, { method = 'GET', body, timeoutMs }: JsonRequestOptions): Promise<unknown> {
    // O AbortSignal.timeout cobre a requisição inteira, inclusive a leitura do corpo.
    const signal = AbortSignal.timeout(timeoutMs);
    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (error) {
      throw this.fromFetchError(error, signal, url, timeoutMs);
    }

    if (!response.ok) {
      throw new HttpRequestError('http_status', `${method} ${url} -> HTTP ${response.status}`, response.status);
    }

    try {
      return await response.json();
    } catch (error) {
      if (signal.aborted) throw this.fromFetchError(error, signal, url, timeoutMs);
      throw new HttpRequestError('invalid_body', `${method} ${url} -> corpo não é JSON válido`);
    }
  }

  private fromFetchError(
    error: unknown,
    signal: AbortSignal,
    url: string,
    timeoutMs: number,
  ): HttpRequestError {
    // O sinal é a fonte confiável: o erro lançado pelo fetch pode vir de outro realm
    // (ex.: DOMException), onde `instanceof Error` não funciona.
    if (signal.aborted) {
      return new HttpRequestError('timeout', `${url} não respondeu em ${timeoutMs}ms`);
    }
    return new HttpRequestError('network', `${url} inacessível: ${String(error)}`);
  }
}
