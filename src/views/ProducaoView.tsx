import React, { useState, useEffect } from 'react';
import {
  Cog,
  FileSpreadsheet,
  Plus,
  Play,
  CheckCircle,
  AlertTriangle,
  X,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, concluirOrdemProducao } from '../db';
import {
  formatCurrency,
  formatDateBr,
  todayIsoDate,
  addDaysIso,
  formatNumber,
} from '../utils/formatters';
import {
  calculateFichaCost,
  calculateProductionRequirements,
  calculateLossVariance,
} from '../utils/calculations';
import {
  Produto,
  FichaTecnica,
  OrdemProducao,
  InsumoFicha,
} from '../types';
import { QuantityInput } from '../components/common/QuantityInput';
import { MoneyInput } from '../components/common/MoneyInput';

export const ProducaoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ordens' | 'fichas'>('ordens');
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [produtosAcabados, setProdutosAcabados] = useState<Produto[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<Produto[]>([]);

  // Modals state
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);
  const [isOrdemModalOpen, setIsOrdemModalOpen] = useState(false);
  const [isConcluirModalOpen, setIsConcluirModalOpen] = useState(false);
  const [ordemParaConcluir, setOrdemParaConcluir] = useState<OrdemProducao | null>(null);

  // Form Ficha Técnica
  const [fichaNome, setFichaNome] = useState('');
  const [fichaProdutoAcabadoId, setFichaProdutoAcabadoId] = useState('');
  const [fichaRendimento, setFichaRendimento] = useState(10);
  const [fichaPerdaPercentual, setFichaPerdaPercentual] = useState(5);
  const [fichaMaoDeObraCentavos, setFichaMaoDeObraCentavos] = useState(1500);
  const [fichaEnergiaCentavos, setFichaEnergiaCentavos] = useState(500);
  const [fichaInsumos, setFichaInsumos] = useState<InsumoFicha[]>([]);

  // Form Nova Ordem de Produção
  const [opTipo, setOpTipo] = useState<'estoque' | 'encomenda'>('estoque');
  const [opProdutoId, setOpProdutoId] = useState('');
  const [opFichaId, setOpFichaId] = useState('');
  const [opQuantidade, setOpQuantidade] = useState(20);
  const [opDataPrevista, setOpDataPrevista] = useState(addDaysIso(todayIsoDate(), 2));

  // Form Concluir OP
  const [concluirQtdProduzida, setConcluirQtdProduzida] = useState(0);
  const [concluirInsumosConsumidos, setConcluirInsumosConsumidos] = useState<
    Array<{
      materiaPrimaId: string;
      quantidadeReal: number;
      quantidadePrevista: number;
      custoTotalCentavos: number;
    }>
  >([]);
  const [concluirMaoDeObraCentavos, setConcluirMaoDeObraCentavos] = useState(0);
  const [concluirEnergiaCentavos, setConcluirEnergiaCentavos] = useState(0);
  const [concluirEmbalagemCentavos, setConcluirEmbalagemCentavos] = useState(0);
  const [concluirOutrosCentavos, setConcluirOutrosCentavos] = useState(0);

  const carregarDados = async () => {
    const todasOps = await db.ordensProducao.filter((o) => !o.excluido).reverse().toArray();
    setOrdens(todasOps);

    const todasFichas = await db.fichasTecnicas.filter((f) => !f.excluido).toArray();
    setFichas(todasFichas);

    const todosProds = await db.produtos.filter((p) => !p.excluido).toArray();
    setProdutosAcabados(todosProds.filter((p) => p.tipo === 'produto_acabado'));
    setMateriasPrimas(
      todosProds.filter((p) => p.tipo === 'materia_prima' || p.tipo === 'embalagem')
    );
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // --- Handlers Ficha Técnica ---
  const abrirNovaFicha = () => {
    const prodPadrao = produtosAcabados[0]?.id || '';
    setFichaProdutoAcabadoId(prodPadrao);
    setFichaNome(produtosAcabados[0] ? `Ficha Padrão - ${produtosAcabados[0].nome}` : 'Nova Receita');
    setFichaRendimento(10);
    setFichaPerdaPercentual(5);
    setFichaMaoDeObraCentavos(1500);
    setFichaEnergiaCentavos(500);

    if (materiasPrimas.length > 0) {
      setFichaInsumos([
        { materiaPrimaId: materiasPrimas[0].id, quantidade: 2 },
      ]);
    } else {
      setFichaInsumos([]);
    }

    setIsFichaModalOpen(true);
  };

  const handleAddInsumoFicha = () => {
    if (materiasPrimas.length === 0) return;
    setFichaInsumos((prev) => [
      ...prev,
      { materiaPrimaId: materiasPrimas[0].id, quantidade: 1 },
    ]);
  };

  const handleRemoveInsumoFicha = (idx: number) => {
    setFichaInsumos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateInsumoFicha = (idx: number, field: keyof InsumoFicha, val: any) => {
    setFichaInsumos((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Custo calculado em tempo real para a ficha
  const insumosParaCalculo = fichaInsumos.map((item) => {
    const mp = materiasPrimas.find((m) => m.id === item.materiaPrimaId);
    return {
      materiaPrimaId: item.materiaPrimaId,
      quantidade: item.quantidade,
      precoCustoCentavos: mp?.precoCustoCentavos || 0,
    };
  });

  const fichaCalculada = calculateFichaCost(
    insumosParaCalculo,
    fichaRendimento,
    fichaPerdaPercentual,
    fichaMaoDeObraCentavos,
    fichaEnergiaCentavos
  );

  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fichaProdutoAcabadoId || fichaInsumos.length === 0) {
      alert('Selecione o produto acabado e adicione ao menos um insumo.');
      return;
    }

    const agora = new Date().toISOString();
    const id = 'ft_' + Date.now();

    await db.fichasTecnicas.add({
      id,
      produtoAcabadoId: fichaProdutoAcabadoId,
      nome: fichaNome || 'Receita Técnica',
      rendimento: fichaRendimento,
      perdaPercentual: fichaPerdaPercentual,
      custoMaoDeObraPadraoCentavos: fichaMaoDeObraCentavos,
      custoEnergiaOutrosPadraoCentavos: fichaEnergiaCentavos,
      insumos: fichaInsumos,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsFichaModalOpen(false);
    await carregarDados();
  };

  // --- Handlers Nova Ordem de Produção ---
  const abrirNovaOrdem = () => {
    const prodPadrao = produtosAcabados[0]?.id || '';
    setOpProdutoId(prodPadrao);

    const fichaRelacionada = fichas.find((f) => f.produtoAcabadoId === prodPadrao);
    setOpFichaId(fichaRelacionada?.id || fichas[0]?.id || '');
    setOpQuantidade(fichaRelacionada?.rendimento || 20);
    setOpTipo('estoque');
    setOpDataPrevista(addDaysIso(todayIsoDate(), 2));

    setIsOrdemModalOpen(true);
  };

  // Quando troca o produto na OP, ajusta a ficha técnica correspondente
  const handleTrocaProdutoOp = (prodId: string) => {
    setOpProdutoId(prodId);
    const ficha = fichas.find((f) => f.produtoAcabadoId === prodId);
    if (ficha) {
      setOpFichaId(ficha.id);
      setOpQuantidade(ficha.rendimento);
    }
  };

  const fichaSelecionadaOp = fichas.find((f) => f.id === opFichaId);

  // Cálculo da necessidade de insumos e checagem de estoque
  const necessidadesInsumos = fichaSelecionadaOp
    ? calculateProductionRequirements(
        fichaSelecionadaOp.insumos,
        fichaSelecionadaOp.rendimento,
        opQuantidade
      ).map((req) => {
        const mp = materiasPrimas.find((m) => m.id === req.materiaPrimaId);
        const estoqueDisponivel = mp?.estoqueAtual || 0;
        const falta = req.quantidadeNecessaria > estoqueDisponivel;
        return {
          ...req,
          nome: mp?.nome || 'Insumo',
          unidade: mp?.unidade || 'UN',
          estoqueDisponivel,
          falta,
        };
      })
    : [];

  const temEstoqueFaltando = necessidadesInsumos.some((n) => n.falta);

  const handleSalvarOrdem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opProdutoId || !opFichaId) {
      alert('Selecione o produto e a ficha técnica.');
      return;
    }

    const agora = new Date().toISOString();
    const countOps = await db.ordensProducao.count();
    const numero = countOps + 101;
    const opId = 'op_' + Date.now();

    await db.ordensProducao.add({
      id: opId,
      numero,
      tipo: opTipo,
      produtoAcabadoId: opProdutoId,
      fichaTecnicaId: opFichaId,
      quantidadePlanejada: opQuantidade,
      dataPrevista: opDataPrevista,
      status: 'planejada',
      insumosPrevistos: necessidadesInsumos.map((n) => ({
        materiaPrimaId: n.materiaPrimaId,
        quantidadePrevista: n.quantidadeNecessaria,
      })),
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsOrdemModalOpen(false);
    await carregarDados();
  };

  const handleIniciarProducao = async (op: OrdemProducao) => {
    const agora = new Date().toISOString();
    await db.ordensProducao.update(op.id, {
      status: 'em_producao',
      dataAlteracao: agora,
    });
    await carregarDados();
  };

  // --- Handlers Concluir Ordem ---
  const abrirConcluirOrdem = (op: OrdemProducao) => {
    setOrdemParaConcluir(op);
    setConcluirQtdProduzida(op.quantidadePlanejada);

    // Carrega insumos consumidos com valores padrão baseados no planejado
    const insumosCons = op.insumosPrevistos.map((p) => {
      const mp = materiasPrimas.find((m) => m.id === p.materiaPrimaId);
      const custoUnit = mp?.precoCustoCentavos || 0;
      return {
        materiaPrimaId: p.materiaPrimaId,
        quantidadePrevista: p.quantidadePrevista,
        quantidadeReal: p.quantidadePrevista,
        custoTotalCentavos: Math.round(p.quantidadePrevista * custoUnit),
      };
    });

    setConcluirInsumosConsumidos(insumosCons);

    // Busca a ficha para puxar os custos extras padrão
    const ficha = fichas.find((f) => f.id === op.fichaTecnicaId);
    setConcluirMaoDeObraCentavos(ficha?.custoMaoDeObraPadraoCentavos || 2000);
    setConcluirEnergiaCentavos(ficha?.custoEnergiaOutrosPadraoCentavos || 800);
    setConcluirEmbalagemCentavos(0);
    setConcluirOutrosCentavos(0);

    setIsConcluirModalOpen(true);
  };

  const handleUpdateConsumoReal = (idx: number, realQty: number) => {
    setConcluirInsumosConsumidos((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      const mp = materiasPrimas.find((m) => m.id === item.materiaPrimaId);
      const custoUnit = mp?.precoCustoCentavos || 0;
      copy[idx] = {
        ...item,
        quantidadeReal: realQty,
        custoTotalCentavos: Math.round(realQty * custoUnit),
      };
      return copy;
    });
  };

  const handleFinalizarConclusao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordemParaConcluir) return;

    try {
      const result = await concluirOrdemProducao(
        ordemParaConcluir.id,
        concluirQtdProduzida,
        concluirInsumosConsumidos.map((i) => ({
          materiaPrimaId: i.materiaPrimaId,
          quantidadeReal: i.quantidadeReal,
          custoTotalCentavos: i.custoTotalCentavos,
        })),
        {
          maoDeObraCentavos: concluirMaoDeObraCentavos,
          energiaCentavos: concluirEnergiaCentavos,
          embalagemCentavos: concluirEmbalagemCentavos,
          outrosCentavos: concluirOutrosCentavos,
        }
      );

      // Trigger Confetti effect
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}

      setIsConcluirModalOpen(false);
      await carregarDados();
      alert(
        `Lote concluído com sucesso!\nNovo Custo Unitário Real: ${formatCurrency(
          result.custoUnitarioRealCentavos
        )}\nEstoque atualizado e preço de custo recalculado.`
      );
    } catch (err: any) {
      alert('Erro ao concluir ordem: ' + err.message);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Produção & PCP</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fichas técnicas, ordens de serviço e custos reais
          </p>
        </div>
        <button
          onClick={activeTab === 'ordens' ? abrirNovaOrdem : abrirNovaFicha}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'ordens' ? 'Nova OP' : 'Nova Receita'}</span>
        </button>
      </div>

      {/* Segmented Switcher */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('ordens')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ordens'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Cog className="w-3.5 h-3.5" />
          <span>Ordens de Produção</span>
        </button>
        <button
          onClick={() => setActiveTab('fichas')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'fichas'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Fichas Técnicas (Receitas)</span>
        </button>
      </div>

      {/* Tab 1: Ordens de Produção */}
      {activeTab === 'ordens' && (
        <div className="space-y-3">
          {ordens.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <Cog className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhuma ordem de produção
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Toque em "Nova OP" para planejar um lote para estoque ou encomenda.
              </p>
            </div>
          ) : (
            ordens.map((op) => {
              const prod = produtosAcabados.find((p) => p.id === op.produtoAcabadoId);
              const isConcluida = op.status === 'concluida';
              const isEmProducao = op.status === 'em_producao';

              return (
                <div
                  key={op.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                          OP #{op.numero}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {prod?.nome || 'Produto Acabado'}
                        </h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>Previsão: {formatDateBr(op.dataPrevista)}</span>
                        <span>•</span>
                        <span className="capitalize">{op.tipo === 'encomenda' ? '📦 Encomenda' : '🏭 Estoque'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {isConcluida ? `${op.quantidadeProduzida} un produzidas` : `${op.quantidadePlanejada} un planejadas`}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                          isConcluida
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : isEmProducao
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {op.status === 'em_producao' ? 'Em Produção' : op.status}
                      </span>
                    </div>
                  </div>

                  {/* Se concluída: mostra custo real e perdas */}
                  {isConcluida && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Custo Unitário Real Calculado:
                        </span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatCurrency(op.custoUnitarioRealCentavos)}
                        </span>
                      </div>

                      {/* Consumo Previsto vs Real */}
                      {op.insumosConsumidosReal && (
                        <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/30">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Consumo Real vs Previsto (Perdas):
                          </span>
                          <div className="space-y-1">
                            {op.insumosConsumidosReal.map((cr, idx) => {
                              const mp = materiasPrimas.find((m) => m.id === cr.materiaPrimaId);
                              const previsto = op.insumosPrevistos[idx]?.quantidadePrevista || 0;
                              const variance = calculateLossVariance(previsto, cr.quantidadeReal);

                              return (
                                <div key={idx} className="flex justify-between text-[11px]">
                                  <span className="text-slate-600 dark:text-slate-400">
                                    {mp?.nome}:
                                  </span>
                                  <span className="font-medium">
                                    Real: {cr.quantidadeReal} {mp?.unidade} (Prev: {previsto} {mp?.unidade}){' '}
                                    {variance.diferenca !== 0 && (
                                      <span
                                        className={
                                          variance.temDesperdicio
                                            ? 'text-rose-600 font-bold'
                                            : 'text-emerald-600 font-bold'
                                        }
                                      >
                                        ({variance.diferenca > 0 ? '+' : ''}
                                        {variance.percentual}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions for Planned / In Production */}
                  {!isConcluida && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {op.status === 'planejada' && (
                        <button
                          onClick={() => handleIniciarProducao(op)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Iniciar Produção</span>
                        </button>
                      )}

                      {op.status === 'em_producao' && (
                        <button
                          onClick={() => abrirConcluirOrdem(op)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Apontar & Concluir</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Fichas Técnicas */}
      {activeTab === 'fichas' && (
        <div className="space-y-3">
          {fichas.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhuma ficha técnica cadastrada
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Cadastre receitas técnicas para calcular custos e planejar compras.
              </p>
            </div>
          ) : (
            fichas.map((f) => {
              const prod = produtosAcabados.find((p) => p.id === f.produtoAcabadoId);
              const insumosCalc = f.insumos.map((i) => {
                const mp = materiasPrimas.find((m) => m.id === i.materiaPrimaId);
                return {
                  materiaPrimaId: i.materiaPrimaId,
                  quantidade: i.quantidade,
                  precoCustoCentavos: mp?.precoCustoCentavos || 0,
                };
              });
              const calc = calculateFichaCost(
                insumosCalc,
                f.rendimento,
                f.perdaPercentual,
                f.custoMaoDeObraPadraoCentavos,
                f.custoEnergiaOutrosPadraoCentavos
              );

              return (
                <div
                  key={f.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {f.nome}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Produto: {prod?.nome || 'N/D'} • Rendimento: {f.rendimento} un (Perda: {f.perdaPercentual}%)
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Custo Unit. Padrão
                      </span>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400">
                        {formatCurrency(calc.custoUnitarioPadraoCentavos)}
                      </div>
                    </div>
                  </div>

                  {/* List of raw materials in recipe */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Insumos por Batelada ({f.rendimento} un):
                    </span>
                    {f.insumos.map((ins, i) => {
                      const mp = materiasPrimas.find((m) => m.id === ins.materiaPrimaId);
                      return (
                        <div key={i} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                          <span>{mp?.nome || 'Insumo'}</span>
                          <span className="font-semibold">
                            {ins.quantidade} {mp?.unidade}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Nova Ficha Técnica */}
      {isFichaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nova Ficha Técnica (Receita)</h3>
                <p className="text-[11px] text-slate-500">Defina os insumos, rendimento e perdas</p>
              </div>
              <button
                onClick={() => setIsFichaModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarFicha} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Receita / Ficha
                </label>
                <input
                  type="text"
                  required
                  value={fichaNome}
                  onChange={(e) => setFichaNome(e.target.value)}
                  placeholder="Ex: Receita Biscoito Amanteigado 20 un"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Produto Acabado Resultante *
                </label>
                <select
                  value={fichaProdutoAcabadoId}
                  onChange={(e) => setFichaProdutoAcabadoId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {produtosAcabados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rendimento da Receita (un) *
                  </label>
                  <QuantityInput
                    min={1}
                    step={1}
                    value={fichaRendimento}
                    onChange={(val) => setFichaRendimento(val)}
                    unit="un"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Perda Estimada (%)
                  </label>
                  <QuantityInput
                    min={0}
                    max={50}
                    step={0.5}
                    decimals={1}
                    value={fichaPerdaPercentual}
                    onChange={(val) => setFichaPerdaPercentual(val)}
                    unit="%"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Custos adicionais de mão de obra e energia */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mão de Obra Padrão
                  </label>
                  <MoneyInput
                    valueCentavos={fichaMaoDeObraCentavos}
                    onChange={(val) => setFichaMaoDeObraCentavos(val)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Energia / Outros Padrão
                  </label>
                  <MoneyInput
                    valueCentavos={fichaEnergiaCentavos}
                    onChange={(val) => setFichaEnergiaCentavos(val)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Insumos */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Lista de Insumos / Matérias-Primas *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddInsumoFicha}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Insumo
                  </button>
                </div>

                {fichaInsumos.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 min-w-0"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Insumo / Matéria-Prima
                        </label>
                        {fichaInsumos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInsumoFicha(idx)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                            title="Remover insumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={it.materiaPrimaId}
                        onChange={(e) => handleUpdateInsumoFicha(idx, 'materiaPrimaId', e.target.value)}
                        className="w-full min-w-0 truncate bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {materiasPrimas.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.unidade}) - Custo: {formatCurrency(m.precoCustoCentavos)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Quantidade por Batelada / Receita
                      </span>
                      <QuantityInput
                        size="sm"
                        min={0.001}
                        step={0.1}
                        decimals={3}
                        value={it.quantidade}
                        onChange={(val) => handleUpdateInsumoFicha(idx, 'quantidade', val)}
                        unit={materiasPrimas.find((m) => m.id === it.materiaPrimaId)?.unidade}
                        className="w-full min-w-0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-time Calculated Cost Card */}
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Custo Total da Batelada:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(fichaCalculada.custoTotalReceitaCentavos)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-sky-800 dark:text-sky-300 font-bold">
                    Custo Unitário Padrão Calculado:
                  </span>
                  <span className="font-black text-sky-700 dark:text-sky-300 text-sm">
                    {formatCurrency(fichaCalculada.custoUnitarioPadraoCentavos)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Salvar Ficha Técnica
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Ordem de Produção */}
      {isOrdemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nova Ordem de Produção (OP)</h3>
                <p className="text-[11px] text-slate-500">Planejamento e checagem de estoque de insumos</p>
              </div>
              <button
                onClick={() => setIsOrdemModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarOrdem} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOpTipo('estoque')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    opTipo === 'estoque' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Para Estoque
                </button>
                <button
                  type="button"
                  onClick={() => setOpTipo('encomenda')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    opTipo === 'encomenda' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Sob Encomenda
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Produto Acabado *
                </label>
                <select
                  value={opProdutoId}
                  onChange={(e) => handleTrocaProdutoOp(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {produtosAcabados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Estoque atual: {p.estoqueAtual} {p.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ficha Técnica (Receita) *
                </label>
                <select
                  value={opFichaId}
                  onChange={(e) => setOpFichaId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {fichas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} (Rendimento: {f.rendimento} un)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade Planejada (un) *
                  </label>
                  <QuantityInput
                    min={1}
                    step={1}
                    value={opQuantidade}
                    onChange={(val) => setOpQuantidade(val)}
                    unit="un"
                    quickAddButtons={[10, 50, 100]}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Prevista de Conclusão
                  </label>
                  <input
                    type="date"
                    required
                    value={opDataPrevista}
                    onChange={(e) => setOpDataPrevista(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Requirement Check & Alert */}
              <div className="pt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Necessidade de Matéria-Prima & Checagem de Estoque
                  </h4>
                  {temEstoqueFaltando ? (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Estoque Insuficiente
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      Estoque Suficiente
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                  {necessidadesInsumos.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs pb-1 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {req.nome}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Disponível em estoque: {req.estoqueDisponivel} {req.unidade}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            req.falta ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Necessário: {req.quantidadeNecessaria} {req.unidade}
                        </div>
                        {req.falta && (
                          <div className="text-[10px] text-rose-500 font-bold">
                            Faltam {(req.quantidadeNecessaria - req.estoqueDisponivel).toFixed(2)} {req.unidade}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {temEstoqueFaltando && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Aviso: O estoque atual de matérias-primas não cobre toda a ordem. Você ainda pode criar a OP para planejamento, mas precisará comprar os insumos faltantes antes de concluir.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Criar Ordem de Produção
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Concluir Ordem de Produção */}
      {isConcluirModalOpen && ordemParaConcluir && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Concluir OP #{ordemParaConcluir.numero}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Aponte a quantidade produzida e o consumo real de insumos
                </p>
              </div>
              <button
                onClick={() => setIsConcluirModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalizarConclusao} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {/* Quantidade Produzida Real */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade Realmente Produzida (un) *
                </label>
                <QuantityInput
                  min={1}
                  step={1}
                  value={concluirQtdProduzida}
                  onChange={(val) => setConcluirQtdProduzida(val)}
                  unit="un"
                  quickAddButtons={[1, 5, 10]}
                  className="w-full"
                />
              </div>

              {/* Insumos Consumidos Realmente */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Consumo Real de Matéria-Prima (com perdas) *
                </label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {concluirInsumosConsumidos.map((item, idx) => {
                    const mp = materiasPrimas.find((m) => m.id === item.materiaPrimaId);
                    const variance = calculateLossVariance(item.quantidadePrevista, item.quantidadeReal);

                    return (
                      <div key={idx} className="space-y-1 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0 last:pb-0">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {mp?.nome} ({mp?.unidade})
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            Previsto: {item.quantidadePrevista} {mp?.unidade}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <QuantityInput
                              size="sm"
                              min={0}
                              step={0.1}
                              decimals={3}
                              value={item.quantidadeReal}
                              onChange={(val) => handleUpdateConsumoReal(idx, val)}
                              unit={mp?.unidade}
                              className="w-full"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 w-24 text-right">
                            = {formatCurrency(item.custoTotalCentavos)}
                          </span>
                        </div>
                        {variance.diferenca !== 0 && (
                          <div
                            className={`text-[10px] font-semibold ${
                              variance.temDesperdicio ? 'text-rose-500' : 'text-emerald-500'
                            }`}
                          >
                            Variação: {variance.diferenca > 0 ? '+' : ''}{variance.diferenca} {mp?.unidade} ({variance.percentual}%)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custos Adicionais da Ordem */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Custos Adicionais da Produção (Rateio)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Mão de Obra</span>
                    <MoneyInput
                      valueCentavos={concluirMaoDeObraCentavos}
                      onChange={(val) => setConcluirMaoDeObraCentavos(val)}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Energia / Gás</span>
                    <MoneyInput
                      valueCentavos={concluirEnergiaCentavos}
                      onChange={(val) => setConcluirEnergiaCentavos(val)}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Embalagens Extras</span>
                    <MoneyInput
                      valueCentavos={concluirEmbalagemCentavos}
                      onChange={(val) => setConcluirEmbalagemCentavos(val)}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Outros Custos</span>
                    <MoneyInput
                      valueCentavos={concluirOutrosCentavos}
                      onChange={(val) => setConcluirOutrosCentavos(val)}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo do Novo Custo Unitário */}
              {(() => {
                const totalInsumos = concluirInsumosConsumidos.reduce((acc, c) => acc + c.custoTotalCentavos, 0);
                const totalExtras = concluirMaoDeObraCentavos + concluirEnergiaCentavos + concluirEmbalagemCentavos + concluirOutrosCentavos;
                const totalGeral = totalInsumos + totalExtras;
                const unitReal = Math.round(totalGeral / (concluirQtdProduzida || 1));

                return (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3.5 rounded-xl space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Custo Total do Lote:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(totalGeral)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <span>Novo Custo Unitário Real Calculado:</span>
                      <span className="text-base font-black">
                        {formatCurrency(unitReal)} / un
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      O app dará baixa nos insumos, entrada nas {concluirQtdProduzida} un do produto acabado e atualizará o preço de custo.
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Confirmar Conclusão da Produção
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
