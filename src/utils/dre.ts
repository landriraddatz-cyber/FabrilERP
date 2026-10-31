/**
 * DRE (Demonstração do Resultado do Exercício) calculation engine
 * Adheres strictly to the accounting formulas specified in the prompt:
 * - Receita bruta = itens de pedidos faturados/entregues + lançamentos avulsos de grupo 'receita_venda'
 * - Deduções = descontos concedidos nos pedidos + contas de grupo 'deducao'
 * - Receita líquida = receita bruta - deduções
 * - CMV = soma(qtd * custo unitário gravado) + contas de grupo 'cmv'
 * - Lucro bruto = receita líquida - CMV
 * - Despesas com vendas = contas grupo 'despesa_venda'
 * - Despesas administrativas = contas grupo 'despesa_administrativa'
 * - Resultado financeiro = receitas financeiras - despesas financeiras
 * - Outras = outras receitas - outras despesas
 * - Resultado antes dos impostos = lucro bruto - despesas vendas - despesas adm + resultado financeiro + outras
 * - IRPJ e CSLL = contas grupo 'imposto_lucro'
 * - Lucro líquido = resultado antes impostos - IRPJ e CSLL
 */

import { Venda, ContaFinanceiraItem, PlanoConta, GrupoDRE } from '../types';

export type RegimeDespesas = 'competencia' | 'pagamento';

export interface DREResult {
  receitaBrutaVendasCentavos: number;
  deducoesCentavos: number;
  receitaLiquidaCentavos: number;
  cmvCentavos: number;
  lucroBrutoCentavos: number;
  despesasVendasCentavos: number;
  despesasAdministrativasCentavos: number;
  resultadoFinanceiroCentavos: number;
  receitasFinanceirasCentavos: number;
  despesasFinanceirasCentavos: number;
  outrasReceitasDespesasCentavos: number;
  resultadoAntesImpostosCentavos: number;
  impostoLucroCentavos: number;
  lucroLiquidoCentavos: number;
  margemBrutaPercentual: number;
  margemLiquidaPercentual: number;

  // Breakdown by PlanoConta id
  detalhamentoPorConta: Record<
    string,
    {
      planoContaId: string;
      codigo: string;
      nome: string;
      grupoDRE: GrupoDRE;
      valorCentavos: number;
      lancamentos: ContaFinanceiraItem[];
    }
  >;

  // Contas a pagar sem plano atribuído (aviso amarelo)
  contasSemPlano: ContaFinanceiraItem[];
}

