import { Injectable, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { NotFoundError } from '../errors/domain.errors';

/**
 * Para parâmetros de rota o contrato prevê apenas 404: um id que não é UUID
 * certamente não existe, então é tratado como "não encontrado" (e nunca chega
 * ao Prisma, que lançaria erro de cast numa coluna UUID).
 */
@Injectable()
export class UuidOrNotFoundPipe implements PipeTransform<string, string> {
  constructor(private readonly notFoundMessage: string) {}

  transform(value: string): string {
    if (!isUUID(value, 'all')) {
      throw new NotFoundError(this.notFoundMessage);
    }
    return value;
  }
}
