import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  AlertTriangle,
  Cog,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { db, baixarContaFinanceira } from '../db';
import { formatCurrency, formatDateBr, todayIsoDate } from '../utils/formatters';
import { Produto, OrdemProducao, ContaFinanceiraItem, Venda, PlanoConta } from '../types';
import { calcularDRE } from '../utils/dre';

interface DashboardViewProps {
  onNavigateTab: (tab: any, subview?: string) => void;
  onOpenQuickCreate: () => void;
  onOpenAI: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenQuickCreate,
  onOpenAI,
}) => {
  const [stats, setStats] = useState({
    vendasMesCentavos: 0,
    aReceberCentavos: 0,
    aPagarCentavos: 0,
    saldoCaixaCentavos: 0,
    lucroBrutoMesCentavos: 0,
    lucroLiquidoMesCentavos: 0,
    margemLiquidaPercentual: 0,
  });

  const [contasHoje, setContasHoje] = useState<ContaFinanceiraItem[]>([]);
  const [ordensAndamento, setOrdensAndamento] = useState<
    Array<OrdemProducao & { produtoNome?: string }>
  >([]);
  const [produtosAbaixoMinimo, setProdutosAbaixoMinimo] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    try {
      const hoje = todayIsoDate();
      const primeiroDiaMes = hoje.substring(0, 7) + '-01';

      // 1. Vendas do mês
      const vendasMes = await db.vendas
        .filter(
          (v) =>
            !v.excluido &&
            v.tipo === 'pedido' &&
            v.status === 'faturado' &&
            v.dataCriacao >= primeiroDiaMes
        )
        .toArray();

      const vendasMesCentavos = vendasMes.reduce((acc, v) => acc + v.totalCentavos, 0);

      // Custo das mercadorias vendidas para lucro bruto
      let custoMercadoriasCentavos = 0;
      const produtosMap = new Map<string, Produto>();
      const todosProds = await db.produtos.toArray();
      todosProds.forEach((p) => produtosMap.set(p.id, p));

      vendasMes.forEach((v) => {
        v.itens.forEach((it) => {
          const prod = produtosMap.get(it.produtoId);
          if (prod) {
            custoMercadoriasCentavos += it.quantidade * prod.precoCustoCentavos;
          }
        });
      });

      const lucroBrutoMesCentavos = Math.max(0, vendasMesCentavos - custoMercadoriasCentavos);

      // 2. Contas Financeiras
      const todasContas = await db.contasFinanceiras.filter((c) => !c.excluido).toArray();

      const aReceberCentavos = todasContas
        .filter((c) => c.tipo === 'receber' && c.status === 'pendente')
        .reduce((acc, c) => acc + c.valorCentavos, 0);

      const aPagarCentavos = todasContas
        .filter((c) => c.tipo === 'pagar' && c.status === 'pendente')
        .reduce((acc, c) => acc + c.valorCentavos, 0);

      // Contas que vencem hoje
      const hojeContas = todasContas.filter(
        (c) => c.status === 'pendente' && c.dataVencimento === hoje
      );
      setContasHoje(hojeContas);

      // 3. Saldo em caixa
      const contasBancarias = await db.contasBancarias.filter((b) => !b.excluido).toArray();
      let saldoContas = contasBancarias.reduce((acc, b) => acc + b.saldoInicialCentavos, 0);

      // Adiciona pagamentos recebidos e subtrai pagos
      todasContas.forEach((c) => {
        if (c.status === 'pago') {
          if (c.tipo === 'receber') saldoContas += c.valorCentavos;
          if (c.tipo === 'pagar') saldoContas -= c.valorCentavos;
        }
      });

      // 4. Ordens em andamento
      const ops = await db.ordensProducao
        .filter((op) => !op.excluido && (op.status === 'planejada' || op.status === 'em_producao'))
        .toArray();

      const opsComNome = ops.map((op) => ({
        ...op,
        produtoNome: produtosMap.get(op.produtoAcabadoId)?.nome || 'Produto não encontrado',
      }));
      setOrdensAndamento(opsComNome);

      // 5. Produtos abaixo do estoque mínimo
      const produtosAlerta = todosProds.filter(
        (p) => !p.excluido && p.estoqueAtual < p.estoqueMinimo
      );
      setProdutosAbaixoMinimo(produtosAlerta);

      // 6. DRE do Mês Atual
      const todasVendas = await db.vendas.filter((v) => !v.excluido).toArray();
      const todosPlanoContas = await db.planoContas.filter((p) => !p.excluido).toArray();
      const dreMes = calcularDRE(
        todasVendas,
        todasContas,
        todosPlanoContas,
        primeiroDiaMes,
        hoje,
        'competencia'
      );

      setStats({
        vendasMesCentavos,
        aReceberCentavos,
        aPagarCentavos,
        saldoCaixaCentavos: saldoContas,
        lucroBrutoMesCentavos: dreMes.lucroBrutoCentavos,
        lucroLiquidoMesCentavos: dreMes.lucroLiquidoCentavos,
        margemLiquidaPercentual: dreMes.margemLiquidaPercentual,
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleBaixaRapida = async (conta: ContaFinanceiraItem) => {
    try {
      const contasBancarias = await db.contasBancarias.filter((c) => !c.excluido).toArray();
      const primeiraConta = contasBancarias[0]?.id || 'cb-caixa';
      await baixarContaFinanceira(conta.id, primeiraConta, todayIsoDate());
      await carregarDados();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs">Carregando painel fabril...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* AI Intelligence Greeting Card */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-sky-800/50 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Assistente & Cotação em Tempo Real
          </span>
          <h2 className="text-base font-bold mt-0.5">Painel de Operações da Fábrica</h2>
          <p className="text-xs text-slate-300 mt-1">
            Consulte fornecedores, custos de insumos e orçamentos com a IA.
          </p>
        </div>
        <button
          onClick={onOpenAI}
          className="shrink-0 bg-sky-500 hover:bg-sky-400 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm"
        >
          Abrir IA
        </button>
      </div>

      {/* Main KPI Cards (Vendas, A Receber, A Pagar, Caixa, Lucro) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Vendas do mês */}
        <div
          onClick={() => onNavigateTab('vendas')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-500 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Vendas no Mês</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {formatCurrency(stats.vendasMesCentavos)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
            Lucro Bruto: {formatCurrency(stats.lucroBrutoMesCentavos)}
          </div>
        </div>

        {/* Saldo em Caixa */}
        <div
          onClick={() => onNavigateTab('financeiro')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-500 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Saldo em Caixa</span>
            <Wallet className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {formatCurrency(stats.saldoCaixaCentavos)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Disponível nas contas
          </div>
        </div>

        {/* A Receber */}
        <div
          onClick={() => onNavigateTab('financeiro')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-500 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">A Receber</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.aReceberCentavos)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Contas pendentes
          </div>
        </div>

        {/* A Pagar */}
        <div
          onClick={() => onNavigateTab('financeiro')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-sky-500 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">A Pagar</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.aPagarCentavos)}
          </div>
        </div>
      </div>

      {/* DRE Highlight KPI Card */}
      <div
        onClick={() => onNavigateTab('financeiro')}
        className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition flex items-center justify-between ${
          stats.lucroLiquidoMesCentavos >= 0
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500'
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:border-rose-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              stats.lucroLiquidoMesCentavos >= 0
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-rose-500 text-white shadow-xs'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Resultado DRE do Mês
              </span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                  stats.lucroLiquidoMesCentavos >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                }`}
              >
                Margem Líq: {stats.margemLiquidaPercentual}%
              </span>
            </div>
            <div
              className={`text-base font-black ${
                stats.lucroLiquidoMesCentavos >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              Lucro Líquido: {formatCurrency(stats.lucroLiquidoMesCentavos)}
            </div>
          </div>
        </div>

        <div className="flex items-center text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline gap-0.5">
          <span>Ver DRE</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* SECTION 1: Contas que vencem hoje */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Contas que Vencem Hoje
            </h3>
          </div>
          <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
            {contasHoje.length}
          </span>
        </div>

        {contasHoje.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            Nenhuma conta vencendo hoje. Suas finanças estão em dia!
          </p>
        ) : (
          <div className="space-y-2">
            {contasHoje.map((conta) => (
              <div
                key={conta.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {conta.descricao}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {conta.tipo === 'receber' ? 'Recebimento' : 'Pagamento'} • Venc: Hoje
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-black ${
                      conta.tipo === 'receber'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(conta.valorCentavos)}
                  </span>
                  <button
                    onClick={() => handleBaixaRapida(conta)}
                    className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition"
                    title="Dar baixa"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Ordens de Produção em Andamento */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cog className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Ordens em Andamento (PCP)
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('producao')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
          >
            Ver todas <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {ordensAndamento.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            Nenhuma ordem de produção em execução no momento.
          </p>
        ) : (
          <div className="space-y-2.5">
            {ordensAndamento.map((op) => (
              <div
                key={op.id}
                onClick={() => onNavigateTab('producao')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-sky-500 transition"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 mr-2">
                      OP #{op.numero}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {op.produtoNome}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {op.quantidadePlanejada} un
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  <span>Previsão: {formatDateBr(op.dataPrevista)}</span>
                  <span className="capitalize font-medium text-amber-600 dark:text-amber-400">
                    {op.status === 'planejada' ? 'Planejada' : 'Em Produção'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Produtos abaixo do Estoque Mínimo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200/80 dark:border-rose-950/60 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Abaixo do Estoque Mínimo
            </h3>
          </div>
          <span className="text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
            {produtosAbaixoMinimo.length}
          </span>
        </div>

        {produtosAbaixoMinimo.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
            Nenhum produto abaixo do estoque mínimo. Estoque equilibrado!
          </p>
        ) : (
          <div className="space-y-2">
            {produtosAbaixoMinimo.map((prod) => (
              <div
                key={prod.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {prod.nome}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">
                    Saldo atual: <strong>{prod.estoqueAtual} {prod.unidade}</strong> (Mínimo: {prod.estoqueMinimo} {prod.unidade})
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (prod.tipo === 'produto_acabado') {
                      onNavigateTab('producao');
                    } else {
                      onOpenQuickCreate();
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition shadow-xs"
                >
                  {prod.tipo === 'produto_acabado' ? 'Produzir' : 'Comprar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
