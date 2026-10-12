import { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createValidationPipe } from './common/pipes/validation.pipe';

/**
 * Configuração compartilhada entre o bootstrap real (main.ts) e os testes e2e,
 * garantindo que ambos usem exatamente os mesmos pipes e filtros.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
}
