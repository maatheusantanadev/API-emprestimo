import { scoreMinimoParaSalario, scoreSuficiente } from '../../src/modules/emprestimos/domain/score-policy';

describe('política de score por faixa salarial', () => {
  it.each([
    [1000, 400],
    [2000, 400],
    [2000.01, 500],
    [4000, 500],
    [4000.01, 600],
    [8000, 600],
    [8000.01, 700],
    [12000, 700],
    [12000.01, 800],
    [50000, 800],
  ])('salário R$ %p exige score mínimo %p', (salario, minimo) => {
    expect(scoreMinimoParaSalario(salario)).toBe(minimo);
  });

  it('score igual ao mínimo é suficiente; um ponto abaixo não é', () => {
    expect(scoreSuficiente(600, 5000)).toBe(true);
    expect(scoreSuficiente(599, 5000)).toBe(false);
  });

  it('scores determinísticos do mock', () => {
    expect(scoreSuficiente(300, 1000)).toBe(false); // CPF final 00
    expect(scoreSuficiente(500, 3000)).toBe(true); // CPF final 50
    expect(scoreSuficiente(650, 9000)).toBe(false); // demais CPFs
    expect(scoreSuficiente(900, 20000)).toBe(true); // CPF final 99
  });
});
