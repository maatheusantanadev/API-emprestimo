import { TestApp, createTestApp } from './helpers/test-app';
import { UUID_INEXISTENTE, criarFuncionario, criarFuncionarioAutorizado, novoCnpj } from './helpers/factories';

const HORA = 60 * 60 * 1000;

describe('Autorização de consulta e margem (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => (t = await createTestApp()));
  afterAll(() => t.close());
  beforeEach(() => t.reset());

  describe('POST /funcionarios/:id/autorizacao-consulta', () => {
    it('200 com expiração em 24h', async () => {
      t.clock.set('2025-05-05T12:00:00.000Z');
      const funcionario = await criarFuncionario(t);

      const res = await t.api().post(`/funcionarios/${funcionario.id}/autorizacao-consulta`).expect(200);
      expect(res.body).toEqual({
        funcionarioId: funcionario.id,
        autorizado: true,
        expiraEm: '2025-05-06T12:00:00.000Z',
      });
    });

    it('404 para funcionário inexistente ou id inválido', async () => {
      await t.api().post(`/funcionarios/${UUID_INEXISTENTE}/autorizacao-consulta`).expect(404);
      await t.api().post('/funcionarios/nao-e-uuid/autorizacao-consulta').expect(404);
    });

    it('renovar abre uma nova janela de 24h', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.clock.advance(20 * HORA);
      await t.api().post(`/funcionarios/${funcionario.id}/autorizacao-consulta`).expect(200);
      t.clock.advance(10 * HORA);
      await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(200);
    });
  });

  describe('GET /funcionarios/:id/margem', () => {
    it('200 com o schema Margem do contrato', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      const res = await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(200);
      expect(res.body).toEqual({
        funcionarioId: funcionario.id,
        salario: 5000,
        margemTotal: 1750,
        margemUtilizada: 0,
        margemDisponivel: 1750,
      });
    });

    it('desconta as parcelas dos empréstimos aprovados', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      await t
        .api()
        .post('/emprestimos')
        .send({ funcionarioId: funcionario.id, valorSolicitado: 500, numeroParcelas: 2 })
        .expect(201);

      const res = await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(200);
      expect(res.body).toMatchObject({ margemUtilizada: 250, margemDisponivel: 1500 });
    });

    it('403 sem autorização', async () => {
      const funcionario = await criarFuncionario(t);
      const res = await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(403);
      expect(res.body.message).toBeDefined();
    });

    it('403 quando a autorização expira (24h)', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.clock.advance(24 * HORA);
      await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(403);
    });

    it('404 para funcionário inexistente', async () => {
      await t.api().get(`/funcionarios/${UUID_INEXISTENTE}/margem`).expect(404);
    });

    it('422 quando a empresa não está habilitada no e-Consignado', async () => {
      const funcionario = await criarFuncionarioAutorizado(t, { empresa: { cnpj: novoCnpj('0000') } });
      await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(422);
    });

    it('502 quando o Dataprev está indisponível', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.dataprev.indisponivel = true;
      const res = await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(502);
      expect(res.body.message).toMatch(/Dataprev/);
    });
  });
});
