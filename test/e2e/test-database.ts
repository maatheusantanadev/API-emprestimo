/** Banco exclusivo para os testes de feature (nunca o banco da aplicação). */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://credifit:credifit123@localhost:5432/credifit_test';
