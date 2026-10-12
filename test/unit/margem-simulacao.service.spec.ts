import {
  BusinessRuleViolationError,
  ForbiddenOperationError,
  InvalidInputError,
} from '../../src/common/errors/domain.errors';
import { AutorizacoesService } from '../../src/modules/autorizacoes/services/autorizacoes.service';
import { EConsignadoService } from '../../src/modules/e-consignado/services/e-consignado.service';
import { SimulacaoService } from '../../src/modules/emprestimos/services/simulacao.service';
import { FuncionarioComEmpresa } from '../../src/modules/funcionarios/entities/funcionario.entity';
import { FuncionariosService } from '../../src/modules/funcionarios/services/funcionarios.service';
import { MargemService } from '../../src/modules/margem/services/margem.service';
import { FakeDataprevClient } from '../support/fakes';
import { InMemoryEmprestimosRepository, novoEmprestimo } from '../support/in-memory-repositories';

const funcionario: FuncionarioComEmpresa = {
  id: 'f1',
  nomeCompleto: 'Maria',
  cpf: '98765432101',
  email: 'maria@email.com',
  salario: 5000,
  empresaId: 'e1',
  empresaCnpj: '12345678000100',
  createdAt: new Date(),
};

describe('MargemService e SimulacaoService', () => {
  let repo: InMemoryEmprestimosRepository;
  let dataprev: FakeDataprevClient;
  let autorizacoes: { exigirAutorizacaoAtiva: jest.Mock };
  let funcionarios: { buscarOuFalhar: jest.Mock; buscarComEmpresaOuFalhar: jest.Mock };
  let margem: MargemService;
  let simulacao: SimulacaoService;

  beforeEach(() => {
    repo = new InMemoryEmprestimosRepository();
    dataprev = new FakeDataprevClient();
    autorizacoes = { exigirAutorizacaoAtiva: jest.fn().mockResolvedValue(undefined) };
    funcionarios = {
      buscarOuFalhar: jest.fn().mockResolvedValue(funcionario),
      buscarComEmpresaOuFalhar: jest.fn().mockResolvedValue(funcionario),
    };
    margem = new MargemService(
      repo,
      funcionarios as unknown as FuncionariosService,
      autorizacoes as unknown as AutorizacoesService,
      new EConsignadoService(dataprev),
    );
    simulacao = new SimulacaoService(
      funcionarios as unknown as FuncionariosService,
      autorizacoes as unknown as AutorizacoesService,
      margem,
    );
  });

  describe('consultar margem', () => {
    it('calcula a margem com os empréstimos ativos (exemplo do enunciado)', async () => {
      await repo.create(novoEmprestimo({ funcionarioId: 'f1', valorSolicitado: 500, numeroParcelas: 2, valorParcela: 250 }));
      expect(await margem.consultar('f1')).toEqual({
        funcionarioId: 'f1',
        salario: 5000,
        margemTotal: 1750,
        margemUtilizada: 250,
        margemDisponivel: 1500,
      });
    });

    it('verifica a empresa no Dataprev', async () => {
      await margem.consultar('f1');
      expect(dataprev.chamadas).toEqual(['empresa:12345678000100']);
    });

    it('empresa não habilitada -> 422', async () => {
      funcionarios.buscarComEmpresaOuFalhar.mockResolvedValue({ ...funcionario, empresaCnpj: '11111111110000' });
      await expect(margem.consultar('f1')).rejects.toBeInstanceOf(BusinessRuleViolationError);
    });

    it('autorização é verificada antes de consultar o Dataprev', async () => {
      autorizacoes.exigirAutorizacaoAtiva.mockRejectedValue(new ForbiddenOperationError('x'));
      await expect(margem.consultar('f1')).rejects.toBeInstanceOf(ForbiddenOperationError);
      expect(dataprev.chamadas).toHaveLength(0);
    });
  });

  describe('simular', () => {
    it('retorna as opções de 1 a 4 parcelas', async () => {
      expect(await simulacao.simular({ funcionarioId: 'f1', valorSolicitado: 1000 })).toEqual({
        funcionarioId: 'f1',
        valorSolicitado: 1000,
        margemDisponivel: 1750,
        parcelas: [
          { numeroParcelas: 1, valorParcela: 1000 },
          { numeroParcelas: 2, valorParcela: 500 },
          { numeroParcelas: 3, valorParcela: 333.33 },
          { numeroParcelas: 4, valorParcela: 250 },
        ],
      });
    });

    it('não consulta o Dataprev', async () => {
      await simulacao.simular({ funcionarioId: 'f1', valorSolicitado: 1000 });
      expect(dataprev.chamadas).toHaveLength(0);
    });

    it('valor acima da margem -> InvalidInputError (400)', async () => {
      await expect(simulacao.simular({ funcionarioId: 'f1', valorSolicitado: 1750.01 })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('considera os empréstimos ativos na margem', async () => {
      await repo.create(novoEmprestimo({ funcionarioId: 'f1', valorParcela: 1700 }));
      await expect(simulacao.simular({ funcionarioId: 'f1', valorSolicitado: 51 })).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      await expect(simulacao.simular({ funcionarioId: 'f1', valorSolicitado: 50 })).resolves.toMatchObject({
        margemDisponivel: 50,
      });
    });

    it('sem autorização -> 403', async () => {
      autorizacoes.exigirAutorizacaoAtiva.mockRejectedValue(new ForbiddenOperationError('x'));
      await expect(simulacao.simular({ funcionarioId: 'f1', valorSolicitado: 10 })).rejects.toBeInstanceOf(
        ForbiddenOperationError,
      );
    });
  });
});
