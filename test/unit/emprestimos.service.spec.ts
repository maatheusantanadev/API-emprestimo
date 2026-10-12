import { KeyedMutex } from '../../src/common/concurrency/keyed-mutex';
import {
  BusinessRuleViolationError,
  ExternalServiceUnavailableError,
  ForbiddenOperationError,
  NotFoundError,
} from '../../src/common/errors/domain.errors';
import { AutorizacoesService } from '../../src/modules/autorizacoes/services/autorizacoes.service';
import { EConsignadoService } from '../../src/modules/e-consignado/services/e-consignado.service';
import { MOTIVOS_REJEICAO } from '../../src/modules/emprestimos/domain/avaliacao-credito';
import { EmprestimosService } from '../../src/modules/emprestimos/services/emprestimos.service';
import { FuncionarioComEmpresa } from '../../src/modules/funcionarios/entities/funcionario.entity';
import { FuncionariosService } from '../../src/modules/funcionarios/services/funcionarios.service';
import { FakeClock, FakeDataprevClient, FakePaymentGateway } from '../support/fakes';
import { InMemoryEmprestimosRepository, novoEmprestimo } from '../support/in-memory-repositories';

const funcionario: FuncionarioComEmpresa = {
  id: 'funcionario-1',
  nomeCompleto: 'Maria Oliveira',
  cpf: '98765432101', // score padrão 650
  email: 'maria@email.com',
  salario: 5000, // score mínimo 600, margem total 1750
  empresaId: 'empresa-1',
  empresaCnpj: '12345678000100',
  createdAt: new Date(),
};

