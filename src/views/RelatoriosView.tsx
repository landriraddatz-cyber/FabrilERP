import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  Percent,
  Clock,
  Award,
  Filter,
} from 'lucide-react';
import { db } from '../db';
import {
  formatCurrency,
  formatDateBr,
  todayIsoDate,
  addDaysIso,
  formatNumber,
} from '../utils/formatters';
import { Venda, Produto, OrdemProducao, ContaFinanceiraItem, Pessoa } from '../types';

export const RelatoriosView: React.FC = () => {
  const [relatorioTipo, setRelatorioTipo] = useState<
    'vendas' | 'lucro_produto' | 'custo_comparado' | 'perdas_consumo' | 'atraso' | 'ranking_clientes'
  >('lucro_produto');

  const [dataInicio, setDataInicio] = useState(addDaysIso(todayIsoDate(), -30));
  const [dataFim, setDataFim] = useState(todayIsoDate());

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [contas, setContas] = useState<ContaFinanceiraItem[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);

  const carregarDados = async () => {
    const v = await db.vendas.filter((x) => !x.excluido).toArray();
    setVendas(v);

    const p = await db.produtos.filter((x) => !x.excluido).toArray();
    setProdutos(p);

    const o = await db.ordensProducao.filter((x) => !x.excluido).toArray();
    setOrdens(o);

    const c = await db.contasFinanceiras.filter((x) => !x.excluido).toArray();
    setContas(c);

    const pes = await db.pessoas.filter((x) => !x.excluido).toArray();
    setPessoas(pes);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Helper map for quick lookups
  const produtosMap = new Map<string, Produto>();
  produtos.forEach((p) => produtosMap.set(p.id, p));

  const pessoasMap = new Map<string, Pessoa>();
  pessoas.forEach((p) => pessoasMap.set(p.id, p));

  // 1. Vendas por Período
  const relatorioVendasPeriodo = vendas
    .filter((v) => v.tipo === 'pedido' && v.dataCriacao >= dataInicio && v.dataCriacao <= dataFim + 'T23:59:59')
    .map((v) => {
      const cli = pessoasMap.get(v.clienteId);
      return {
        numero: v.numero,
        cliente: cli?.nome || 'Cliente',
        data: formatDateBr(v.dataCriacao),
        status: v.status,
        total: v.totalCentavos,
      };
    });

  // 2. Lucro por Produto (Preço de venda menos Custo Real)
  const relatorioLucroProduto = produtos
    .filter((p) => p.tipo === 'produto_acabado')
    .map((p) => {
      const lucroUnitario = Math.max(0, p.precoVendaCentavos - p.precoCustoCentavos);
      const margemPercentual =
        p.precoVendaCentavos > 0
          ? ((lucroUnitario / p.precoVendaCentavos) * 100).toFixed(1)
          : '0.0';

      return {
        codigo: p.codigo,
        nome: p.nome,
        precoVenda: p.precoVendaCentavos,
        precoCusto: p.precoCustoCentavos,
        lucroUnitario,
        margemPercentual,
        estoque: p.estoqueAtual,
      };
    });

  // 3. Custo Real vs Custo Padrão das OPs
  const relatorioCustoComparado = ordens
    .filter((o) => o.status === 'concluida')
    .map((o) => {
      const prod = produtosMap.get(o.produtoAcabadoId);
      const custoReal = o.custoUnitarioRealCentavos || 0;
      const custoPadrao = prod?.precoCustoCentavos || custoReal;
      const variacao = custoReal - custoPadrao;
      return {
        numero: o.numero,
        produto: prod?.nome || 'Produto',
        qtdProduzida: o.quantidadeProduzida || o.quantidadePlanejada,
        custoPadrao,
        custoReal,
        variacao,
        data: formatDateBr(o.dataConclusao || o.dataCriacao),
      };
    });

  // 4. Perdas e Consumo
  const relatorioPerdas = ordens
    .filter((o) => o.status === 'concluida' && o.insumosConsumidosReal)
    .flatMap((o) => {
      return (o.insumosConsumidosReal || []).map((cr, idx) => {
        const mp = produtosMap.get(cr.materiaPrimaId);
        const prev = o.insumosPrevistos[idx]?.quantidadePrevista || 0;
        const diff = cr.quantidadeReal - prev;
        const perc = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '0';
        return {
          op: o.numero,
          insumo: mp?.nome || 'Insumo',
          previsto: prev,
          real: cr.quantidadeReal,
          diferenca: diff,
          percentual: perc,
          unidade: mp?.unidade || 'UN',
        };
      });
    });

  // 5. Contas em Atraso
  const hoje = todayIsoDate();
  const relatorioAtraso = contas
    .filter((c) => c.status === 'pendente' && c.dataVencimento < hoje)
    .map((c) => {
      const pes = c.pessoaId ? pessoasMap.get(c.pessoaId) : null;
      return {
        descricao: c.descricao,
        pessoa: pes?.nome || 'N/D',
        tipo: c.tipo === 'receber' ? 'A Receber' : 'A Pagar',
        vencimento: formatDateBr(c.dataVencimento),
        valor: c.valorCentavos,
      };
    });

  // 6. Ranking de Clientes
  const clientesRankMap = new Map<string, { totalCentavos: number; pedidosCount: number }>();
  vendas
    .filter((v) => v.tipo === 'pedido' && v.status === 'faturado')
    .forEach((v) => {
      const cur = clientesRankMap.get(v.clienteId) || { totalCentavos: 0, pedidosCount: 0 };
      cur.totalCentavos += v.totalCentavos;
      cur.pedidosCount += 1;
      clientesRankMap.set(v.clienteId, cur);
    });

  const relatorioRankingClientes = Array.from(clientesRankMap.entries())
    .map(([clienteId, data]) => ({
      cliente: pessoasMap.get(clienteId)?.nome || 'Cliente',
      totalCentavos: data.totalCentavos,
      pedidosCount: data.pedidosCount,
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos);

  // CSV Exporter
  const exportarCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel

    if (relatorioTipo === 'lucro_produto') {
      csvContent += 'Código,Produto,Preço Venda,Custo Real,Lucro Unitário,Margem %,Estoque Atual\n';
      relatorioLucroProduto.forEach((r) => {
        csvContent += `"${r.codigo}","${r.nome}","${(r.precoVenda / 100).toFixed(2)}","${(
          r.precoCusto / 100
        ).toFixed(2)}","${(r.lucroUnitario / 100).toFixed(2)}","${r.margemPercentual}%","${
          r.estoque
        }"\n`;
      });
    } else if (relatorioTipo === 'vendas') {
      csvContent += 'Número,Cliente,Data,Status,Total (R$)\n';
      relatorioVendasPeriodo.forEach((r) => {
        csvContent += `"#${r.numero}","${r.cliente}","${r.data}","${r.status}","${(
          r.total / 100
        ).toFixed(2)}"\n`;
      });
    } else if (relatorioTipo === 'custo_comparado') {
      csvContent += 'Ordem,Produto,Qtd,Custo Padrão,Custo Real,Variação,Data\n';
      relatorioCustoComparado.forEach((r) => {
        csvContent += `"OP #${r.numero}","${r.produto}","${r.qtdProduzida}","${(
          r.custoPadrao / 100
        ).toFixed(2)}","${(r.custoReal / 100).toFixed(2)}","${(r.variacao / 100).toFixed(2)}","${
          r.data
        }"\n`;
      });
    } else if (relatorioTipo === 'perdas_consumo') {
      csvContent += 'OP,Insumo,Consumo Previsto,Consumo Real,Perda/Diferença,Variação %\n';
      relatorioPerdas.forEach((r) => {
        csvContent += `"OP #${r.op}","${r.insumo}","${r.previsto} ${r.unidade}","${r.real} ${r.unidade}","${r.diferenca} ${r.unidade}","${r.percentual}%"\n`;
      });
    } else if (relatorioTipo === 'atraso') {
      csvContent += 'Descrição,Pessoa,Tipo,Vencimento,Valor (R$)\n';
      relatorioAtraso.forEach((r) => {
        csvContent += `"${r.descricao}","${r.pessoa}","${r.tipo}","${r.vencimento}","${(
          r.valor / 100
        ).toFixed(2)}"\n`;
      });
    } else if (relatorioTipo === 'ranking_clientes') {
      csvContent += 'Posição,Cliente,Total Comprado (R$),Qtd Pedidos\n';
      relatorioRankingClientes.forEach((r, idx) => {
        csvContent += `"${idx + 1}","${r.cliente}","${(r.totalCentavos / 100).toFixed(2)}","${
          r.pedidosCount
        }"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${relatorioTipo}_${todayIsoDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Relatórios Fabris</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rentabilidade, custos reais, perdas e exportação CSV
          </p>
        </div>
        <button
          onClick={exportarCSV}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
          title="Baixar arquivo em formato CSV para Excel"
        >
          <Download className="w-4 h-4" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Report Selector */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Selecione o Tipo de Relatório:
        </label>
        <select
          value={relatorioTipo}
          onChange={(e) => setRelatorioTipo(e.target.value as any)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="lucro_produto">📊 Lucro por Produto (Preço Venda - Custo Real)</option>
          <option value="vendas">💰 Vendas por Período</option>
          <option value="custo_comparado">⚖️ Custo Real vs Custo Padrão</option>
          <option value="perdas_consumo">📉 Consumo de Matéria-Prima & Perdas</option>
          <option value="atraso">⚠️ Contas em Atraso (Inadimplência)</option>
          <option value="ranking_clientes">🏆 Ranking de Clientes (Faturamento)</option>
        </select>
      </div>

      {/* Report View: Lucro por Produto */}
      {relatorioTipo === 'lucro_produto' && (
        <div className="space-y-2.5">
          {relatorioLucroProduto.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {item.codigo}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.nome}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    Margem: {item.margemPercentual}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">Preço Venda:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.precoVenda)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Custo Real:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(item.precoCusto)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Lucro Bruto/un:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(item.lucroUnitario)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report View: Vendas por Período */}
      {relatorioTipo === 'vendas' && (
        <div className="space-y-2.5">
          <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Total Faturado no Período:
            </span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {formatCurrency(relatorioVendasPeriodo.reduce((acc, v) => acc + v.total, 0))}
            </span>
          </div>

          {relatorioVendasPeriodo.map((v, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-center"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Pedido #{v.numero} - {v.cliente}
                </h4>
                <div className="text-[11px] text-slate-500 mt-0.5">{v.data}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {formatCurrency(v.total)}
                </span>
                <span className="block text-[10px] text-emerald-600 capitalize">{v.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report View: Custo Comparado */}
      {relatorioTipo === 'custo_comparado' && (
        <div className="space-y-2.5">
          {relatorioCustoComparado.map((c, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    OP #{c.numero} • {c.produto}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Lote de {c.qtdProduzida} un • Concluído em {c.data}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block">Custo Padrão:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(c.custoPadrao)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Custo Real:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {formatCurrency(c.custoReal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Variação:</span>
                  <span
                    className={`font-black ${
                      c.variacao > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {c.variacao > 0 ? '+' : ''}
                    {formatCurrency(c.variacao)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report View: Perdas e Consumo */}
      {relatorioTipo === 'perdas_consumo' && (
        <div className="space-y-2.5">
          {relatorioPerdas.map((p, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-center text-xs"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">OP #{p.op}</span>
                <h4 className="font-bold text-slate-900 dark:text-white">{p.insumo}</h4>
                <div className="text-[11px] text-slate-500">
                  Prev: {p.previsto} {p.unidade} • Real: {p.real} {p.unidade}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-bold ${
                    p.diferenca > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {p.diferenca > 0 ? '+' : ''}
                  {p.diferenca} {p.unidade} ({p.percentual}%)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {p.diferenca > 0 ? 'Desperdício / Perda' : 'Economia'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report View: Atraso */}
      {relatorioTipo === 'atraso' && (
        <div className="space-y-2">
          {relatorioAtraso.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Nenhum título em atraso.</p>
          ) : (
            relatorioAtraso.map((a, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-xs flex justify-between items-center"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{a.descricao}</h4>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">
                    Vencido em: {a.vencimento} • {a.pessoa}
                  </div>
                </div>
                <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(a.valor)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Report View: Ranking Clientes */}
      {relatorioTipo === 'ranking_clientes' && (
        <div className="space-y-2">
          {relatorioRankingClientes.map((r, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-black text-xs flex items-center justify-center shrink-0">
                  {i + 1}º
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{r.cliente}</h4>
                  <div className="text-[11px] text-slate-500">
                    {r.pedidosCount} {r.pedidosCount === 1 ? 'pedido' : 'pedidos'} faturados
                  </div>
                </div>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {formatCurrency(r.totalCentavos)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