export function calcularDRE(
  vendas: Venda[],
  contas: ContaFinanceiraItem[],
  planoContas: PlanoConta[],
  dataInicioIso: string, // YYYY-MM-DD
  dataFimIso: string,    // YYYY-MM-DD
  regime: RegimeDespesas = 'competencia'
): DREResult {
  const planoMap = new Map<string, PlanoConta>();
  planoContas.forEach((p) => planoMap.set(p.id, p));

  const inicioMes = dataInicioIso.substring(0, 7);
  const fimMes = dataFimIso.substring(0, 7);

  // 1. Vendas no período (data do pedido)
  // Status faturado ou entregue
  const pedidosNoPeriodo = vendas.filter((v) => {
    if (v.excluido || v.tipo !== 'pedido') return false;
    if (v.status !== 'faturado' && v.status !== 'entregue') return false;
    const dataVenda = v.dataCriacao.substring(0, 10);
    return dataVenda >= dataInicioIso && dataVenda <= dataFimIso;
  });

  let receitaBrutaVendasCentavos = 0;
  let deducoesItensCentavos = 0;
  let cmvCentavos = 0;

  for (const ped of pedidosNoPeriodo) {
    deducoesItensCentavos += ped.descontoCentavos || 0;

    for (const item of ped.itens) {
      receitaBrutaVendasCentavos += Math.round(item.quantidade * item.precoUnitarioCentavos);
      const custoUnit = item.custoUnitarioGravadoCentavos ?? 0;
      cmvCentavos += Math.round(item.quantidade * custoUnit);
    }
  }

  // 2. Contas Financeiras no período
  // FORA do DRE:
  // - contas de compra de matéria-prima (referenciaTipo === 'compra')
  // - contas de venda de pedidos (referenciaTipo === 'venda') - já entram pelas vendas
  // - canceladas ou excluídas
  // - grupos 'nenhum' e 'custo_producao'
  const contasSemPlano: ContaFinanceiraItem[] = [];
  const detalhamentoPorConta: DREResult['detalhamentoPorConta'] = {};

  let deducoesContasCentavos = 0;
  let cmvContasCentavos = 0;
  let despesasVendasCentavos = 0;
  let despesasAdministrativasCentavos = 0;
  let receitasFinanceirasCentavos = 0;
  let despesasFinanceirasCentavos = 0;
  let outrasReceitasCentavos = 0;
  let outrasDespesasCentavos = 0;
  let impostoLucroCentavos = 0;
  let receitaVendaAvulsaCentavos = 0;

  for (const conta of contas) {
    if (conta.excluido || conta.status === 'cancelado') continue;
    if (conta.referenciaTipo === 'compra' || conta.referenciaTipo === 'venda') continue;

    // Verificar data de enquadramento
    let dataReferencia = '';
    if (regime === 'pagamento') {
      if (conta.status !== 'pago' || !conta.dataPagamento) continue;
      dataReferencia = conta.dataPagamento;
      if (dataReferencia < dataInicioIso || dataReferencia > dataFimIso) continue;
    } else {
      // Competência
      const mesComp = conta.mesCompetencia || (conta.dataVencimento ? conta.dataVencimento.substring(0, 7) : '');
      if (!mesComp || mesComp < inicioMes || mesComp > fimMes) continue;
    }

    if (!conta.planoContaId) {
      if (conta.tipo === 'pagar') {
        contasSemPlano.push(conta);
      }
      continue;
    }

    const plano = planoMap.get(conta.planoContaId);
    if (!plano || plano.grupoDRE === 'nenhum' || plano.grupoDRE === 'custo_producao') {
      continue;
    }

    // Acumular detalhamento
    if (!detalhamentoPorConta[plano.id]) {
      detalhamentoPorConta[plano.id] = {
        planoContaId: plano.id,
        codigo: plano.codigo,
        nome: plano.nome,
        grupoDRE: plano.grupoDRE,
        valorCentavos: 0,
        lancamentos: [],
      };
    }
    detalhamentoPorConta[plano.id].valorCentavos += conta.valorCentavos;
    detalhamentoPorConta[plano.id].lancamentos.push(conta);

    // Distribuir nos grupos DRE
    switch (plano.grupoDRE) {
      case 'receita_venda':
        receitaVendaAvulsaCentavos += conta.valorCentavos;
        break;
      case 'deducao':
        deducoesContasCentavos += conta.valorCentavos;
        break;
      case 'cmv':
        cmvContasCentavos += conta.valorCentavos;
        break;
      case 'despesa_venda':
        despesasVendasCentavos += conta.valorCentavos;
        break;
      case 'despesa_administrativa':
        despesasAdministrativasCentavos += conta.valorCentavos;
        break;
      case 'despesa_financeira':
        despesasFinanceirasCentavos += conta.valorCentavos;
        break;
      case 'receita_financeira':
        receitasFinanceirasCentavos += conta.valorCentavos;
        break;
      case 'outras':
        if (conta.tipo === 'receber') outrasReceitasCentavos += conta.valorCentavos;
        else outrasDespesasCentavos += conta.valorCentavos;
        break;
      case 'imposto_lucro':
        impostoLucroCentavos += conta.valorCentavos;
        break;
    }
  }

  // Consolidação dos Totais
  receitaBrutaVendasCentavos += receitaVendaAvulsaCentavos;
  const deducoesCentavos = deducoesItensCentavos + deducoesContasCentavos;
  const receitaLiquidaCentavos = receitaBrutaVendasCentavos - deducoesCentavos;
  const cmvTotalCentavos = cmvCentavos + cmvContasCentavos;
  const lucroBrutoCentavos = receitaLiquidaCentavos - cmvTotalCentavos;

  const resultadoFinanceiroCentavos = receitasFinanceirasCentavos - despesasFinanceirasCentavos;
  const outrasReceitasDespesasCentavos = outrasReceitasCentavos - outrasDespesasCentavos;

  const resultadoAntesImpostosCentavos =
    lucroBrutoCentavos -
    despesasVendasCentavos -
    despesasAdministrativasCentavos +
    resultadoFinanceiroCentavos +
    outrasReceitasDespesasCentavos;

  const lucroLiquidoCentavos = resultadoAntesImpostosCentavos - impostoLucroCentavos;

  const margemBrutaPercentual =
    receitaLiquidaCentavos > 0
      ? parseFloat(((lucroBrutoCentavos / receitaLiquidaCentavos) * 100).toFixed(1))
      : 0;

  const margemLiquidaPercentual =
    receitaLiquidaCentavos > 0
      ? parseFloat(((lucroLiquidoCentavos / receitaLiquidaCentavos) * 100).toFixed(1))
      : 0;

  return {
    receitaBrutaVendasCentavos,
    deducoesCentavos,
    receitaLiquidaCentavos,
    cmvCentavos: cmvTotalCentavos,
    lucroBrutoCentavos,
    despesasVendasCentavos,
    despesasAdministrativasCentavos,
    resultadoFinanceiroCentavos,
    receitasFinanceirasCentavos,
    despesasFinanceirasCentavos,
    outrasReceitasDespesasCentavos,
    resultadoAntesImpostosCentavos,
    impostoLucroCentavos,
    lucroLiquidoCentavos,
    margemBrutaPercentual,
    margemLiquidaPercentual,
    detalhamentoPorConta,
    contasSemPlano,
  };
}
