import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  Plus,
  Truck,
  History,
  Search,
  X,
  Package,
  Trash2,
} from 'lucide-react';
import { db, ajustarEstoqueManual, receberCompra } from '../db';
import { formatCurrency, formatDateBr, formatDateTimeBr, todayIsoDate, formatNumber } from '../utils/formatters';
import { Produto, MovimentoEstoque, Compra, ItemCompra, Pessoa, FormaPagamento } from '../types';
import { QuantityInput } from '../components/common/QuantityInput';
import { MoneyInput } from '../components/common/MoneyInput';

export const EstoqueView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'saldos' | 'movimentos' | 'compras'>('saldos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<Pessoa[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [apenasAbaixoMinimo, setApenasAbaixoMinimo] = useState(false);

  // Modal Ajuste Manual
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [produtoAjuste, setProdutoAjuste] = useState<Produto | null>(null);
  const [novoEstoqueAjuste, setNovoEstoqueAjuste] = useState<number>(0);
  const [motivoAjuste, setMotivoAjuste] = useState('');

  // Modal Nova Compra
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false);
  const [compraFornecedorId, setCompraFornecedorId] = useState('');
  const [compraFormaPagamentoId, setCompraFormaPagamentoId] = useState('');
  const [compraParcelas, setCompraParcelas] = useState(1);
  const [compraItens, setCompraItens] = useState<ItemCompra[]>([]);

  const carregarDados = async () => {
    const todosProds = await db.produtos.filter((p) => !p.excluido).toArray();
    setProdutos(todosProds);

    const todosMovs = await db.movimentosEstoque.filter((m) => !m.excluido).reverse().toArray();
    setMovimentos(todosMovs);

    const todasCompras = await db.compras.filter((c) => !c.excluido).reverse().toArray();
    setCompras(todasCompras);

    const forns = await db.pessoas.filter((p) => !p.excluido && p.isFornecedor).toArray();
    setFornecedores(forns);

    const fps = await db.formasPagamento.filter((f) => !f.excluido).toArray();
    setFormasPagamento(fps);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirAjuste = (p: Produto) => {
    setProdutoAjuste(p);
    setNovoEstoqueAjuste(p.estoqueAtual);
    setMotivoAjuste('Ajuste de inventário / contagem física');
    setIsAjusteModalOpen(true);
  };

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoAjuste || !motivoAjuste) return;

    try {
      await ajustarEstoqueManual(produtoAjuste.id, novoEstoqueAjuste, motivoAjuste);
      setIsAjusteModalOpen(false);
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao ajustar estoque: ' + err.message);
    }
  };

  const abrirNovaCompra = () => {
    const forns = fornecedores;
    setCompraFornecedorId(forns[0]?.id || '');
    setCompraFormaPagamentoId(formasPagamento[0]?.id || '');
    setCompraParcelas(1);

    const mps = produtos.filter((p) => p.tipo === 'materia_prima' || p.tipo === 'embalagem');
    if (mps.length > 0) {
      setCompraItens([
        {
          materiaPrimaId: mps[0].id,
          quantidade: 50,
          precoUnitarioCentavos: mps[0].precoCustoCentavos,
          totalCentavos: 50 * mps[0].precoCustoCentavos,
        },
      ]);
    } else {
      setCompraItens([]);
    }

    setIsCompraModalOpen(true);
  };

  const handleAddItemCompra = () => {
    const mps = produtos.filter((p) => p.tipo === 'materia_prima' || p.tipo === 'embalagem');
    if (mps.length === 0) return;
    setCompraItens((prev) => [
      ...prev,
      {
        materiaPrimaId: mps[0].id,
        quantidade: 10,
        precoUnitarioCentavos: mps[0].precoCustoCentavos,
        totalCentavos: 10 * mps[0].precoCustoCentavos,
      },
    ]);
  };

  const handleRemoveItemCompra = (idx: number) => {
    setCompraItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemCompra = (idx: number, field: keyof ItemCompra, val: any) => {
    setCompraItens((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      if (field === 'materiaPrimaId') {
        const prod = produtos.find((p) => p.id === val);
        if (prod) copy[idx].precoUnitarioCentavos = prod.precoCustoCentavos;
      }
      copy[idx].totalCentavos = Math.round(copy[idx].quantidade * copy[idx].precoUnitarioCentavos);
      return copy;
    });
  };

  const handleSalvarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraFornecedorId || compraItens.length === 0) {
      alert('Selecione fornecedor e ao menos um item de compra.');
      return;
    }

    const agora = new Date().toISOString();
    const count = await db.compras.count();
    const numero = count + 301;
    const compraId = 'cmp_' + Date.now();
    const total = compraItens.reduce((acc, it) => acc + it.totalCentavos, 0);

    await db.compras.add({
      id: compraId,
      numero,
      fornecedorId: compraFornecedorId,
      itens: compraItens,
      totalCentavos: total,
      formaPagamentoId: compraFormaPagamentoId,
      numeroParcelas: compraParcelas,
      status: 'pendente',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsCompraModalOpen(false);
    await carregarDados();
  };

  const handleReceberCompra = async (compra: Compra) => {
    if (!window.confirm(`Dar entrada no estoque e gerar contas a pagar da Compra #${compra.numero}?`)) {
      return;
    }
    try {
      await receberCompra(compra.id);
      await carregarDados();
      alert(`Compra #${compra.numero} recebida! Estoque atualizado e contas a pagar geradas.`);
    } catch (err: any) {
      alert('Erro ao receber compra: ' + err.message);
    }
  };

  // Filtragem de produtos
  const produtosFiltrados = produtos
    .filter((p) => {
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
      if (apenasAbaixoMinimo && p.estoqueAtual >= p.estoqueMinimo) return false;
      if (searchTerm) {
        return (
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    });

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Estoque & Materiais</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saldos, compras de insumos e movimentações
          </p>
        </div>
        <button
          onClick={abrirNovaCompra}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Truck className="w-4 h-4" />
          <span>Comprar Insumos</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('saldos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'saldos'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Saldos de Estoque</span>
        </button>
        <button
          onClick={() => setActiveTab('movimentos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'movimentos'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Histórico</span>
        </button>
        <button
          onClick={() => setActiveTab('compras')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'compras'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Compras de MP</span>
        </button>
      </div>

      {/* Tab: Saldos */}
      {activeTab === 'saldos' && (
        <div className="space-y-3">
          {/* Filters & Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'materia_prima', label: 'Matérias-Primas' },
                { id: 'produto_acabado', label: 'Produtos Acabados' },
                { id: 'embalagem', label: 'Embalagens' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroTipo(f.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 transition ${
                    filtroTipo === f.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                onClick={() => setApenasAbaixoMinimo(!apenasAbaixoMinimo)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 transition ${
                  apenasAbaixoMinimo
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Abaixo do Mínimo</span>
              </button>
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-2.5">
            {produtosFiltrados.map((p) => {
              const isAbaixoMinimo = p.estoqueAtual < p.estoqueMinimo;

              return (
                <div
                  key={p.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border shadow-xs transition ${
                    isAbaixoMinimo
                      ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/10'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.codigo}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.nome}
                        </h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span className="capitalize">{p.tipo.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>Custo: {formatCurrency(p.precoCustoCentavos)}</span>
                        {p.tipo === 'produto_acabado' && (
                          <>
                            <span>•</span>
                            <span>Venda: {formatCurrency(p.precoVendaCentavos)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-black ${
                          isAbaixoMinimo
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatNumber(p.estoqueAtual)} {p.unidade}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Mínimo: {p.estoqueMinimo} {p.unidade}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      {isAbaixoMinimo && (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Repor {(p.estoqueMinimo - p.estoqueAtual).toFixed(1)} {p.unidade}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => abrirAjuste(p)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Ajuste Manual</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Movimentos de Estoque */}
      {activeTab === 'movimentos' && (
        <div className="space-y-2">
          {movimentos.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhum movimento de estoque registrado
              </h3>
            </div>
          ) : (
            movimentos.map((m) => {
              const prod = produtos.find((p) => p.id === m.produtoId);
              const isEntrada = m.tipo === 'entrada';
              const isAjuste = m.tipo === 'ajuste';

              return (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isEntrada
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                          : isAjuste
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                      }`}
                    >
                      {isEntrada ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : isAjuste ? (
                        <Sliders className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {prod?.nome || 'Item'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {m.motivo} • {formatDateTimeBr(m.dataCriacao)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-black ${
                        isEntrada
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isAjuste
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isEntrada ? '+' : isAjuste ? '±' : '-'}
                      {m.quantidade} {prod?.unidade}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Saldo: {m.quantidadePosterior} {prod?.unidade}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Compras */}
      {activeTab === 'compras' && (
        <div className="space-y-3">
          {compras.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhuma compra de matéria-prima registrada
              </h3>
            </div>
          ) : (
            compras.map((c) => {
              const forn = fornecedores.find((f) => f.id === c.fornecedorId);
              const isRecebido = c.status === 'recebido';

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          Compra #{c.numero}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {forn?.nome || 'Fornecedor'}
                        </h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {formatDateBr(c.dataCriacao)} • {c.itens.length} {c.itens.length === 1 ? 'item' : 'itens'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {formatCurrency(c.totalCentavos)}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                          isRecebido
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isRecebido && (
                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleReceberCompra(c)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                      >
                        Dar Entrada no Estoque
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Ajuste Manual de Estoque */}
      {isAjusteModalOpen && produtoAjuste && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Ajuste Manual de Estoque</h3>
                <p className="text-[11px] text-slate-500">{produtoAjuste.nome}</p>
              </div>
              <button
                onClick={() => setIsAjusteModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarAjuste} className="space-y-3.5">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Saldo Atual em Estoque:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {produtoAjuste.estoqueAtual} {produtoAjuste.unidade}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Novo Saldo Real Contado *
                </label>
                <QuantityInput
                  min={0}
                  step={1}
                  value={novoEstoqueAjuste}
                  onChange={(val) => setNovoEstoqueAjuste(val)}
                  unit={produtoAjuste?.unidade}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo do Ajuste *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contagem física de inventário, perda por validade..."
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Confirmar Ajuste
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Compra */}
      {isCompraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nova Compra de Matéria-Prima</h3>
                <p className="text-[11px] text-slate-500">Entrada de insumos e contas a pagar</p>
              </div>
              <button
                onClick={() => setIsCompraModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCompra} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fornecedor *
                </label>
                <select
                  value={compraFornecedorId}
                  onChange={(e) => setCompraFornecedorId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Itens da Compra *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemCompra}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                {compraItens.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 min-w-0"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Item / Descrição da Matéria-Prima
                        </label>
                        {compraItens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemCompra(idx)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={it.materiaPrimaId}
                        onChange={(e) => handleUpdateItemCompra(idx, 'materiaPrimaId', e.target.value)}
                        className="w-full min-w-0 truncate bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {produtos
                          .filter((p) => p.tipo === 'materia_prima' || p.tipo === 'embalagem')
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.unidade})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end min-w-0">
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Qtd Comprada</span>
                        <QuantityInput
                          size="sm"
                          min={0.001}
                          step={1}
                          decimals={3}
                          value={it.quantidade}
                          onChange={(val) => handleUpdateItemCompra(idx, 'quantidade', val)}
                          unit={produtos.find((p) => p.id === it.materiaPrimaId)?.unidade}
                          className="w-full min-w-0"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Preço Custo Unit.</span>
                        <MoneyInput
                          valueCentavos={it.precoUnitarioCentavos}
                          onChange={(val) => handleUpdateItemCompra(idx, 'precoUnitarioCentavos', val)}
                          size="sm"
                          className="w-full min-w-0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={compraFormaPagamentoId}
                    onChange={(e) => setCompraFormaPagamentoId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    {formasPagamento.map((fp) => (
                      <option key={fp.id} value={fp.id}>
                        {fp.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Parcelas a Pagar
                  </label>
                  <QuantityInput
                    size="sm"
                    min={1}
                    max={60}
                    step={1}
                    value={compraParcelas}
                    onChange={(val) => setCompraParcelas(val)}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Salvar Compra de Insumos
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
