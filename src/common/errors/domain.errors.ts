export type ErrorDetails = Record<string, unknown>;

/**
 * Erros de domínio: os services lançam estes erros sem conhecer HTTP.
 * A tradução para status code é responsabilidade exclusiva do GlobalExceptionFilter.
 */
export abstract class DomainError extends Error {
  constructor(
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Entrada inválida que só pode ser detectada após a validação de formato (400). */
export class InvalidInputError extends DomainError {}

/** Autorização de consulta ausente ou expirada (403). */
export class ForbiddenOperationError extends DomainError {}

/** Recurso inexistente (404). */
export class NotFoundError extends DomainError {}

/** Violação de unicidade (409). */
export class ConflictError extends DomainError {}

/** Regra de negócio que impede a operação, ex.: empresa não habilitada (422). */
export class BusinessRuleViolationError extends DomainError {}

/** Serviço externo crítico indisponível — Dataprev (502). */
export class ExternalServiceUnavailableError extends DomainError {}
