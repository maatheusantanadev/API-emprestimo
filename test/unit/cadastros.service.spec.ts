import { ConflictError, NotFoundError } from '../../src/common/errors/domain.errors';
import { PasswordHasher } from '../../src/common/security/password-hasher';
import { EmpresasService } from '../../src/modules/empresas/services/empresas.service';
import { FuncionariosService } from '../../src/modules/funcionarios/services/funcionarios.service';
import { UnicidadeService } from '../../src/modules/identificadores/services/unicidade.service';
import {
  InMemoryEmpresasRepository,
  InMemoryFuncionariosRepository,
  InMemoryIdentificadoresRepository,
} from '../support/in-memory-repositories';

const hasher: PasswordHasher = { hash: async (senha) => `hash(${senha})` };

const empresaInput = {
  cnpj: '12345678000100',
  razaoSocial: 'Tech Solutions Ltda',
  nomeRepresentante: 'João da Silva',
  cpfRepresentante: '12345678900',
  email: 'joao@techsolutions.com',
  senha: 'senhaSegura123',
};

describe('Cadastros (empresas e funcionários)', () => {
  let identificadores: InMemoryIdentificadoresRepository;
  let empresasRepo: InMemoryEmpresasRepository;
  let funcionariosRepo: InMemoryFuncionariosRepository;
  let empresas: EmpresasService;
  let funcionarios: FuncionariosService;

  beforeEach(() => {
    identificadores = new InMemoryIdentificadoresRepository();
    empresasRepo = new InMemoryEmpresasRepository(identificadores);
    funcionariosRepo = new InMemoryFuncionariosRepository(identificadores);
    const unicidade = new UnicidadeService(identificadores);
    empresas = new EmpresasService(empresasRepo, hasher, unicidade);
    funcionarios = new FuncionariosService(funcionariosRepo, hasher, empresas, unicidade);
  });

  const funcionarioInput = (empresaId: string, overrides = {}) => ({
    nomeCompleto: 'Maria Oliveira',
    cpf: '98765432100',
    email: 'maria@email.com',
    senha: 'senhaSegura123',
    salario: 5000,
    empresaId,
    ...overrides,
  });

  it('cria empresa guardando apenas o hash da senha e sem devolvê-lo', async () => {
    const empresa = await empresas.criar(empresaInput);
    expect(empresa).not.toHaveProperty('senha');
    expect(empresa).not.toHaveProperty('senhaHash');
    expect(empresasRepo.itens[0].senhaHash).toBe('hash(senhaSegura123)');
  });

  it.each([
    ['cnpj', { email: 'outro@x.com', cpfRepresentante: '11111111111' }, 'CNPJ já cadastrado'],
    ['cpfRepresentante', { cnpj: '99999999000199', email: 'outro@x.com' }, 'CPF já cadastrado'],
    ['email', { cnpj: '99999999000199', cpfRepresentante: '11111111111' }, 'E-mail já cadastrado'],
  ])('empresa com %s duplicado -> 409', async (campo, overrides, mensagem) => {
    await empresas.criar(empresaInput);
    const erro = await empresas.criar({ ...empresaInput, ...overrides }).catch((e) => e);
    expect(erro).toBeInstanceOf(ConflictError);
    expect(erro.message).toBe(mensagem);
    expect(erro.details).toEqual({ campos: [campo] });
  });

  it('funcionário em empresa inexistente -> 404', async () => {
    await expect(funcionarios.criar(funcionarioInput('nao-existe'))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('CPF do funcionário não pode ser igual ao CPF de um representante -> 409', async () => {
    const empresa = await empresas.criar(empresaInput);
    await expect(
      funcionarios.criar(funcionarioInput(empresa.id, { cpf: empresaInput.cpfRepresentante })),
    ).rejects.toThrow('CPF já cadastrado');
  });

  it('e-mail do funcionário não pode ser igual ao e-mail de uma empresa -> 409', async () => {
    const empresa = await empresas.criar(empresaInput);
    await expect(
      funcionarios.criar(funcionarioInput(empresa.id, { email: empresaInput.email })),
    ).rejects.toThrow('E-mail já cadastrado');
  });

  it('CPF do representante não pode ser igual ao CPF de um funcionário -> 409', async () => {
    const empresa = await empresas.criar(empresaInput);
    await funcionarios.criar(funcionarioInput(empresa.id));
    await expect(
      empresas.criar({ ...empresaInput, cnpj: '99999999000199', email: 'nova@x.com', cpfRepresentante: '98765432100' }),
    ).rejects.toThrow('CPF já cadastrado');
  });

  it('cria funcionário vinculado à empresa', async () => {
    const empresa = await empresas.criar(empresaInput);
    const funcionario = await funcionarios.criar(funcionarioInput(empresa.id));
    expect(funcionario).toMatchObject({ empresaId: empresa.id, salario: 5000, cpf: '98765432100' });
    expect(funcionario).not.toHaveProperty('senhaHash');
  });
});
