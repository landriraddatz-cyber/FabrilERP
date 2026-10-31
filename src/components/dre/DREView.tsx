import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Percent,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Printer,
  Download,
  Share2,
  Info,
  DollarSign,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../../db';
import {
  formatCurrency,
  formatDateBr,
  todayIsoDate,
  addDaysIso,
} from '../../utils/formatters';
import { calcularDRE, RegimeDespesas, DREResult } from '../../utils/dre';
import { Venda, ContaFinanceiraItem, PlanoConta } from '../../types';

export const DREView: React.FC = () => {
  const [periodoTipo, setPeriodoTipo] = useState<'mes' | 'trimestre' | 'ano' | 'livre'>('mes');
  const [regime, setRegime] = useState<RegimeDespesas>('competencia');

  // Dates
  const hoje = todayIsoDate();
  const [dataInicio, setDataInicio] = useState(hoje.substring(0, 7) + '-01');
  const [dataFim, setDataFim] = useState(hoje);

  // Data
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [contas, setContas] = useState<ContaFinanceiraItem[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoConta[]>([]);
  const [loading, setLoading] = useState(true);

  // Drilldown states
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedPlanoContaModal, setSelectedPlanoContaModal] = useState<{
    nome: string;
    lancamentos: ContaFinanceiraItem[];
  } | null>(null);

  // Modal para corrigir contas sem plano
  const [isContasSemPlanoModalOpen, setIsContasSemPlanoModalOpen] = useState(false);

  const carregarDados = async () => {
    try {
      const v = await db.vendas.filter((x) => !x.excluido).toArray();
      const c = await db.contasFinanceiras.filter((x) => !x.excluido).toArray();
      const p = await db.planoContas.filter((x) => !x.excluido).toArray();

      setVendas(v);
      setContas(c);
      setPlanoContas(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Update dates when period selector changes
  const handleTrocaPeriodo = (tipo: 'mes' | 'trimestre' | 'ano' | 'livre') => {
    setPeriodoTipo(tipo);
    const y = parseInt(hoje.substring(0, 4));
    const m = parseInt(hoje.substring(5, 7));

    if (tipo === 'mes') {
      setDataInicio(`${y}-${String(m).padStart(2, '0')}-01`);
      setDataFim(hoje);
    } else if (tipo === 'trimestre') {
      const startMonth = Math.floor((m - 1) / 3) * 3 + 1;
      setDataInicio(`${y}-${String(startMonth).padStart(2, '0')}-01`);
      setDataFim(hoje);
    } else if (tipo === 'ano') {
      setDataInicio(`${y}-01-01`);
      setDataFim(hoje);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // 1. Current Period DRE Calculation
  const dreAtual = calcularDRE(vendas, contas, planoContas, dataInicio, dataFim, regime);

  // 2. Previous Month DRE for comparison
  const [anoAtual, mesAtualStr] = dataInicio.substring(0, 7).split('-').map(Number);
  const dataInicioMesAnterior = new Date(anoAtual, mesAtualStr - 2, 1);
  const dataFimMesAnterior = new Date(anoAtual, mesAtualStr - 1, 0);
  const inicioAntStr = `${dataInicioMesAnterior.getFullYear()}-${String(dataInicioMesAnterior.getMonth() + 1).padStart(2, '0')}-01`;
  const fimAntStr = `${dataFimMesAnterior.getFullYear()}-${String(dataFimMesAnterior.getMonth() + 1).padStart(2, '0')}-${String(dataFimMesAnterior.getDate()).padStart(2, '0')}`;

  const dreAnterior = calcularDRE(vendas, contas, planoContas, inicioAntStr, fimAntStr, regime);

  // 3. Last 6 Months Mini Chart Data
  const ultimos6MesesData = React.useMemo(() => {
    const meses = [];
    const agoraDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agoraDate.getFullYear(), agoraDate.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ini = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const fim = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const nomeMes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      const calc = calcularDRE(vendas, contas, planoContas, ini, fim, regime);
      meses.push({
        label: nomeMes,
        receitaLiquida: calc.receitaLiquidaCentavos,
        lucroBruto: calc.lucroBrutoCentavos,
        lucroLiquido: calc.lucroLiquidoCentavos,
      });
    }
    return meses;
  }, [vendas, contas, planoContas, regime]);

  // Calculate percentage of line over Receita Líquida
  const calcPerc = (valorCentavos: number) => {
    if (dreAtual.receitaLiquidaCentavos === 0) return '0.0%';
    const p = ((valorCentavos / dreAtual.receitaLiquidaCentavos) * 100).toFixed(1);
    return `${p}%`;
  };

  const calcVariacao = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? '+100%' : '0%';
    const v = (((atual - anterior) / Math.abs(anterior)) * 100).toFixed(1);
    return `${Number(v) > 0 ? '+' : ''}${v}%`;
  };

  // Export CSV
  const handleExportarCSV = () => {
    let csv = '\uFEFF';
    csv += 'DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)\n';
    csv += `Período: ${formatDateBr(dataInicio)} a ${formatDateBr(dataFim)}\n`;
    csv += `Regime das Despesas: ${regime === 'competencia' ? 'Competência' : 'Pagamento'}\n\n`;
    csv += 'Linha DRE,Valor (R$),% s/ Receita Líquida\n';

    const linhas = [
      { l: 'Receita Bruta de Vendas', v: dreAtual.receitaBrutaVendasCentavos },
      { l: '(-) Deduções', v: -dreAtual.deducoesCentavos },
      { l: '= Receita Líquida', v: dreAtual.receitaLiquidaCentavos },
      { l: '(-) CMV (Custo das Mercadorias Vendidas)', v: -dreAtual.cmvCentavos },
      { l: '= Lucro Bruto', v: dreAtual.lucroBrutoCentavos },
      { l: '(-) Despesas com Vendas', v: -dreAtual.despesasVendasCentavos },
      { l: '(-) Despesas Administrativas', v: -dreAtual.despesasAdministrativasCentavos },
      { l: '(+/-) Resultado Financeiro', v: dreAtual.resultadoFinanceiroCentavos },
      { l: '(+/-) Outras Receitas e Despesas', v: dreAtual.outrasReceitasDespesasCentavos },
      { l: '= Resultado Antes dos Impostos (LAIR)', v: dreAtual.resultadoAntesImpostosCentavos },
      { l: '(-) IRPJ e CSLL', v: -dreAtual.impostoLucroCentavos },
      { l: '= Lucro Líquido do Exercício', v: dreAtual.lucroLiquidoCentavos },
    ];

    linhas.forEach((item) => {
      csv += `"${item.l}","${(item.v / 100).toFixed(2)}","${calcPerc(Math.abs(item.v))}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DRE_${dataInicio}_a_${dataFim}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Share
  const handleCompartilharWhatsApp = async () => {
    let texto = `📊 *DRE - DEMONSTRAÇÃO DO RESULTADO*\n`;
    texto += `📅 Período: ${formatDateBr(dataInicio)} a ${formatDateBr(dataFim)}\n`;
    texto += `⚙️ Regime: ${regime === 'competencia' ? 'Competência' : 'Pagamento'}\n`;
    texto += `--------------------------------\n`;
    texto += `(+) Receita Bruta: ${formatCurrency(dreAtual.receitaBrutaVendasCentavos)}\n`;
    texto += `(-) Deduções: ${formatCurrency(dreAtual.deducoesCentavos)}\n`;
    texto += `*(=) Receita Líquida: ${formatCurrency(dreAtual.receitaLiquidaCentavos)}*\n`;
    texto += `(-) CMV: ${formatCurrency(dreAtual.cmvCentavos)}\n`;
    texto += `*(=) Lucro Bruto: ${formatCurrency(dreAtual.lucroBrutoCentavos)}* (${dreAtual.margemBrutaPercentual}%)\n`;
    texto += `(-) Desp. Vendas: ${formatCurrency(dreAtual.despesasVendasCentavos)}\n`;
    texto += `(-) Desp. Administrativas: ${formatCurrency(dreAtual.despesasAdministrativasCentavos)}\n`;
    texto += `(+/-) Res. Financeiro: ${formatCurrency(dreAtual.resultadoFinanceiroCentavos)}\n`;
    texto += `(=) Res. Antes Impostos: ${formatCurrency(dreAtual.resultadoAntesImpostosCentavos)}\n`;
    texto += `(-) IRPJ/CSLL: ${formatCurrency(dreAtual.impostoLucroCentavos)}\n`;
    texto += `--------------------------------\n`;
    texto += `*🏆 LUCRO LÍQUIDO: ${formatCurrency(dreAtual.lucroLiquidoCentavos)}* (${dreAtual.margemLiquidaPercentual}%)\n`;
    texto += `\nGerado via FabrilERP`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `DRE - ${formatDateBr(dataInicio)} a ${formatDateBr(dataFim)}`,
          text: texto,
        });
        return;
      } catch (e) {}
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // Print PDF
  const handleImprimir = () => {
    window.print();
  };

  const handleAtribuirPlano = async (contaId: string, planoId: string) => {
    await db.contasFinanceiras.update(contaId, { planoContaId: planoId });
    await carregarDados();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Carregando DRE e plano de contas...
      </div>
    );
  }

  // Filter accounts belonging to a group for drilldown
  const getContasDoGrupo = (grupo: string) => {
    return Object.values(dreAtual.detalhamentoPorConta).filter(
      (item) => item.grupoDRE === grupo
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              DRE - Resultado do Exercício
            </h3>
            <p className="text-[11px] text-slate-500">
              Apuração real de receitas, custos, margens e lucro líquido
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportarCSV}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 transition"
              title="Exportar DRE em CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleCompartilharWhatsApp}
              className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
              title="Compartilhar DRE pelo WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleImprimir}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 transition"
              title="Imprimir / Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Period Buttons */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
          {[
            { id: 'mes', label: 'Mês Atual' },
            { id: 'trimestre', label: 'Trimestre' },
            { id: 'ano', label: 'Ano' },
            { id: 'livre', label: 'Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handleTrocaPeriodo(p.id as any)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                periodoTipo === p.id
                  ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {periodoTipo === 'livre' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">Data Início:</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">Data Fim:</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Despesas por: Competência ou Pagamento (Switch requested by prompt) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Despesas por:
            </span>
            <div className="inline-flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setRegime('competencia')}
                className={`px-2 py-1 rounded-md transition ${
                  regime === 'competencia'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Competência (Padrão)
              </button>
              <button
                type="button"
                onClick={() => setRegime('pagamento')}
                className={`px-2 py-1 rounded-md transition ${
                  regime === 'pagamento'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pagamento
              </button>
            </div>
          </div>

          <div
            className="flex items-center gap-1 text-[10px] text-slate-400 max-w-[190px] leading-tight text-right"
            title="Troca apenas a data das despesas e receitas avulsas; vendas e CMV sempre seguem a data do pedido."
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Vendas e CMV sempre seguem data do pedido</span>
          </div>
        </div>
      </div>

      {/* 2. Top Highlight KPI Cards: Margem Bruta & Margem Líquida */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Margem Bruta
          </span>
          <div className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
            {dreAtual.margemBrutaPercentual}%
          </div>
          <span className="text-[11px] text-slate-500">
            Lucro Bruto: {formatCurrency(dreAtual.lucroBrutoCentavos)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Margem Líquida
          </span>
          <div
            className={`text-xl font-black mt-0.5 ${
              dreAtual.lucroLiquidoCentavos >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {dreAtual.margemLiquidaPercentual}%
          </div>
          <span className="text-[11px] text-slate-500">
            Lucro Líquido: {formatCurrency(dreAtual.lucroLiquidoCentavos)}
          </span>
        </div>
      </div>

      {/* 3. Yellow Warning for accounts missing chart account */}
      {dreAtual.contasSemPlano.length > 0 && (
        <div
          onClick={() => setIsContasSemPlanoModalOpen(true)}
          className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl cursor-pointer hover:bg-amber-100/70 transition text-xs flex items-center justify-between text-amber-900 dark:text-amber-200 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{dreAtual.contasSemPlano.length} contas a pagar</strong> deste período estão sem conta do plano e não entraram no DRE.
            </span>
          </div>
          <span className="text-[11px] font-bold underline shrink-0 ml-2">
            Corrigir
          </span>
        </div>
      )}

      {/* 4. Complete DRE Statement Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          <span>Estrutura do DRE</span>
          <div className="flex gap-4">
            <span className="w-20 text-right">Valor</span>
            <span className="w-14 text-right">% s/ RL</span>
          </div>
        </div>

        {/* Linha 1: Receita Bruta */}
        <DRERow
          title="Receita bruta de vendas"
          valorCentavos={dreAtual.receitaBrutaVendasCentavos}
          percentual={calcPerc(dreAtual.receitaBrutaVendasCentavos)}
          contasDetalhadas={getContasDoGrupo('receita_venda')}
          isExpanded={!!expandedGroups['receita_venda']}
          onToggle={() => toggleGroup('receita_venda')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Linha 2: Deduções */}
        <DRERow
          title="(-) Deduções sobre vendas"
          valorCentavos={-dreAtual.deducoesCentavos}
          percentual={calcPerc(dreAtual.deducoesCentavos)}
          isNegative
          contasDetalhadas={getContasDoGrupo('deducao')}
          isExpanded={!!expandedGroups['deducao']}
          onToggle={() => toggleGroup('deducao')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Subtotal: Receita Líquida */}
        <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-slate-900 dark:text-white border-y border-slate-200/60 dark:border-slate-700/60">
          <span>= Receita Líquida</span>
          <div className="flex gap-4">
            <span className="w-20 text-right">{formatCurrency(dreAtual.receitaLiquidaCentavos)}</span>
            <span className="w-14 text-right">100.0%</span>
          </div>
        </div>

        {/* Linha 3: CMV */}
        <DRERow
          title="(-) CMV (Custo Mercadorias Vendidas)"
          valorCentavos={-dreAtual.cmvCentavos}
          percentual={calcPerc(dreAtual.cmvCentavos)}
          isNegative
          contasDetalhadas={getContasDoGrupo('cmv')}
          isExpanded={!!expandedGroups['cmv']}
          onToggle={() => toggleGroup('cmv')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Subtotal: Lucro Bruto */}
        <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 font-black text-xs text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-900/60">
          <span>= Lucro Bruto</span>
          <div className="flex gap-4">
            <span className="w-20 text-right">{formatCurrency(dreAtual.lucroBrutoCentavos)}</span>
            <span className="w-14 text-right">{dreAtual.margemBrutaPercentual}%</span>
          </div>
        </div>

        {/* Linha 4: Despesas com Vendas */}
        <DRERow
          title="(-) Despesas com vendas"
          valorCentavos={-dreAtual.despesasVendasCentavos}
          percentual={calcPerc(dreAtual.despesasVendasCentavos)}
          isNegative
          contasDetalhadas={getContasDoGrupo('despesa_venda')}
          isExpanded={!!expandedGroups['despesa_venda']}
          onToggle={() => toggleGroup('despesa_venda')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Linha 5: Despesas Administrativas */}
        <DRERow
          title="(-) Despesas administrativas"
          valorCentavos={-dreAtual.despesasAdministrativasCentavos}
          percentual={calcPerc(dreAtual.despesasAdministrativasCentavos)}
          isNegative
          contasDetalhadas={getContasDoGrupo('despesa_administrativa')}
          isExpanded={!!expandedGroups['despesa_administrativa']}
          onToggle={() => toggleGroup('despesa_administrativa')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Linha 6: Resultado Financeiro */}
        <DRERow
          title="(+/-) Resultado financeiro líquido"
          valorCentavos={dreAtual.resultadoFinanceiroCentavos}
          percentual={calcPerc(Math.abs(dreAtual.resultadoFinanceiroCentavos))}
          isNegative={dreAtual.resultadoFinanceiroCentavos < 0}
          contasDetalhadas={[
            ...getContasDoGrupo('receita_financeira'),
            ...getContasDoGrupo('despesa_financeira'),
          ]}
          isExpanded={!!expandedGroups['resultado_financeiro']}
          onToggle={() => toggleGroup('resultado_financeiro')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Linha 7: Outras Receitas e Despesas */}
        <DRERow
          title="(+/-) Outras receitas e despesas"
          valorCentavos={dreAtual.outrasReceitasDespesasCentavos}
          percentual={calcPerc(Math.abs(dreAtual.outrasReceitasDespesasCentavos))}
          isNegative={dreAtual.outrasReceitasDespesasCentavos < 0}
          contasDetalhadas={getContasDoGrupo('outras')}
          isExpanded={!!expandedGroups['outras']}
          onToggle={() => toggleGroup('outras')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* Subtotal: Resultado antes dos Impostos */}
        <div className="flex justify-between items-center py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-slate-900 dark:text-white">
          <span>= Resultado Antes dos Impostos (LAIR)</span>
          <div className="flex gap-4">
            <span
              className={`w-20 text-right ${
                dreAtual.resultadoAntesImpostosCentavos < 0 ? 'text-rose-600' : ''
              }`}
            >
              {formatCurrency(dreAtual.resultadoAntesImpostosCentavos)}
            </span>
            <span className="w-14 text-right">
              {calcPerc(dreAtual.resultadoAntesImpostosCentavos)}
            </span>
          </div>
        </div>

        {/* Linha 8: IRPJ e CSLL */}
        <DRERow
          title="(-) IRPJ e CSLL"
          valorCentavos={-dreAtual.impostoLucroCentavos}
          percentual={calcPerc(dreAtual.impostoLucroCentavos)}
          isNegative
          contasDetalhadas={getContasDoGrupo('imposto_lucro')}
          isExpanded={!!expandedGroups['imposto_lucro']}
          onToggle={() => toggleGroup('imposto_lucro')}
          onSelectConta={(c) => setSelectedPlanoContaModal(c)}
        />

        {/* RESULTADO FINAL: Lucro Líquido */}
        <div
          className={`flex justify-between items-center py-3 px-3 rounded-xl font-black text-xs sm:text-sm border ${
            dreAtual.lucroLiquidoCentavos >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800'
          }`}
        >
          <span>= Lucro Líquido do Período</span>
          <div className="flex gap-4">
            <span
              className={`w-24 text-right text-sm font-black ${
                dreAtual.lucroLiquidoCentavos < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {formatCurrency(dreAtual.lucroLiquidoCentavos)}
            </span>
            <span className="w-14 text-right">{dreAtual.margemLiquidaPercentual}%</span>
          </div>
        </div>
      </div>

      {/* 5. Comparativo Mês Atual vs Mês Anterior */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Comparativo com o Mês Anterior
        </h4>

        <div className="space-y-2 text-xs">
          {[
            {
              item: 'Receita Líquida',
              atual: dreAtual.receitaLiquidaCentavos,
              ant: dreAnterior.receitaLiquidaCentavos,
            },
            {
              item: 'Lucro Bruto',
              atual: dreAtual.lucroBrutoCentavos,
              ant: dreAnterior.lucroBrutoCentavos,
            },
            {
              item: 'Lucro Líquido',
              atual: dreAtual.lucroLiquidoCentavos,
              ant: dreAnterior.lucroLiquidoCentavos,
            },
          ].map((row, i) => {
            const variacao = calcVariacao(row.atual, row.ant);
            const isPositiva = Number(variacao.replace(/[^\d.-]/g, '')) >= 0;

            return (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {row.item}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Mês Anterior: {formatCurrency(row.ant)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(row.atual)}
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      isPositiva ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {variacao} vs mês ant.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Mini Gráfico de Barras dos Últimos 6 Meses */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Evolução dos Últimos 6 Meses
          </h4>
          <div className="flex gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-sky-600">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Rec. Líquida
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Lucro Líq.
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {ultimos6MesesData.map((m, i) => {
            const maxVal = Math.max(
              ...ultimos6MesesData.map((x) => Math.max(x.receitaLiquida, Math.abs(x.lucroLiquido))),
              1
            );
            const altRec = Math.max(8, Math.round((m.receitaLiquida / maxVal) * 100));
            const altLucro = Math.max(8, Math.round((Math.abs(m.lucroLiquido) / maxVal) * 100));

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-28">
                  {/* Barra Receita Líquida */}
                  <div
                    style={{ height: `${altRec}%` }}
                    className="w-2.5 sm:w-3.5 bg-sky-500 rounded-t-sm"
                    title={`Receita: ${formatCurrency(m.receitaLiquida)}`}
                  />
                  {/* Barra Lucro Líquido */}
                  <div
                    style={{ height: `${altLucro}%` }}
                    className={`w-2.5 sm:w-3.5 rounded-t-sm ${
                      m.lucroLiquido >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    title={`Lucro Líquido: ${formatCurrency(m.lucroLiquido)}`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Drilldown dos Lançamentos da Conta do Plano */}
      {selectedPlanoContaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedPlanoContaModal.nome}
                </h3>
                <p className="text-[11px] text-slate-500">Lançamentos que compõem este saldo no DRE</p>
              </div>
              <button
                onClick={() => setSelectedPlanoContaModal(null)}
                aria-label="Fechar"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {selectedPlanoContaModal.lancamentos.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nenhum lançamento avulso.</p>
              ) : (
                selectedPlanoContaModal.lancamentos.map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{l.descricao}</div>
                      <div className="text-[10px] text-slate-500">
                        Venc: {formatDateBr(l.dataVencimento)}{' '}
                        {l.mesCompetencia ? `• Competência: ${l.mesCompetencia}` : ''}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(l.valorCentavos)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPlanoContaModal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para atribuir contas sem plano (Aviso Amarelo) */}
      {isContasSemPlanoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Vincular Conta do Plano
                </h3>
                <p className="text-[11px] text-slate-500">
                  Defina a conta para que essas despesas entrem no DRE
                </p>
              </div>
              <button
                onClick={() => setIsContasSemPlanoModalOpen(false)}
                aria-label="Fechar"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {dreAtual.contasSemPlano.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{c.descricao}</span>
                      <div className="text-[11px] text-slate-500">
                        Venc: {formatDateBr(c.dataVencimento)}
                      </div>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(c.valorCentavos)}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Escolha a Conta do Plano de Contas:
                    </label>
                    <select
                      onChange={(e) => handleAtribuirPlano(c.id, e.target.value)}
                      defaultValue=""
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="" disabled>
                        Selecione a conta correspondente...
                      </option>
                      {planoContas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} - {p.nome} ({p.grupoDRE})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DRERowProps {
  title: string;
  valorCentavos: number;
  percentual: string;
  isNegative?: boolean;
  contasDetalhadas?: Array<{
    planoContaId: string;
    codigo: string;
    nome: string;
    valorCentavos: number;
    lancamentos: ContaFinanceiraItem[];
  }>;
  isExpanded?: boolean;
  onToggle?: () => void;
  onSelectConta?: (conta: { nome: string; lancamentos: ContaFinanceiraItem[] }) => void;
}

const DRERow: React.FC<DRERowProps> = ({
  title,
  valorCentavos,
  percentual,
  isNegative,
  contasDetalhadas = [],
  isExpanded,
  onToggle,
  onSelectConta,
}) => {
  const hasDetails = contasDetalhadas.length > 0;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800/60 pb-1 last:border-0 last:pb-0">
      <div
        onClick={hasDetails ? onToggle : undefined}
        className={`flex justify-between items-center py-1.5 px-2 rounded-lg text-xs transition ${
          hasDetails ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''
        }`}
      >
        <div className="flex items-center gap-1.5">
          {hasDetails && (
            <span className="text-slate-400">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          )}
          <span
            className={`font-semibold ${
              isNegative ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'
            }`}
          >
            {title}
          </span>
        </div>

        <div className="flex gap-4">
          <span
            className={`w-20 text-right font-bold ${
              isNegative || valorCentavos < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {formatCurrency(valorCentavos)}
          </span>
          <span className="w-14 text-right text-slate-500 dark:text-slate-400 text-[11px]">
            {percentual}
          </span>
        </div>
      </div>

      {/* Drilldown Sub-accounts */}
      {isExpanded && hasDetails && (
        <div className="ml-5 pl-2 border-l-2 border-sky-400/40 space-y-1 my-1">
          {contasDetalhadas.map((c) => (
            <div
              key={c.planoContaId}
              onClick={() => onSelectConta?.({ nome: `${c.codigo} - ${c.nome}`, lancamentos: c.lancamentos })}
              className="flex justify-between items-center py-1 px-2 rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer text-[11px]"
            >
              <span className="text-slate-600 dark:text-slate-400">
                {c.codigo} • {c.nome} ({c.lancamentos.length})
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(c.valorCentavos)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
