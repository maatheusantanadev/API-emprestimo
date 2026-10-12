import { ForbiddenOperationError, NotFoundError } from '../../src/common/errors/domain.errors';
import {
  AutorizacoesService,
  VALIDADE_AUTORIZACAO_MS,
} from '../../src/modules/autorizacoes/services/autorizacoes.service';
import { FuncionariosService } from '../../src/modules/funcionarios/services/funcionarios.service';
import { FakeClock } from '../support/fakes';
import { InMemoryAutorizacoesRepository } from '../support/in-memory-repositories';

const HORA = 60 * 60 * 1000;

describe('AutorizacoesService', () => {
  let clock: FakeClock;
  let repo: InMemoryAutorizacoesRepository;
  let funcionarios: { buscarOuFalhar: jest.Mock };
  let service: AutorizacoesService;

  beforeEach(() => {
    clock = new FakeClock();
    clock.set('2025-05-05T12:00:00Z');
    repo = new InMemoryAutorizacoesRepository();
    funcionarios = { buscarOuFalhar: jest.fn().mockResolvedValue({ id: 'f1' }) };
    service = new AutorizacoesService(repo, clock, funcionarios as unknown as FuncionariosService);
  });

  it('concede autorização válida por 24 horas', async () => {
    const autorizacao = await service.autorizar('f1');
    expect(autorizacao).toEqual({
      funcionarioId: 'f1',
      autorizado: true,
      expiraEm: new Date('2025-05-06T12:00:00Z'),
    });
    expect(VALIDADE_AUTORIZACAO_MS).toBe(24 * HORA);
  });

  it('funcionário inexistente -> NotFoundError', async () => {
    funcionarios.buscarOuFalhar.mockRejectedValue(new NotFoundError('Funcionário não encontrado'));
    await expect(service.autorizar('x')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.itens).toHaveLength(0);
  });

  it('sem autorização -> 403', async () => {
    await expect(service.exigirAutorizacaoAtiva('f1')).rejects.toBeInstanceOf(ForbiddenOperationError);
  });

  it('autorização ativa durante a janela de 24h', async () => {
    await service.autorizar('f1');
    clock.advance(24 * HORA - 1);
    await expect(service.exigirAutorizacaoAtiva('f1')).resolves.toBeUndefined();
  });

  it('autorização expira ao completar 24h', async () => {
    await service.autorizar('f1');
    clock.advance(24 * HORA);
    await expect(service.exigirAutorizacaoAtiva('f1')).rejects.toBeInstanceOf(ForbiddenOperationError);
  });

  it('nova chamada renova: nova janela de 24h a partir da renovação', async () => {
    await service.autorizar('f1');
    clock.advance(20 * HORA);
    const renovada = await service.autorizar('f1');
    expect(renovada.expiraEm).toEqual(new Date('2025-05-07T08:00:00Z'));

    clock.advance(10 * HORA); // 30h após a primeira, 10h após a renovação
    await expect(service.exigirAutorizacaoAtiva('f1')).resolves.toBeUndefined();
  });

  it('autorização é individual por funcionário', async () => {
    await service.autorizar('f1');
    await expect(service.exigirAutorizacaoAtiva('f2')).rejects.toBeInstanceOf(ForbiddenOperationError);
  });
});