describe('EmprestimosService.solicitar', () => {
  let repo: InMemoryEmprestimosRepository;
  let dataprev: FakeDataprevClient;
  let gateway: FakePaymentGateway;
  let clock: FakeClock;
  let autorizacoes: { exigirAutorizacaoAtiva: jest.Mock };
  let funcionarios: { buscarComEmpresaOuFalhar: jest.Mock };
  let service: EmprestimosService;

  const solicitar = (valorSolicitado: number, numeroParcelas = 1) =>
    service.solicitar({ funcionarioId: funcionario.id, valorSolicitado, numeroParcelas });

  beforeEach(() => {
    repo = new InMemoryEmprestimosRepository();
    dataprev = new FakeDataprevClient();
    gateway = new FakePaymentGateway();
    clock = new FakeClock();
    autorizacoes = { exigirAutorizacaoAtiva: jest.fn().mockResolvedValue(undefined) };
    funcionarios = { buscarComEmpresaOuFalhar: jest.fn().mockResolvedValue(funcionario) };

    service = new EmprestimosService(
      repo,
      gateway,
      clock,
      funcionarios as unknown as FuncionariosService,
      autorizacoes as unknown as AutorizacoesService,
      new EConsignadoService(dataprev),
      new KeyedMutex(),
    );
  });

  describe('fluxo aprovado', () => {
    it('salva como aprovado e processa o pagamento com valor e CPF', async () => {
      const emprestimo = await solicitar(1000, 4);

      expect(emprestimo).toMatchObject({
        funcionarioId: funcionario.id,
        valorSolicitado: 1000,
        numeroParcelas: 4,
        valorParcela: 250,
        status: 'aprovado',
        motivoRejeicao: null,
        gatewayTransacaoId: 'tx-fake',
      });
      expect(gateway.chamadas).toEqual([{ valor: 1000, funcionarioCpf: funcionario.cpf }]);
      expect(repo.itens).toHaveLength(1);
    });

    it('gera as parcelas com vencimentos mensais a partir da data da solicitação', async () => {
      clock.set('2025-05-05T12:00:00Z');
      const emprestimo = await solicitar(1000, 4);

      expect(emprestimo.createdAt.toISOString()).toBe('2025-05-05T12:00:00.000Z');
      expect(emprestimo.parcelas).toEqual([
        { numero: 1, valor: 250, dataVencimento: '2025-06-05' },
        { numero: 2, valor: 250, dataVencimento: '2025-07-05' },
        { numero: 3, valor: 250, dataVencimento: '2025-08-05' },
        { numero: 4, valor: 250, dataVencimento: '2025-09-05' },
      ]);
    });
  });

  describe('regras de crédito (salvo como rejeitado, sem chamar o gateway)', () => {
    it('score insuficiente', async () => {
      dataprev.scores.set(funcionario.cpf, 599);
      const emprestimo = await solicitar(100);

      expect(emprestimo).toMatchObject({
        status: 'rejeitado',
        motivoRejeicao: MOTIVOS_REJEICAO.SCORE_INSUFICIENTE,
      });
      expect(gateway.chamadas).toHaveLength(0);
    });

    it('score exatamente no mínimo da faixa é aprovado', async () => {
      dataprev.scores.set(funcionario.cpf, 600);
      expect((await solicitar(100)).status).toBe('aprovado');
    });

    it('valor acima da margem disponível', async () => {
      const emprestimo = await solicitar(1750.01);
      expect(emprestimo).toMatchObject({
        status: 'rejeitado',
        motivoRejeicao: MOTIVOS_REJEICAO.MARGEM_INSUFICIENTE,
      });
      expect(gateway.chamadas).toHaveLength(0);
    });

    it('a margem considera apenas parcelas de empréstimos aprovados', async () => {
      await repo.create(novoEmprestimo({ funcionarioId: funcionario.id, valorParcela: 1000 }));
      await repo.create(novoEmprestimo({ funcionarioId: funcionario.id, valorParcela: 500, status: 'rejeitado', motivoRejeicao: 'x' }));
      await repo.create(novoEmprestimo({ funcionarioId: funcionario.id, valorParcela: 500, status: 'erro_processamento' }));

      // margem disponível = 1750 - 1000 = 750
      expect((await solicitar(750.01)).status).toBe('rejeitado');
      expect((await solicitar(750)).status).toBe('aprovado');
    });

    it('limite de 3 empréstimos ativos', async () => {
      for (let i = 0; i < 3; i++) {
        await repo.create(novoEmprestimo({ funcionarioId: funcionario.id, valorParcela: 10 }));
      }
      const emprestimo = await solicitar(10);
      expect(emprestimo).toMatchObject({
        status: 'rejeitado',
        motivoRejeicao: MOTIVOS_REJEICAO.LIMITE_ATIVOS,
      });
    });

    it('empréstimos não aprovados não contam para o limite', async () => {
      await repo.create(novoEmprestimo({ funcionarioId: funcionario.id }));
      await repo.create(novoEmprestimo({ funcionarioId: funcionario.id }));
      await repo.create(novoEmprestimo({ funcionarioId: funcionario.id, status: 'erro_processamento' }));
      expect((await solicitar(10)).status).toBe('aprovado');
    });

    it('solicitações simultâneas não ultrapassam o limite de ativos', async () => {
      const resultados = await Promise.all([1, 2, 3, 4, 5].map(() => solicitar(10)));
      const aprovados = resultados.filter((e) => e.status === 'aprovado');
      expect(aprovados).toHaveLength(3);
    });
  });

  describe('resultado do gateway (sempre persiste)', () => {
    it('pagamento recusado -> rejeitado com motivo', async () => {
      gateway.resultado = { status: 'recusado', motivo: 'Saldo insuficiente' };
      expect(await solicitar(100)).toMatchObject({
        status: 'rejeitado',
        motivoRejeicao: MOTIVOS_REJEICAO.PAGAMENTO_RECUSADO,
      });
      expect(repo.itens).toHaveLength(1);
    });

    it('gateway indisponível -> erro_processamento (o empréstimo não é perdido)', async () => {
      gateway.resultado = { status: 'falha', motivo: 'HTTP 503' };
      expect(await solicitar(100)).toMatchObject({
        status: 'erro_processamento',
        motivoRejeicao: null,
      });
      expect(repo.itens).toHaveLength(1);
    });
  });

  describe('falhas que interrompem a operação (nada é salvo)', () => {
    it('Dataprev indisponível -> ExternalServiceUnavailableError', async () => {
      dataprev.indisponivel = true;
      await expect(solicitar(100)).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
      expect(repo.itens).toHaveLength(0);
      expect(gateway.chamadas).toHaveLength(0);
    });

    it('empresa não habilitada -> BusinessRuleViolationError, sem consultar score', async () => {
      funcionarios.buscarComEmpresaOuFalhar.mockResolvedValue({ ...funcionario, empresaCnpj: '12345678900000' });
      await expect(solicitar(100)).rejects.toBeInstanceOf(BusinessRuleViolationError);
      expect(dataprev.chamadas).toEqual(['empresa:12345678900000']);
      expect(repo.itens).toHaveLength(0);
    });

    it('sem autorização ativa -> ForbiddenOperationError, sem chamar o Dataprev', async () => {
      autorizacoes.exigirAutorizacaoAtiva.mockRejectedValue(new ForbiddenOperationError('sem autorização'));
      await expect(solicitar(100)).rejects.toBeInstanceOf(ForbiddenOperationError);
      expect(dataprev.chamadas).toHaveLength(0);
    });

    it('funcionário inexistente -> NotFoundError', async () => {
      funcionarios.buscarComEmpresaOuFalhar.mockRejectedValue(new NotFoundError('Funcionário não encontrado'));
      await expect(solicitar(100)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

describe('EmprestimosService consultas', () => {
  const repo = new InMemoryEmprestimosRepository();
  const service = new EmprestimosService(
    repo,
    new FakePaymentGateway(),
    new FakeClock(),
    {} as FuncionariosService,
    {} as AutorizacoesService,
    {} as EConsignadoService,
    new KeyedMutex(),
  );

  it('detalhar empréstimo inexistente -> NotFoundError', async () => {
    await expect(service.detalhar('nao-existe')).rejects.toThrow('Empréstimo não encontrado');
  });

  it('listar aplica os filtros', async () => {
    await repo.create(novoEmprestimo({ funcionarioId: 'a', status: 'aprovado' }));
    await repo.create(novoEmprestimo({ funcionarioId: 'a', status: 'rejeitado', motivoRejeicao: 'x' }));
    await repo.create(novoEmprestimo({ funcionarioId: 'b', status: 'aprovado' }));

    expect(await service.listar({ funcionarioId: 'a' })).toHaveLength(2);
    expect(await service.listar({ status: 'aprovado' })).toHaveLength(2);
    expect(await service.listar({ funcionarioId: 'a', status: 'rejeitado' })).toHaveLength(1);
  });
});
