import {
  DadosAvaliacaoCredito,
  MOTIVOS_REJEICAO,
  avaliarCredito,
} from '../../src/modules/emprestimos/domain/avaliacao-credito';

const base: DadosAvaliacaoCredito = {
  salario: 5000,
  score: 650,
  valorSolicitado: 1000,
  margemDisponivel: 1750,
  quantidadeEmprestimosAtivos: 0,
};

describe('avaliarCredito', () => {
  it('aprova quando todas as regras passam', () => {
    expect(avaliarCredito(base)).toEqual({ aprovado: true });
  });

  it('rejeita por score insuficiente para a faixa salarial', () => {
    expect(avaliarCredito({ ...base, score: 599 })).toEqual({
      aprovado: false,
      motivo: MOTIVOS_REJEICAO.SCORE_INSUFICIENTE,
    });
  });

  it('rejeita quando o valor excede a margem disponível', () => {
    expect(avaliarCredito({ ...base, valorSolicitado: 1750.01 })).toEqual({
      aprovado: false,
      motivo: MOTIVOS_REJEICAO.MARGEM_INSUFICIENTE,
    });
  });

  it('aceita valor exatamente igual à margem', () => {
    expect(avaliarCredito({ ...base, valorSolicitado: 1750 })).toEqual({ aprovado: true });
  });

  it('rejeita com 3 empréstimos ativos e aceita com 2', () => {
    expect(avaliarCredito({ ...base, quantidadeEmprestimosAtivos: 3 })).toEqual({
      aprovado: false,
      motivo: MOTIVOS_REJEICAO.LIMITE_ATIVOS,
    });
    expect(avaliarCredito({ ...base, quantidadeEmprestimosAtivos: 2 })).toEqual({ aprovado: true });
  });

  it('avalia na ordem do contrato: score antes de margem antes de limite', () => {
    const tudoErrado = { ...base, score: 0, valorSolicitado: 99999, quantidadeEmprestimosAtivos: 3 };
    expect(avaliarCredito(tudoErrado)).toMatchObject({ motivo: MOTIVOS_REJEICAO.SCORE_INSUFICIENTE });
    expect(avaliarCredito({ ...tudoErrado, score: 900 })).toMatchObject({
      motivo: MOTIVOS_REJEICAO.MARGEM_INSUFICIENTE,
    });
  });
});
