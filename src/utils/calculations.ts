/**
 * Pure business calculation rules for FabrilERP:
 * - Technical sheet (Ficha Técnica) costing
 * - Production order requirements & actual unit cost calculations
 * - Variance and waste/loss analysis
 * - Atomic financial installment partitioning
 */

export interface InsumoCostData {
  materiaPrimaId: string;
  quantidade: number;
  precoCustoCentavos: number;
}

export function calculateFichaCost(
  insumos: InsumoCostData[],
  rendimento: number,
  perdaPercentual: number = 0,
  maoDeObraCentavos: number = 0,
  energiaOutrosCentavos: number = 0
): {
  custoTotalReceitaCentavos: number;
  custoUnitarioPadraoCentavos: number;
  custoInsumosCentavos: number;
  custoInsumosComPerdaCentavos: number;
} {
  const rend = rendimento > 0 ? rendimento : 1;
  const perdaFator = 1 + (Math.max(0, perdaPercentual) / 100);

  const custoInsumosCentavos = insumos.reduce((sum, item) => {
    return sum + Math.round(item.quantidade * item.precoCustoCentavos);
  }, 0);

  const custoInsumosComPerdaCentavos = Math.round(custoInsumosCentavos * perdaFator);
  const custoTotalReceitaCentavos = custoInsumosComPerdaCentavos + maoDeObraCentavos + energiaOutrosCentavos;
  const custoUnitarioPadraoCentavos = Math.round(custoTotalReceitaCentavos / rend);

  return {
    custoTotalReceitaCentavos,
    custoUnitarioPadraoCentavos,
    custoInsumosCentavos,
    custoInsumosComPerdaCentavos,
  };
}

export function calculateProductionRequirements(
  fichaInsumos: Array<{ materiaPrimaId: string; quantidade: number }>,
  fichaRendimento: number,
  quantidadeOrdem: number
): Array<{ materiaPrimaId: string; quantidadeNecessaria: number }> {
  const rend = fichaRendimento > 0 ? fichaRendimento : 1;
  const multiplier = quantidadeOrdem / rend;

  return fichaInsumos.map((item) => ({
    materiaPrimaId: item.materiaPrimaId,
    quantidadeNecessaria: parseFloat((item.quantidade * multiplier).toFixed(3)),
  }));
}

export function calculateRealProductionUnitCost(
  insumosConsumidos: Array<{ quantidadeReal: number; custoTotalCentavos: number }>,
  custosAdicionais: {
    maoDeObraCentavos?: number;
    energiaCentavos?: number;
    embalagemCentavos?: number;
    outrosCentavos?: number;
  },
  quantidadeProduzida: number
): {
  totalInsumosCentavos: number;
  totalAdicionaisCentavos: number;
  custoTotalOrdemCentavos: number;
  custoUnitarioRealCentavos: number;
} {
  const qtd = quantidadeProduzida > 0 ? quantidadeProduzida : 1;
  const totalInsumosCentavos = insumosConsumidos.reduce((acc, curr) => acc + curr.custoTotalCentavos, 0);

  const totalAdicionaisCentavos =
    (custosAdicionais.maoDeObraCentavos || 0) +
    (custosAdicionais.energiaCentavos || 0) +
    (custosAdicionais.embalagemCentavos || 0) +
    (custosAdicionais.outrosCentavos || 0);

  const custoTotalOrdemCentavos = totalInsumosCentavos + totalAdicionaisCentavos;
  const custoUnitarioRealCentavos = Math.round(custoTotalOrdemCentavos / qtd);

  return {
    totalInsumosCentavos,
    totalAdicionaisCentavos,
    custoTotalOrdemCentavos,
    custoUnitarioRealCentavos,
  };
}

export function calculateLossVariance(
  previsto: number,
  real: number
): {
  diferenca: number;
  percentual: number;
  temDesperdicio: boolean;
} {
  const diferenca = parseFloat((real - previsto).toFixed(3));
  const percentual = previsto > 0 ? parseFloat(((diferenca / previsto) * 100).toFixed(2)) : 0;
  return {
    diferenca,
    percentual,
    temDesperdicio: diferenca > 0,
  };
}

export function splitInstallments(
  totalCentavos: number,
  numeroParcelas: number,
  dataPrimeiroVencimento: string,
  diasEntreParcelas: number = 30
): Array<{
  parcelaNumero: number;
  valorCentavos: number;
  dataVencimento: string;
}> {
  const n = Math.max(1, numeroParcelas);
  const baseValue = Math.floor(totalCentavos / n);
  const remainder = totalCentavos - (baseValue * n);

  const [y, m, d] = dataPrimeiroVencimento.split('-').map(Number);
  const installments = [];

  for (let i = 1; i <= n; i++) {
    // Distribute remainder on the first installment so total matches exactly
    const valorCentavos = i === 1 ? baseValue + remainder : baseValue;
    
    // Calculate date for this installment
    const dueDate = new Date(y, m - 1, d);
    dueDate.setDate(dueDate.getDate() + (i - 1) * diasEntreParcelas);
    const dateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    installments.push({
      parcelaNumero: i,
      valorCentavos,
      dataVencimento: dateStr,
    });
  }

  return installments;
}
