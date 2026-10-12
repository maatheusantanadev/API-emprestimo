import { TestApp } from './test-app';

let sequencia = 0;
const proximo = (digitos: number): string => String(++sequencia).padStart(digitos, '0');

/** CNPJ único com 14 dígitos; final "0000" = empresa NÃO habilitada no Dataprev. */
export const novoCnpj = (final = '0100'): string => `${proximo(6)}1234${final}`;
/** CPF único com 11 dígitos; o final define o score (00=300, 50=500, 99=900, demais=650). */
export const novoCpf = (final = '11'): string => `${proximo(6)}123${final}`;
export const novoEmail = (): string => `pessoa${proximo(6)}@teste.com`;

export const UUID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

export function empresaPayload(overrides: Record<string, unknown> = {}) {
  return {
    cnpj: novoCnpj(),
    razaoSocial: 'Tech Solutions Ltda',
    nomeRepresentante: 'João da Silva',
    cpfRepresentante: novoCpf(),
    email: novoEmail(),
    senha: 'senhaSegura123',
    ...overrides,
  };
}

export function funcionarioPayload(empresaId: string, overrides: Record<string, unknown> = {}) {
  return {
    nomeCompleto: 'Maria Oliveira',
    cpf: novoCpf(),
    email: novoEmail(),
    senha: 'senhaSegura123',
    salario: 5000,
    empresaId,
    ...overrides,
  };
}

export async function criarEmpresa(t: TestApp, overrides: Record<string, unknown> = {}) {
  const res = await t.api().post('/empresas').send(empresaPayload(overrides)).expect(201);
  return res.body as { id: string; cnpj: string };
}

export async function criarFuncionario(
  t: TestApp,
  opcoes: { empresa?: Record<string, unknown>; funcionario?: Record<string, unknown> } = {},
) {
  const empresa = await criarEmpresa(t, opcoes.empresa);
  const res = await t.api().post('/funcionarios').send(funcionarioPayload(empresa.id, opcoes.funcionario)).expect(201);
  return res.body as { id: string; cpf: string; salario: number; empresaId: string };
}

/** Funcionário já com autorização de consulta ativa. */
export async function criarFuncionarioAutorizado(
  t: TestApp,
  opcoes: { empresa?: Record<string, unknown>; funcionario?: Record<string, unknown> } = {},
) {
  const funcionario = await criarFuncionario(t, opcoes);
  await t.api().post(`/funcionarios/${funcionario.id}/autorizacao-consulta`).expect(200);
  return funcionario;
}
