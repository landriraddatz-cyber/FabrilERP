import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFichaCost,
  calculateProductionRequirements,
  calculateRealProductionUnitCost,
  calculateLossVariance,
  splitInstallments,
} from './calculations';

test('calculateFichaCost computes technical sheet cost accurately with loss and overheads', () => {
  // Recipe yields 10 units
  // Insumo A: 2kg @ R$ 5,00 (500 centavos) = 1000 centavos
  // Insumo B: 1kg @ R$ 10,00 (1000 centavos) = 1000 centavos
  // Subtotal raw = 2000 centavos
  // Loss = 10% -> 2000 * 1.10 = 2200 centavos
  // Labor = 300 centavos, Overhead = 100 centavos
  // Total batch = 2200 + 300 + 100 = 2600 centavos
  // Unit standard cost = 2600 / 10 = 260 centavos (R$ 2,60)
  const insumos = [
    { materiaPrimaId: 'mp-1', quantidade: 2, precoCustoCentavos: 500 },
    { materiaPrimaId: 'mp-2', quantidade: 1, precoCustoCentavos: 1000 },
  ];

  const result = calculateFichaCost(insumos, 10, 10, 300, 100);

  assert.equal(result.custoInsumosCentavos, 2000);
  assert.equal(result.custoInsumosComPerdaCentavos, 2200);
  assert.equal(result.custoTotalReceitaCentavos, 2600);
  assert.equal(result.custoUnitarioPadraoCentavos, 260);
});

test('calculateProductionRequirements scales raw materials linearly by batch multiplier', () => {
  const recipeInsumos = [
    { materiaPrimaId: 'mp-flour', quantidade: 5 },
    { materiaPrimaId: 'mp-sugar', quantidade: 2 },
  ];
  // Recipe yields 20 units, order wants 50 units (multiplier = 2.5)
  const reqs = calculateProductionRequirements(recipeInsumos, 20, 50);

  assert.equal(reqs.length, 2);
  assert.equal(reqs[0].quantidadeNecessaria, 12.5); // 5 * 2.5
  assert.equal(reqs[1].quantidadeNecessaria, 5);    // 2 * 2.5
});

test('calculateRealProductionUnitCost computes real unit cost from consumed items and extras', () => {
  const consumed = [
    { quantidadeReal: 10, custoTotalCentavos: 5000 },
    { quantidadeReal: 2, custoTotalCentavos: 2500 },
  ];
  const extras = {
    maoDeObraCentavos: 1500,
    energiaCentavos: 500,
    embalagemCentavos: 500,
    outrosCentavos: 0,
  };
  // Total insumos = 7500
  // Extras = 2500
  // Total order = 10000
  // Produced = 20 units -> 10000 / 20 = 500 centavos (R$ 5,00 each)
  const res = calculateRealProductionUnitCost(consumed, extras, 20);

  assert.equal(res.totalInsumosCentavos, 7500);
  assert.equal(res.totalAdicionaisCentavos, 2500);
  assert.equal(res.custoTotalOrdemCentavos, 10000);
  assert.equal(res.custoUnitarioRealCentavos, 500);
});

test('calculateLossVariance identifies overconsumption correctly', () => {
  const normal = calculateLossVariance(10, 10);
  assert.equal(normal.diferenca, 0);
  assert.equal(normal.temDesperdicio, false);

  const excess = calculateLossVariance(10, 12);
  assert.equal(excess.diferenca, 2);
  assert.equal(excess.percentual, 20);
  assert.equal(excess.temDesperdicio, true);
});

test('splitInstallments divides centavos with zero rounding error', () => {
  // R$ 100,00 (10000 centavos) in 3 installments
  // 10000 / 3 = 3333 with remainder 1
  // Installment 1: 3334, Installment 2: 3333, Installment 3: 3333. Sum = 10000.
  const installments = splitInstallments(10000, 3, '2026-11-01', 30);

  assert.equal(installments.length, 3);
  assert.equal(installments[0].valorCentavos, 3334);
  assert.equal(installments[1].valorCentavos, 3333);
  assert.equal(installments[2].valorCentavos, 3333);

  const sum = installments.reduce((acc, curr) => acc + curr.valorCentavos, 0);
  assert.equal(sum, 10000);
});
