import { Logger } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import http from 'node:http';
import { ExternalServiceUnavailableError } from '../../src/common/errors/domain.errors';
import { AppConfig } from '../../src/config/env.config';
import { DataprevHttpClient } from '../../src/integrations/dataprev/dataprev.http-client';
import { HttpRequestError, JsonHttpClient } from '../../src/integrations/http/json-http.client';
import { PaymentGatewayHttpClient } from '../../src/integrations/payment-gateway/payment-gateway.http-client';

const config: AppConfig = {
  port: 3000,
  databaseUrl: 'postgresql://x',
  dataprevBaseUrl: 'http://dataprev',
  gatewayBaseUrl: 'http://gateway',
  externalTimeoutMs: 3000,
};

beforeAll(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined));
afterAll(() => jest.restoreAllMocks());

describe('JsonHttpClient (servidor HTTP real local)', () => {
  let server: http.Server;
  let baseUrl: string;
  const client = new JsonHttpClient();

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/ok') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, metodo: req.method }));
      } else if (req.url === '/503') {
        res.statusCode = 503;
        res.end('{"message":"indisponível"}');
      } else if (req.url === '/lento') {
        setTimeout(() => res.end('{}'), 400).unref();
      } else {
        res.end('isto não é json');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      done();
    });
  });

  afterAll((done) => {
    server.closeAllConnections();
    server.close(() => done());
  });

  it('retorna o corpo JSON em caso de sucesso', async () => {
    await expect(client.request(`${baseUrl}/ok`, { method: 'POST', body: { a: 1 }, timeoutMs: 1000 })).resolves.toEqual({
      ok: true,
      metodo: 'POST',
    });
  });

  it('status HTTP de erro -> http_status', async () => {
    await expect(client.request(`${baseUrl}/503`, { timeoutMs: 1000 })).rejects.toMatchObject({
      kind: 'http_status',
      status: 503,
    });
  });

  it('dispara o timeout quando o serviço demora', async () => {
    const inicio = Date.now();
    const erro = (await client.request(`${baseUrl}/lento`, { timeoutMs: 100 }).catch((e: unknown) => e)) as HttpRequestError;
    expect(erro).toBeInstanceOf(HttpRequestError);
    expect(erro.kind).toBe('timeout');
    expect(Date.now() - inicio).toBeLessThan(380);
  });

  it('corpo inválido -> invalid_body', async () => {
    await expect(client.request(`${baseUrl}/texto`, { timeoutMs: 1000 })).rejects.toMatchObject({
      kind: 'invalid_body',
    });
  });

  it('serviço inacessível -> network', async () => {
    await expect(client.request('http://127.0.0.1:1/x', { timeoutMs: 1000 })).rejects.toMatchObject({
      kind: 'network',
    });
  });
});

describe('DataprevHttpClient', () => {
  const httpStub = { request: jest.fn() };
  const client = new DataprevHttpClient(httpStub as unknown as JsonHttpClient, config);

  beforeEach(() => httpStub.request.mockReset());

  it('consulta o status da empresa na URL do contrato com timeout configurado', async () => {
    httpStub.request.mockResolvedValue({ cnpj: '123', habilitada: true });
    await expect(client.isEmpresaHabilitada('12345678000100')).resolves.toBe(true);
    expect(httpStub.request).toHaveBeenCalledWith('http://dataprev/empresa/12345678000100/status', { timeoutMs: 3000 });
  });

  it('consulta o score na URL do contrato', async () => {
    httpStub.request.mockResolvedValue({ cpf: '123', score: 650 });
    await expect(client.consultarScore('12345678901')).resolves.toBe(650);
    expect(httpStub.request).toHaveBeenCalledWith('http://dataprev/funcionario/12345678901/score', { timeoutMs: 3000 });
  });

  it.each([
    ['HTTP 503', new HttpRequestError('http_status', '503', 503)],
    ['timeout', new HttpRequestError('timeout', 'timeout')],
    ['rede', new HttpRequestError('network', 'ECONNREFUSED')],
  ])('%s -> ExternalServiceUnavailableError', async (_, erro) => {
    httpStub.request.mockRejectedValue(erro);
    await expect(client.consultarScore('1')).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
  });

  it('resposta fora do formato esperado -> ExternalServiceUnavailableError', async () => {
    httpStub.request.mockResolvedValue({ cnpj: '1' });
    await expect(client.isEmpresaHabilitada('1')).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    httpStub.request.mockResolvedValue({ score: '650' });
    await expect(client.consultarScore('1')).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
  });
});

describe('PaymentGatewayHttpClient', () => {
  const httpStub = { request: jest.fn() };
  const client = new PaymentGatewayHttpClient(httpStub as unknown as JsonHttpClient, config);
  const pagamento = { valor: 1000, funcionarioCpf: '12345678900' };

  beforeEach(() => httpStub.request.mockReset());

  it('envia o body do contrato e mapeia "aprovado"', async () => {
    httpStub.request.mockResolvedValue({ status: 'aprovado', transacaoId: 'tx-1' });
    await expect(client.processarPagamento(pagamento)).resolves.toEqual({ status: 'aprovado', transacaoId: 'tx-1' });
    expect(httpStub.request).toHaveBeenCalledWith('http://gateway/pagamento', {
      method: 'POST',
      body: { valor: 1000, funcionarioCpf: '12345678900' },
      timeoutMs: 3000,
    });
  });

  it('mapeia "recusado" (HTTP 200)', async () => {
    httpStub.request.mockResolvedValue({ status: 'recusado', motivo: 'Saldo insuficiente' });
    await expect(client.processarPagamento(pagamento)).resolves.toEqual({
      status: 'recusado',
      motivo: 'Saldo insuficiente',
    });
  });

  it.each([
    ['HTTP 503', new HttpRequestError('http_status', '503', 503)],
    ['timeout', new HttpRequestError('timeout', 'timeout')],
  ])('%s -> falha (nunca lança)', async (_, erro) => {
    httpStub.request.mockRejectedValue(erro);
    await expect(client.processarPagamento(pagamento)).resolves.toMatchObject({ status: 'falha' });
  });

  it('status desconhecido -> falha', async () => {
    httpStub.request.mockResolvedValue({ status: 'pendente' });
    await expect(client.processarPagamento(pagamento)).resolves.toMatchObject({ status: 'falha' });
  });
});
