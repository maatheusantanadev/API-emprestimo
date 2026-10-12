import { TestApp, createTestApp } from './helpers/test-app';
import {
  UUID_INEXISTENTE,
  criarFuncionario,
  criarFuncionarioAutorizado,
  novoCnpj,
  novoCpf,
} from './helpers/factories';

const CAMPOS_EMPRESTIMO = [
  'createdAt',
  'funcionarioId',
  'id',
  'motivoRejeicao',
  'numeroParcelas',
  'parcelas',
  'status',
  'valorParcela',
  'valorSolicitado',
].sort();

describe('Empréstimos (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => (t = await createTestApp()));
  afterAll(() => t.close());
  beforeEach(() => t.reset());

  const solicitar = (funcionarioId: string, valorSolicitado: number, numeroParcelas = 1) =>
    t.api().post('/emprestimos').send({ funcionarioId, valorSolicitado, numeroParcelas });

  describe('POST /emprestimos/simular', () => {
    it('200 com as 4 opções de parcelamento', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      const res = await t
        .api()
        .post('/emprestimos/simular')
        .send({ funcionarioId: funcionario.id, valorSolicitado: 1000 })
        .expect(200);

      expect(res.body).toEqual({
        funcionarioId: funcionario.id,
        valorSolicitado: 1000,
        margemDisponivel: 1750,
        parcelas: [
          { numeroParcelas: 1, valorParcela: 1000 },
          { numeroParcelas: 2, valorParcela: 500 },
          { numeroParcelas: 3, valorParcela: 333.33 },
          { numeroParcelas: 4, valorParcela: 250 },
        ],
      });
      expect(t.dataprev.chamadas).toHaveLength(0);
    });

    it('400 quando o valor excede a margem', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      await t
        .api()
        .post('/emprestimos/simular')
        .send({ funcionarioId: funcionario.id, valorSolicitado: 1750.01 })
        .expect(400);
    });

    it.each([0, -1, '100', null])('400 para valorSolicitado inválido (%p)', async (valor) => {
      const funcionario = await criarFuncionarioAutorizado(t);
      await t
        .api()
        .post('/emprestimos/simular')
        .send({ funcionarioId: funcionario.id, valorSolicitado: valor })
        .expect(400);
    });

    it('403 sem autorização e 404 para funcionário inexistente', async () => {
      const funcionario = await criarFuncionario(t);
      await t.api().post('/emprestimos/simular').send({ funcionarioId: funcionario.id, valorSolicitado: 10 }).expect(403);
      await t.api().post('/emprestimos/simular').send({ funcionarioId: UUID_INEXISTENTE, valorSolicitado: 10 }).expect(404);
    });

    it('funciona mesmo com o Dataprev fora do ar', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.dataprev.indisponivel = true;
      await t.api().post('/emprestimos/simular').send({ funcionarioId: funcionario.id, valorSolicitado: 10 }).expect(200);
    });
  });

  describe('POST /emprestimos', () => {
    it('201 aprovado, com o schema Emprestimo e parcelas do contrato', async () => {
      t.clock.set('2025-05-05T12:00:00.000Z');
      const funcionario = await criarFuncionarioAutorizado(t);

      const res = await solicitar(funcionario.id, 1000, 4).expect(201);

      expect(Object.keys(res.body).sort()).toEqual(CAMPOS_EMPRESTIMO);
      expect(res.body).toMatchObject({
        funcionarioId: funcionario.id,
        valorSolicitado: 1000,
        numeroParcelas: 4,
        valorParcela: 250,
        status: 'aprovado',
        motivoRejeicao: null,
        createdAt: '2025-05-05T12:00:00.000Z',
      });
      expect(res.body.parcelas).toEqual([
        { numero: 1, valor: 250, dataVencimento: '2025-06-05' },
        { numero: 2, valor: 250, dataVencimento: '2025-07-05' },
        { numero: 3, valor: 250, dataVencimento: '2025-08-05' },
        { numero: 4, valor: 250, dataVencimento: '2025-09-05' },
      ]);
      expect(t.gateway.chamadas).toEqual([{ valor: 1000, funcionarioCpf: funcionario.cpf }]);
    });

    it('vencimentos no último dia do mês quando o dia não existe', async () => {
      t.clock.set('2025-01-31T15:00:00.000Z');
      const funcionario = await criarFuncionarioAutorizado(t);
      const res = await solicitar(funcionario.id, 1000, 3).expect(201);
      expect(res.body.parcelas.map((p: { dataVencimento: string }) => p.dataVencimento)).toEqual([
        '2025-02-28',
        '2025-03-31',
        '2025-04-30',
      ]);
      expect(res.body.parcelas.map((p: { valor: number }) => p.valor)).toEqual([333.33, 333.33, 333.33]);
    });

    it('201 rejeitado por score insuficiente (CPF final 00 -> score 300)', async () => {
      const funcionario = await criarFuncionarioAutorizado(t, { funcionario: { cpf: novoCpf('00') } });
      const res = await solicitar(funcionario.id, 100).expect(201);
      expect(res.body).toMatchObject({
        status: 'rejeitado',
        motivoRejeicao: 'Score insuficiente para a faixa salarial',
      });
      expect(t.gateway.chamadas).toHaveLength(0);
    });

    it('score mínimo depende da faixa salarial (score 650 reprovado acima de R$ 8.000)', async () => {
      const funcionario = await criarFuncionarioAutorizado(t, { funcionario: { salario: 8000.01 } });
      expect((await solicitar(funcionario.id, 100).expect(201)).body.status).toBe('rejeitado');
    });

    it('201 rejeitado quando o valor excede a margem', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      const res = await solicitar(funcionario.id, 1750.01).expect(201);
      expect(res.body.status).toBe('rejeitado');
      expect(res.body.motivoRejeicao).toEqual(expect.any(String));
    });

    it('201 rejeitado ao atingir o limite de 3 empréstimos ativos', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      for (let i = 0; i < 3; i++) {
        expect((await solicitar(funcionario.id, 100).expect(201)).body.status).toBe('aprovado');
      }
      const res = await solicitar(funcionario.id, 100).expect(201);
      expect(res.body.status).toBe('rejeitado');
      expect(res.body.motivoRejeicao).toMatch(/Limite/);
    });

    it('201 rejeitado quando o gateway recusa o pagamento', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.gateway.resultado = { status: 'recusado', motivo: 'Saldo insuficiente' };
      const res = await solicitar(funcionario.id, 100).expect(201);
      expect(res.body).toMatchObject({ status: 'rejeitado', motivoRejeicao: 'Pagamento recusado pelo gateway' });
    });

    it('201 erro_processamento quando o gateway falha — e o empréstimo fica salvo', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.gateway.resultado = { status: 'falha', motivo: 'HTTP 503' };
      const res = await solicitar(funcionario.id, 100).expect(201);
      expect(res.body.status).toBe('erro_processamento');
      await t.api().get(`/emprestimos/${res.body.id}`).expect(200);
    });

    it('erro_processamento não consome margem nem limite', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.gateway.resultado = { status: 'falha', motivo: 'timeout' };
      await solicitar(funcionario.id, 1750).expect(201);
      const margem = await t.api().get(`/funcionarios/${funcionario.id}/margem`).expect(200);
      expect(margem.body.margemDisponivel).toBe(1750);
    });

    it('502 quando o Dataprev está indisponível — nenhum empréstimo é salvo', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      t.dataprev.indisponivel = true;
      await solicitar(funcionario.id, 100).expect(502);
      const lista = await t.api().get('/emprestimos').query({ funcionarioId: funcionario.id }).expect(200);
      expect(lista.body.data).toHaveLength(0);
    });

    it('422 quando a empresa não está habilitada', async () => {
      const funcionario = await criarFuncionarioAutorizado(t, { empresa: { cnpj: novoCnpj('0000') } });
      await solicitar(funcionario.id, 100).expect(422);
    });

    it('403 sem autorização e 404 para funcionário inexistente', async () => {
      const funcionario = await criarFuncionario(t);
      await solicitar(funcionario.id, 100).expect(403);
      await solicitar(UUID_INEXISTENTE, 100).expect(404);
    });

    it.each([
      ['0 parcelas', { numeroParcelas: 0 }],
      ['5 parcelas', { numeroParcelas: 5 }],
      ['parcelas fracionadas', { numeroParcelas: 1.5 }],
      ['sem numeroParcelas', { numeroParcelas: undefined }],
      ['valor negativo', { valorSolicitado: -100 }],
      ['funcionarioId inválido', { funcionarioId: 'abc' }],
    ])('400 para %s', async (_, overrides) => {
      const funcionario = await criarFuncionarioAutorizado(t);
      await t
        .api()
        .post('/emprestimos')
        .send({ funcionarioId: funcionario.id, valorSolicitado: 100, numeroParcelas: 2, ...overrides })
        .expect(400);
    });
  });

  describe('GET /emprestimos e GET /emprestimos/:id', () => {
    it('lista no formato { data: [...] } com filtros opcionais', async () => {
      const a = await criarFuncionarioAutorizado(t);
      const b = await criarFuncionarioAutorizado(t, { funcionario: { cpf: novoCpf('00') } });
      await solicitar(a.id, 100).expect(201); // aprovado
      await solicitar(a.id, 9999).expect(201); // rejeitado (margem)
      await solicitar(b.id, 100).expect(201); // rejeitado (score)

      const todos = await t.api().get('/emprestimos').expect(200);
      expect(todos.body.data).toHaveLength(3);
      expect(Object.keys(todos.body.data[0]).sort()).toEqual(CAMPOS_EMPRESTIMO);

      const doA = await t.api().get('/emprestimos').query({ funcionarioId: a.id }).expect(200);
      expect(doA.body.data).toHaveLength(2);

      const rejeitados = await t.api().get('/emprestimos').query({ status: 'rejeitado' }).expect(200);
      expect(rejeitados.body.data).toHaveLength(2);

      const aprovadosDoA = await t.api().get('/emprestimos').query({ funcionarioId: a.id, status: 'aprovado' }).expect(200);
      expect(aprovadosDoA.body.data).toHaveLength(1);
    });

    it('lista vazia retorna { data: [] }', async () => {
      const res = await t.api().get('/emprestimos').expect(200);
      expect(res.body).toEqual({ data: [] });
    });

    it('400 para status fora do enum', async () => {
      await t.api().get('/emprestimos').query({ status: 'pendente' }).expect(400);
    });

    it('detalha o empréstimo com as parcelas', async () => {
      const funcionario = await criarFuncionarioAutorizado(t);
      const criado = (await solicitar(funcionario.id, 300, 3).expect(201)).body;
      const res = await t.api().get(`/emprestimos/${criado.id}`).expect(200);
      expect(res.body).toEqual(criado);
      expect(res.body.parcelas).toHaveLength(3);
    });

    it('404 para empréstimo inexistente ou id inválido', async () => {
      await t.api().get(`/emprestimos/${UUID_INEXISTENTE}`).expect(404);
      await t.api().get('/emprestimos/abc').expect(404);
    });
  });
});
