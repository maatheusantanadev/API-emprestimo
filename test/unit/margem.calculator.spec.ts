import { cabeNaMargem, calcularMargem } from '../../src/modules/margem/margem.calculator';

describe('calcularMargem', () => {
  it('margem total é 35% do salário (exemplo do enunciado)', () => {
    expect(calcularMargem(5000, 0)).toEqual({
      salario: 5000,
      margemTotal: 1750,
      margemUtilizada: 0,
      margemDisponivel: 1750,
    });
  });

  it('desconta as parcelas mensais dos empréstimos ativos', () => {
    // 1 empréstimo de R$ 500 em 2x -> parcela de R$ 250
    expect(calcularMargem(5000, 250)).toMatchObject({
      margemTotal: 1750,
      margemUtilizada: 250,
      margemDisponivel: 1500,
    });
  });

  it('não acumula erro de ponto flutuante', () => {
    const margem = calcularMargem(3333.33, 333.33);
    expect(margem.margemTotal).toBe(1166.67);
    expect(margem.margemDisponivel).toBe(833.34);
  });
});

describe('cabeNaMargem', () => {
  it.each([
    [1500, 1500, true],
    [1500.01, 1500, false],
    [0.01, 0.01, true],
    [100, 0, false],
  ])('valor %p com margem %p -> %p', (valor, margem, esperado) => {
    expect(cabeNaMargem(valor, margem)).toBe(esperado);
  });
});
