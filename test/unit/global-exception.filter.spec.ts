import { ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BusinessRuleViolationError,
  ConflictError,
  ExternalServiceUnavailableError,
  ForbiddenOperationError,
  InvalidInputError,
  NotFoundError,
} from '../../src/common/errors/domain.errors';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

function capturar(exception: unknown): { status: number; body: unknown } {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return { status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0] };
}

describe('GlobalExceptionFilter', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));
  afterAll(() => jest.restoreAllMocks());

  it.each([
    [new InvalidInputError('inválido'), 400],
    [new ForbiddenOperationError('proibido'), 403],
    [new NotFoundError('não encontrado'), 404],
    [new ConflictError('CNPJ já cadastrado'), 409],
    [new BusinessRuleViolationError('empresa não habilitada'), 422],
    [new ExternalServiceUnavailableError('Dataprev indisponível'), 502],
  ])('%p -> HTTP %p no formato { message, details }', (erro, status) => {
    expect(capturar(erro)).toEqual({ status, body: { message: erro.message, details: null } });
  });

  it('inclui details quando o erro os possui', () => {
    expect(capturar(new ConflictError('CPF já cadastrado', { campos: ['cpf'] })).body).toEqual({
      message: 'CPF já cadastrado',
      details: { campos: ['cpf'] },
    });
  });

  it('erro desconhecido -> 500 genérico, sem vazar detalhes internos', () => {
    const { status, body } = capturar(new Error('connection refused at 10.0.0.5:5432 (senha=xyz)'));
    expect(status).toBe(500);
    expect(body).toEqual({ message: 'Erro interno do servidor', details: null });
  });

  it('violação de UNIQUE no banco (corrida) -> 409', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    expect(capturar(erro).status).toBe(409);
  });

  it('outros erros do Prisma -> 500', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('x', { code: 'P1001', clientVersion: 'test' });
    expect(capturar(erro)).toEqual({ status: 500, body: { message: 'Erro interno do servidor', details: null } });
  });

  it('HttpException do framework mantém o status', () => {
    expect(capturar(new NotFoundException('Cannot GET /xyz')).status).toBe(404);
    expect(capturar(new BadRequestException('x')).status).toBe(400);
  });

  it('JSON malformado (body-parser) -> 400', () => {
    const erro = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 });
    expect(capturar(erro).status).toBe(400);
  });
});
