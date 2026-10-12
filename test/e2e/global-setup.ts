import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { TEST_DATABASE_URL } from './test-database';

/** Cria o banco de testes (se necessário) e aplica as migrations antes da suíte. */
export default async function globalSetup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const databaseName = url.pathname.slice(1);
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const existe = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
    if (existe.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName.replace(/"/g, '')}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  const prismaBin = path.resolve(__dirname, '../../node_modules/.bin/prisma');
  execFileSync(prismaBin, ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
