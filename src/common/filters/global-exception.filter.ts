import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import {
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  ErrorDetails,
  ExternalServiceUnavailableError,
  ForbiddenOperationError,
  InvalidInputError,
  NotFoundError,
} from '../errors/domain.errors';

/** Formato do schema `Erro` do contrato. */
export interface ErrorResponseBody {
  message: string;
  details: ErrorDetails | null;
}

interface MappedError {
  status: number;
  body: ErrorResponseBody;
}

type DomainErrorClass = abstract new (...args: never[]) => DomainError;

const DOMAIN_ERROR_STATUS: ReadonlyArray<[DomainErrorClass, HttpStatus]> = [
  [InvalidInputError, HttpStatus.BAD_REQUEST],
  [ForbiddenOperationError, HttpStatus.FORBIDDEN],
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [BusinessRuleViolationError, HttpStatus.UNPROCESSABLE_ENTITY],
  [ExternalServiceUnavailableError, HttpStatus.BAD_GATEWAY],
];

const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.map(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Detalhes técnicos ficam apenas no log do servidor, nunca na resposta.
      this.logger.error(
        exception instanceof Error ? exception.stack ?? exception.message : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private map(exception: unknown): MappedError {
    if (exception instanceof DomainError) {
      const entry = DOMAIN_ERROR_STATUS.find(([type]) => exception instanceof type);
      if (entry) {
        return this.build(entry[1], exception.message, exception.details);
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      // Fallback para corrida entre requisições concorrentes (UNIQUE do banco).
      return this.build(HttpStatus.CONFLICT, 'Registro já cadastrado');
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message =
        status >= HttpStatus.INTERNAL_SERVER_ERROR ? INTERNAL_ERROR_MESSAGE : exception.message;
      return this.build(status, message);
    }

    if (this.isMalformedJson(exception)) {
      return this.build(HttpStatus.BAD_REQUEST, 'JSON malformado no corpo da requisição');
    }

    return this.build(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE);
  }

  private isMalformedJson(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { type?: unknown }).type === 'entity.parse.failed'
    );
  }

  private build(status: number, message: string, details?: ErrorDetails): MappedError {
    return { status, body: { message, details: details ?? null } };
  }
}
