import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { CLOCK } from '../../../src/common/clock/clock';
import { DATAPREV_CLIENT } from '../../../src/integrations/dataprev/dataprev.client';
import { PAYMENT_GATEWAY_CLIENT } from '../../../src/integrations/payment-gateway/payment-gateway.client';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { FakeClock, FakeDataprevClient, FakePaymentGateway } from '../../support/fakes';

export interface TestApp {
  app: INestApplication;
  api: () => ReturnType<typeof request>;
  dataprev: FakeDataprevClient;
  gateway: FakePaymentGateway;
  clock: FakeClock;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Sobe a aplicação real (módulos, pipes, filtro global, Prisma + Postgres),
 * trocando apenas as integrações externas e o relógio por fakes controláveis.
 */
export async function createTestApp(): Promise<TestApp> {
  const dataprev = new FakeDataprevClient();
  const gateway = new FakePaymentGateway();
  const clock = new FakeClock();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATAPREV_CLIENT)
    .useValue(dataprev)
    .overrideProvider(PAYMENT_GATEWAY_CLIENT)
    .useValue(gateway)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);

  return {
    app,
    api: () => request(app.getHttpServer()),
    dataprev,
    gateway,
    clock,
    reset: async () => {
      await prisma.$executeRawUnsafe(
        'TRUNCATE parcelas_emprestimo, emprestimos, autorizacoes_consulta, funcionarios, empresas, identificadores_unicos CASCADE',
      );
      dataprev.reset();
      gateway.reset();
      clock.reset();
    },
    close: () => app.close(),
  };
}
