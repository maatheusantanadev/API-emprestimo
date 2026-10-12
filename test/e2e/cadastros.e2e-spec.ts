import { TestApp, createTestApp } from './helpers/test-app';
import { UUID_INEXISTENTE, criarEmpresa, empresaPayload, funcionarioPayload } from './helpers/factories';

describe('Cadastros (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => (t = await createTestApp()));
  afterAll(() => t.close());
  beforeEach(() => t.reset());

  describe('POST /empresas', () => {
    it('201 com o schema Empresa do contrato (sem senha)', async () => {
      const payload = empresaPayload();
      const res = await t.api().post('/empresas').send(payload).expect(201);

      expect(Object.keys(res.body).sort()).toEqual(
        ['cnpj', 'cpfRepresentante', 'createdAt', 'email', 'id', 'nomeRepresentante', 'razaoSocial'].sort(),
      );
      expect(res.body).toMatchObject({
        cnpj: payload.cnpj,
        razaoSocial: payload.razaoSocial,
        cpfRepresentante: payload.cpfRepresentante,
        email: payload.email,
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
    });

    it.each([
      ['CNPJ com 13 dígitos', { cnpj: '1234567800010' }],
      ['CNPJ com máscara', { cnpj: '12.345.678/0001-00' }],
      ['CPF com letras', { cpfRepresentante: '1234567890a' }],
      ['e-mail inválido', { email: 'nao-e-email' }],
      ['senha curta', { senha: '1234567' }],
      ['razão social vazia', { razaoSocial: '   ' }],
      ['campo obrigatório ausente', { nomeRepresentante: undefined }],
    ])('400 para %s, no formato { message, details }', async (_, overrides) => {
      const res = await t.api().post('/empresas').send(empresaPayload(overrides)).expect(400);
      expect(typeof res.body.message).toBe('string');
      expect(res.body).toHaveProperty('details');
    });

    it('400 para JSON malformado', async () => {
      await t.api().post('/empresas').set('Content-Type', 'application/json').send('{"cnpj":').expect(400);
    });

    it('409 para CNPJ duplicado', async () => {
      const empresa = await criarEmpresa(t);
      const res = await t.api().post('/empresas').send(empresaPayload({ cnpj: empresa.cnpj })).expect(409);
      expect(res.body.message).toBe('CNPJ já cadastrado');
    });

    it('409 para e-mail duplicado, ignorando maiúsculas', async () => {
      await criarEmpresa(t, { email: 'contato@empresa.com' });
      await t.api().post('/empresas').send(empresaPayload({ email: 'CONTATO@Empresa.com' })).expect(409);
    });
  });

  describe('POST /funcionarios', () => {
    it('201 com o schema Funcionario do contrato (sem senha)', async () => {
      const empresa = await criarEmpresa(t);
      const payload = funcionarioPayload(empresa.id, { salario: 5000.5 });
      const res = await t.api().post('/funcionarios').send(payload).expect(201);

      expect(Object.keys(res.body).sort()).toEqual(
        ['cpf', 'createdAt', 'email', 'empresaId', 'id', 'nomeCompleto', 'salario'].sort(),
      );
      expect(res.body).toMatchObject({ empresaId: empresa.id, salario: 5000.5, cpf: payload.cpf });
    });

    it('404 quando a empresa não existe', async () => {
      const res = await t.api().post('/funcionarios').send(funcionarioPayload(UUID_INEXISTENTE)).expect(404);
      expect(res.body.message).toBe('Empresa não encontrada');
    });

    it.each([
      ['salário zero', { salario: 0 }],
      ['salário negativo', { salario: -10 }],
      ['salário como texto', { salario: '5000' }],
      ['salário com 3 casas decimais', { salario: 1000.123 }],
      ['empresaId não-UUID', { empresaId: 'abc' }],
      ['CPF com 10 dígitos', { cpf: '1234567890' }],
    ])('400 para %s', async (_, overrides) => {
      const empresa = await criarEmpresa(t);
      await t.api().post('/funcionarios').send(funcionarioPayload(empresa.id, overrides)).expect(400);
    });

    it('409 quando o CPF já pertence ao representante de uma empresa', async () => {
      const payloadEmpresa = empresaPayload();
      const empresa = (await t.api().post('/empresas').send(payloadEmpresa).expect(201)).body;
      const res = await t
        .api()
        .post('/funcionarios')
        .send(funcionarioPayload(empresa.id, { cpf: payloadEmpresa.cpfRepresentante }))
        .expect(409);
      expect(res.body.message).toBe('CPF já cadastrado');
    });

    it('409 quando o e-mail já pertence a uma empresa', async () => {
      const payloadEmpresa = empresaPayload();
      const empresa = (await t.api().post('/empresas').send(payloadEmpresa).expect(201)).body;
      await t
        .api()
        .post('/funcionarios')
        .send(funcionarioPayload(empresa.id, { email: payloadEmpresa.email }))
        .expect(409);
    });

    it('409 para empresa cujo CPF do representante já é de um funcionário', async () => {
      const empresa = await criarEmpresa(t);
      const funcionario = (await t.api().post('/funcionarios').send(funcionarioPayload(empresa.id)).expect(201)).body;
      await t.api().post('/empresas').send(empresaPayload({ cpfRepresentante: funcionario.cpf })).expect(409);
    });

    it('409 para CPF de funcionário duplicado', async () => {
      const empresa = await criarEmpresa(t);
      const payload = funcionarioPayload(empresa.id);
      await t.api().post('/funcionarios').send(payload).expect(201);
      await t.api().post('/funcionarios').send(funcionarioPayload(empresa.id, { cpf: payload.cpf })).expect(409);
    });
  });
});
