export const PAYMENT_GATEWAY_CLIENT = Symbol('PAYMENT_GATEWAY_CLIENT');

export interface PagamentoRequest {
  valor: number;
  funcionarioCpf: string;
}

/**
 * Resultado do processamento. O gateway NUNCA lança erro para o chamador:
 * falhas técnicas viram `{ status: 'falha' }` para que o empréstimo seja
 * persistido como "erro_processamento" (regra 9).
 */
export type ResultadoPagamento =
  | { status: 'aprovado'; transacaoId: string | null }
  | { status: 'recusado'; motivo: string | null }
  | { status: 'falha'; motivo: string };

export interface PaymentGatewayClient {
  processarPagamento(request: PagamentoRequest): Promise<ResultadoPagamento>;
}
