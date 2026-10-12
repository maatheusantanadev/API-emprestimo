import { randomUUID } from 'node:crypto';
import { roundMoney } from '../../src/common/utils/money';
import {
  AutorizacaoConsulta,
  NovaAutorizacaoConsulta,
} from '../../src/modules/autorizacoes/entities/autorizacao.entity';
import { AutorizacoesRepository } from '../../src/modules/autorizacoes/repositories/autorizacoes.repository';
import { Empresa, NovaEmpresa } from '../../src/modules/empresas/entities/empresa.entity';
import { EmpresasRepository } from '../../src/modules/empresas/repositories/empresas.repository';
import {
  Emprestimo,
  FiltrosEmprestimo,
  NovoEmprestimo,
  ResumoEmprestimosAtivos,
} from '../../src/modules/emprestimos/entities/emprestimo.entity';
import { EmprestimosRepository } from '../../src/modules/emprestimos/repositories/emprestimos.repository';
import {
  Funcionario,
  FuncionarioComEmpresa,
  NovoFuncionario,
} from '../../src/modules/funcionarios/entities/funcionario.entity';
import { FuncionariosRepository } from '../../src/modules/funcionarios/repositories/funcionarios.repository';
import {
  Identificador,
  IdentificadoresRepository,
} from '../../src/modules/identificadores/repositories/identificadores.repository';

export class InMemoryIdentificadoresRepository implements IdentificadoresRepository {
  readonly itens: Identificador[] = [];

  async findExistentes(identificadores: Identificador[]): Promise<Identificador[]> {
    return this.itens.filter((i) =>
      identificadores.some((c) => c.tipo === i.tipo && c.valor === i.valor),
    );
  }
}

export class InMemoryEmpresasRepository implements EmpresasRepository {
  readonly itens: (Empresa & { senhaHash: string })[] = [];

  constructor(private readonly identificadores?: InMemoryIdentificadoresRepository) {}

  async create(data: NovaEmpresa): Promise<Empresa> {
    const empresa = { ...data, id: randomUUID(), createdAt: new Date() };
    this.itens.push(empresa);
    this.identificadores?.itens.push(
      { tipo: 'cnpj', valor: data.cnpj },
      { tipo: 'cpf', valor: data.cpfRepresentante },
      { tipo: 'email', valor: data.email },
    );
    const { senhaHash: _senhaHash, ...publica } = empresa;
    return publica;
  }

  async exists(id: string): Promise<boolean> {
    return this.itens.some((e) => e.id === id);
  }
}

export class InMemoryFuncionariosRepository implements FuncionariosRepository {
  readonly itens: (FuncionarioComEmpresa & { senhaHash: string })[] = [];

  constructor(private readonly identificadores?: InMemoryIdentificadoresRepository) {}

  async create(data: NovoFuncionario): Promise<Funcionario> {
    const funcionario = { ...data, id: randomUUID(), createdAt: new Date(), empresaCnpj: '' };
    this.itens.push(funcionario);
    this.identificadores?.itens.push(
      { tipo: 'cpf', valor: data.cpf },
      { tipo: 'email', valor: data.email },
    );
    const { senhaHash: _s, empresaCnpj: _c, ...publico } = funcionario;
    return publico;
  }

  async findById(id: string): Promise<Funcionario | null> {
    const f = this.itens.find((i) => i.id === id);
    if (!f) return null;
    const { senhaHash: _s, empresaCnpj: _c, ...publico } = f;
    return publico;
  }

  async findByIdComEmpresa(id: string): Promise<FuncionarioComEmpresa | null> {
    const f = this.itens.find((i) => i.id === id);
    if (!f) return null;
    const { senhaHash: _s, ...publico } = f;
    return publico;
  }
}

export class InMemoryAutorizacoesRepository implements AutorizacoesRepository {
  readonly itens: AutorizacaoConsulta[] = [];

  async create(data: NovaAutorizacaoConsulta): Promise<AutorizacaoConsulta> {
    const autorizacao = { ...data, id: randomUUID() };
    this.itens.push(autorizacao);
    return autorizacao;
  }

  async findAtiva(funcionarioId: string, agora: Date): Promise<AutorizacaoConsulta | null> {
    const ativas = this.itens
      .filter((a) => a.funcionarioId === funcionarioId && a.expiraEm.getTime() > agora.getTime())
      .sort((a, b) => b.expiraEm.getTime() - a.expiraEm.getTime());
    return ativas[0] ?? null;
  }
}

export class InMemoryEmprestimosRepository implements EmprestimosRepository {
  readonly itens: Emprestimo[] = [];

  async create(data: NovoEmprestimo): Promise<Emprestimo> {
    const emprestimo = { ...data, id: randomUUID() };
    this.itens.push(emprestimo);
    return emprestimo;
  }

  async findById(id: string): Promise<Emprestimo | null> {
    return this.itens.find((e) => e.id === id) ?? null;
  }

  async findMany(filtros: FiltrosEmprestimo): Promise<Emprestimo[]> {
    return this.itens
      .filter((e) => !filtros.funcionarioId || e.funcionarioId === filtros.funcionarioId)
      .filter((e) => !filtros.status || e.status === filtros.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async resumoAtivos(funcionarioId: string): Promise<ResumoEmprestimosAtivos> {
    const ativos = this.itens.filter((e) => e.funcionarioId === funcionarioId && e.status === 'aprovado');
    return {
      quantidade: ativos.length,
      somaParcelasMensais: roundMoney(ativos.reduce((soma, e) => soma + e.valorParcela, 0)),
    };
  }
}

/** Empréstimo pronto para semear o repositório em memória. */
export function novoEmprestimo(overrides: Partial<NovoEmprestimo> = {}): NovoEmprestimo {
  return {
    funcionarioId: 'funcionario-1',
    valorSolicitado: 100,
    numeroParcelas: 1,
    valorParcela: 100,
    status: 'aprovado',
    motivoRejeicao: null,
    gatewayTransacaoId: null,
    parcelas: [],
    createdAt: new Date(),
    ...overrides,
  };
}
