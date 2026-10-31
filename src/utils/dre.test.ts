import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDRE } from './dre';
import { Venda, ContaFinanceiraItem, PlanoConta } from '../types';

test('Teste de Conferência Oficial do DRE (Fórmula do Prompt)', () => {
  // Test scenario required by prompt:
  // - Uma venda faturada de 10 unidades a R$ 20,00 (2000 centavos) com custo de R$ 12,00 (1200 centavos) por unidade.
  // - Uma conta a pagar de aluguel de R$ 300,00 (30000 centavos) no mesmo mês.
  // O DRE desse mês deve mostrar:
  // Receita bruta: 200,00 (20000 centavos)
  // CMV: 120,00 (12000 centavos)
  // Lucro bruto: 80,00 (8000 centavos)
  // Despesas administrativas: 300,00 (30000 centavos)
  // Lucro líquido: -220,00 (-22000 centavos)

  const planoContas: PlanoConta[] = [
    {
      id: 'pc-vendas-produtos',
      codigo: '1.01',
      nome: 'Vendas de produtos',
      tipo: 'receita',
      grupoDRE: 'receita_venda',
      excluido: false,
      dataCriacao: '2026-10-01',
      dataAlteracao: '2026-10-01',
    },
    {
      id: 'pc-aluguel',
      codigo: '3.01',
      nome: 'Aluguel',
      tipo: 'despesa',
      grupoDRE: 'despesa_administrativa',
      excluido: false,
      dataCriacao: '2026-10-01',
      dataAlteracao: '2026-10-01',
    },
  ];

  const vendas: Venda[] = [
    {
      id: 'venda-teste-conf',
      numero: 999,
      tipo: 'pedido',
      clienteId: 'cli-teste',
      itens: [
        {
          id: 'item-1',
          produtoId: 'prod-teste',
          quantidade: 10,
          precoUnitarioCentavos: 2000, // R$ 20,00
          custoUnitarioGravadoCentavos: 1200, // R$ 12,00
          origem: 'estoque',
        },
      ],
      descontoCentavos: 0,
      freteCentavos: 0,
      totalCentavos: 20000,
      formaPagamentoId: 'fp-dinheiro',
      numeroParcelas: 1,
      status: 'faturado',
      excluido: false,
      dataCriacao: '2026-10-15T10:00:00Z',
      dataAlteracao: '2026-10-15T10:00:00Z',
    },
  ];

  const contas: ContaFinanceiraItem[] = [
    {
      id: 'conta-aluguel',
      tipo: 'pagar',
      descricao: 'Aluguel do Galpão',
      referenciaTipo: 'avulso',
      planoContaId: 'pc-aluguel',
      mesCompetencia: '2026-10',
      parcelaNumero: 1,
      totalParcelas: 1,
      valorCentavos: 30000, // R$ 300,00
      dataVencimento: '2026-10-20',
      status: 'pendente',
      excluido: false,
      dataCriacao: '2026-10-01',
      dataAlteracao: '2026-10-01',
    },
  ];

  const resultado = calcularDRE(
    vendas,
    contas,
    planoContas,
    '2026-10-01',
    '2026-10-31',
    'competencia'
  );

  // Asserting exact figures from prompt requirement
  assert.equal(resultado.receitaBrutaVendasCentavos, 20000, 'Receita bruta deve ser 200,00');
  assert.equal(resultado.cmvCentavos, 12000, 'CMV deve ser 120,00');
  assert.equal(resultado.lucroBrutoCentavos, 8000, 'Lucro bruto deve ser 80,00');
  assert.equal(resultado.despesasAdministrativasCentavos, 30000, 'Despesas administrativas devem ser 300,00');
  assert.equal(resultado.lucroLiquidoCentavos, -22000, 'Lucro líquido deve ser -220,00');
});
