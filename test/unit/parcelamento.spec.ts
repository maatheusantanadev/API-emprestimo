import { addMonthsToIsoDate } from '../../src/common/utils/dates';
import { calcularValorParcela, gerarParcelas } from '../../src/modules/emprestimos/domain/parcelamento';

describe('calcularValorParcela', () => {
  it.each([
    [1000, 1, 1000],
    [1000, 2, 500],
    [1000, 3, 333.33],
    [1000, 4, 250],
    [100, 3, 33.33],
    [0.05, 2, 0.03],
  ])('R$ %p em %px = R$ %p', (valor, parcelas, esperado) => {
    expect(calcularValorParcela(valor, parcelas)).toBe(esperado);
  });
});

describe('gerarParcelas', () => {
  it('todas as parcelas têm o mesmo valor, sem ajuste na última', () => {
    const parcelas = gerarParcelas(1000, 3, new Date('2025-05-05T12:00:00Z'));
    expect(parcelas.map((p) => p.valor)).toEqual([333.33, 333.33, 333.33]);
    expect(parcelas.map((p) => p.numero)).toEqual([1, 2, 3]);
  });

  it('parcela N vence N meses após a solicitação (exemplo do enunciado)', () => {
    const parcelas = gerarParcelas(1000, 4, new Date('2025-05-05T12:00:00Z'));
    expect(parcelas.map((p) => p.dataVencimento)).toEqual([
      '2025-06-05',
      '2025-07-05',
      '2025-08-05',
      '2025-09-05',
    ]);
  });

  it('usa o último dia do mês quando o dia não existe (dia de borda do enunciado)', () => {
    const parcelas = gerarParcelas(900, 3, new Date('2025-01-31T10:00:00Z'));
    expect(parcelas.map((p) => p.dataVencimento)).toEqual(['2025-02-28', '2025-03-31', '2025-04-30']);
  });
});

describe('addMonthsToIsoDate', () => {
  it('respeita ano bissexto', () => {
    expect(addMonthsToIsoDate(new Date('2024-01-31T00:00:00Z'), 1)).toBe('2024-02-29');
  });

  it('vira o ano', () => {
    expect(addMonthsToIsoDate(new Date('2025-11-30T00:00:00Z'), 3)).toBe('2026-02-28');
  });

  it('usa o dia em UTC, independente do horário', () => {
    expect(addMonthsToIsoDate(new Date('2025-05-05T23:59:59.999Z'), 1)).toBe('2025-06-05');
    expect(addMonthsToIsoDate(new Date('2025-05-05T00:00:00.000Z'), 1)).toBe('2025-06-05');
  });
});
