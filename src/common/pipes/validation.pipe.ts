import { ValidationError, ValidationPipe } from '@nestjs/common';
import { InvalidInputError } from '../errors/domain.errors';

/** Achata erros aninhados do class-validator em { campo: [mensagens] }. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      acc[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      Object.assign(acc, flattenValidationErrors(error.children, path));
    }
    return acc;
  }, {});
}

/**
 * - whitelist: remove campos que não existem no DTO (não chegam ao service);
 * - transform: entrega ao controller instâncias tipadas dos DTOs;
 * - erros viram InvalidInputError -> 400 no formato { message, details }.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors: ValidationError[]) => {
      const campos = flattenValidationErrors(errors);
      const [primeiraMensagem] = Object.values(campos).flat();
      return new InvalidInputError(primeiraMensagem ?? 'Dados inválidos', { campos });
    },
  });
}
