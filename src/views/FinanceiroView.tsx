import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  X,
  TrendingUp,
  AlertCircle,
  Building,
  BookOpen,
} from 'lucide-react';
import { db, baixarContaFinanceira } from '../db';
import {
  formatCurrency,
  formatDateBr,
  todayIsoDate,
  addDaysIso,
  getDueDateStatus,
} from '../utils/formatters';
import { ContaFinanceiraItem, ContaBancaria, FormaPagamento, PlanoConta, Pessoa } from '../types';
import { DREView } from '../components/dre/DREView';
import { PlanoContasView } from '../components/dre/PlanoContasView';
import { MoneyInput } from '../components/common/MoneyInput';

export const FinanceiroView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receber' | 'pagar' | 'fluxo' | 'dre' | 'plano'>('receber');
  const [contas, setContas] = useState<ContaFinanceiraItem[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoConta[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);

  // Modals
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [contaParaBaixar, setContaParaBaixar] = useState<ContaFinanceiraItem | null>(null);
  const [baixaContaBancariaId, setBaixaContaBancariaId] = useState('');
  const [baixaData, setBaixaData] = useState(todayIsoDate());

  const [isAvulsoModalOpen, setIsAvulsoModalOpen] = useState(false);
  const [avulsoTipo, setAvulsoTipo] = useState<'receber' | 'pagar'>('pagar');
  const [avulsoDescricao, setAvulsoDescricao] = useState('');
  const [avulsoValorCentavos, setAvulsoValorCentavos] = useState(0);
  const [avulsoVencimento, setAvulsoVencimento] = useState(todayIsoDate());
  const [avulsoFormaPagamentoId, setAvulsoFormaPagamentoId] = useState('');
  const [avulsoPessoaId, setAvulsoPessoaId] = useState('');
  const [avulsoPlanoContaId, setAvulsoPlanoContaId] = useState('');
  const [avulsoMesCompetencia, setAvulsoMesCompetencia] = useState(todayIsoDate().substring(0, 7));

  // Modal para editar/vincular plano de contas em conta existente
  const [contaParaVincularPlano, setContaParaVincularPlano] = useState<ContaFinanceiraItem | null>(null);

  const carregarDados = async () => {
    const todasContas = await db.contasFinanceiras.filter((c) => !c.excluido).toArray();
    // Sort by due date ascending
    todasContas.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    setContas(todasContas);

    const bancos = await db.contasBancarias.filter((b) => !b.excluido).toArray();
    setContasBancarias(bancos);

    const fps = await db.formasPagamento.filter((f) => !f.excluido).toArray();
    setFormasPagamento(fps);

    const pcs = await db.planoContas.filter((p) => !p.excluido).toArray();
    pcs.sort((a, b) => a.codigo.localeCompare(b.codigo));
    setPlanoContas(pcs);

    const pes = await db.pessoas.filter((p) => !p.excluido).toArray();
    setPessoas(pes);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Sugestão inteligente: ao selecionar pessoa, buscar o plano mais usado no histórico
  const handleSelecionarPessoaAvulso = (pessoaId: string) => {
    setAvulsoPessoaId(pessoaId);
    if (!pessoaId) return;

    // Buscar lançamentos anteriores desta pessoa que tenham planoContaId
    const historico = contas.filter(
      (c) => c.pessoaId === pessoaId && c.planoContaId && !c.excluido
    );
    if (historico.length > 0) {
      // Pega o plano de contas mais recente ou mais frequente
      const contagem: Record<string, number> = {};
      historico.forEach((h) => {
        if (h.planoContaId) {
          contagem[h.planoContaId] = (contagem[h.planoContaId] || 0) + 1;
        }
      });
      const planoMaisFrequente = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (planoMaisFrequente) {
        setAvulsoPlanoContaId(planoMaisFrequente);
      }
    }
  };

  const abrirBaixa = (conta: ContaFinanceiraItem) => {
    setContaParaBaixar(conta);
    setBaixaContaBancariaId(contasBancarias[0]?.id || 'cb-caixa');
    setBaixaData(todayIsoDate());
    setIsBaixaModalOpen(true);
  };

  const handleConfirmarBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaParaBaixar) return;

    try {
      await baixarContaFinanceira(
        contaParaBaixar.id,
        baixaContaBancariaId,
        baixaData || todayIsoDate()
      );
      setIsBaixaModalOpen(false);
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao dar baixa: ' + err.message);
    }
  };

  const handleSalvarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avulsoDescricao || avulsoValorCentavos <= 0) {
      alert('Informe descrição e valor válido.');
      return;
    }

    if (!avulsoPlanoContaId) {
      alert('Selecione uma conta do Plano de Contas para correta apuração no DRE.');
      return;
    }

    const agora = new Date().toISOString();
    const id = 'c_' + Date.now();

    await db.contasFinanceiras.add({
      id,
      tipo: avulsoTipo,
      descricao: avulsoDescricao,
      referenciaTipo: 'avulso',
      parcelaNumero: 1,
      totalParcelas: 1,
      valorCentavos: avulsoValorCentavos,
      dataVencimento: avulsoVencimento,
      status: 'pendente',
      formaPagamentoId: avulsoFormaPagamentoId || formasPagamento[0]?.id,
      pessoaId: avulsoPessoaId || undefined,
      planoContaId: avulsoPlanoContaId,
      mesCompetencia: avulsoMesCompetencia || avulsoVencimento.substring(0, 7),
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsAvulsoModalOpen(false);
    setAvulsoDescricao('');
    setAvulsoValorCentavos(0);
    setAvulsoPessoaId('');
    setAvulsoPlanoContaId('');
    await carregarDados();
  };

  const handleSalvarVinculoPlano = async (planoId: string) => {
    if (!contaParaVincularPlano) return;
    await db.contasFinanceiras.update(contaParaVincularPlano.id, {
      planoContaId: planoId,
      dataAlteracao: new Date().toISOString(),
    });
    setContaParaVincularPlano(null);
    await carregarDados();
  };

  // Filtragem da lista
  const listaContas = contas.filter((c) => c.tipo === activeTab);

  // Cálculos de totais
  const hoje = todayIsoDate();
  const pendentesAtuais = listaContas.filter((c) => c.status === 'pendente');
  const totalVencido = pendentesAtuais
    .filter((c) => c.dataVencimento < hoje)
    .reduce((acc, c) => acc + c.valorCentavos, 0);

  const totalVence7Dias = pendentesAtuais
    .filter((c) => c.dataVencimento >= hoje && c.dataVencimento <= addDaysIso(hoje, 7))
    .reduce((acc, c) => acc + c.valorCentavos, 0);

  const totalGeral = pendentesAtuais.reduce((acc, c) => acc + c.valorCentavos, 0);

  // Cálculos do Fluxo de Caixa Projetado
  const calcularFluxoProjetado = () => {
    let saldoAtual = contasBancarias.reduce((acc, b) => acc + b.saldoInicialCentavos, 0);
    contas.forEach((c) => {
      if (c.status === 'pago') {
        if (c.tipo === 'receber') saldoAtual += c.valorCentavos;
        if (c.tipo === 'pagar') saldoAtual -= c.valorCentavos;
      }
    });

    const semanas = [
      { nome: 'Semana Atual', inicio: hoje, fim: addDaysIso(hoje, 7) },
      { nome: 'Próxima Semana', inicio: addDaysIso(hoje, 8), fim: addDaysIso(hoje, 14) },
      { nome: 'Semana 3', inicio: addDaysIso(hoje, 15), fim: addDaysIso(hoje, 21) },
      { nome: 'Semana 4', inicio: addDaysIso(hoje, 22), fim: addDaysIso(hoje, 28) },
    ];

    let saldoAcumulado = saldoAtual;

    const projecao = semanas.map((sem) => {
      const entradas = contas
        .filter(
          (c) =>
            c.tipo === 'receber' &&
            c.status === 'pendente' &&
            c.dataVencimento >= sem.inicio &&
            c.dataVencimento <= sem.fim
        )
        .reduce((acc, c) => acc + c.valorCentavos, 0);

      const saidas = contas
        .filter(
          (c) =>
            c.tipo === 'pagar' &&
            c.status === 'pendente' &&
            c.dataVencimento >= sem.inicio &&
            c.dataVencimento <= sem.fim
        )
        .reduce((acc, c) => acc + c.valorCentavos, 0);

      saldoAcumulado = saldoAcumulado + entradas - saidas;

      return {
        ...sem,
        entradas,
        saidas,
        saldoProjetado: saldoAcumulado,
      };
    });

    return { saldoAtual, projecao };
  };

  const fluxo = calcularFluxoProjetado();

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Financeiro & Caixa</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contas a pagar, a receber e fluxo projetado
          </p>
        </div>
        <button
          onClick={() => {
            setAvulsoTipo(activeTab === 'receber' ? 'receber' : 'pagar');
            setIsAvulsoModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Lançamento</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('receber')}
          className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
            activeTab === 'receber'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>A Receber</span>
        </button>
        <button
          onClick={() => setActiveTab('pagar')}
          className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
            activeTab === 'pagar'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>A Pagar</span>
        </button>
        <button
          onClick={() => setActiveTab('fluxo')}
          className={`flex-1 min-w-[65px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
            activeTab === 'fluxo'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Fluxo</span>
        </button>
        <button
          onClick={() => setActiveTab('dre')}
          className={`flex-1 min-w-[60px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
            activeTab === 'dre'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>DRE</span>
        </button>
        <button
          onClick={() => setActiveTab('plano')}
          className={`flex-1 min-w-[85px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
            activeTab === 'plano'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Plano DRE</span>
        </button>
      </div>

      {/* DRE Tab View */}
      {activeTab === 'dre' && <DREView />}

      {/* Plano de Contas Tab View */}
      {activeTab === 'plano' && <PlanoContasView />}

      {/* Overview Cards (when in Receber or Pagar) */}
      {activeTab !== 'fluxo' && activeTab !== 'dre' && activeTab !== 'plano' && (
        <div className="grid grid-cols-3 gap-2">
          {/* Vencidas (Vermelho) */}
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block">
              Vencidas
            </span>
            <div className="text-sm font-black text-rose-700 dark:text-rose-300 mt-0.5">
              {formatCurrency(totalVencido)}
            </div>
          </div>

          {/* Vence em 7 dias (Amarelo) */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase block">
              Em até 7 dias
            </span>
            <div className="text-sm font-black text-amber-700 dark:text-amber-300 mt-0.5">
              {formatCurrency(totalVence7Dias)}
            </div>
          </div>

          {/* Total Pendente */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Total Aberto
            </span>
            <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {formatCurrency(totalGeral)}
            </div>
          </div>
        </div>
      )}

      {/* Tab: A Receber & A Pagar list */}
      {activeTab !== 'fluxo' && activeTab !== 'dre' && activeTab !== 'plano' && (
        <div className="space-y-2.5">
          {listaContas.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhum título {activeTab === 'receber' ? 'a receber' : 'a pagar'} encontrado
              </h3>
            </div>
          ) : (
            listaContas.map((c) => {
              const isPago = c.status === 'pago';
              const statusVencimento = getDueDateStatus(c.dataVencimento, isPago);
              const plano = planoContas.find((p) => p.id === c.planoContaId);

              // Styling rules requested by prompt:
              // "Destacar em vermelho as vencidas e em amarelo as que vencem em 7 dias."
              let borderClass = 'border-slate-200/80 dark:border-slate-800';
              let badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
              let badgeLabel = 'No prazo';

              if (isPago) {
                badgeClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400';
                badgeLabel = 'Pago / Baixado';
              } else if (statusVencimento === 'overdue') {
                borderClass = 'border-rose-400 dark:border-rose-800 bg-rose-50/20';
                badgeClass = 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 font-black';
                badgeLabel = 'VENCIDA';
              } else if (statusVencimento === 'due_today') {
                borderClass = 'border-amber-400 dark:border-amber-800 bg-amber-50/20';
                badgeClass = 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-bold';
                badgeLabel = 'VENCE HOJE';
              } else if (statusVencimento === 'due_soon') {
                borderClass = 'border-amber-300 dark:border-amber-900/70 bg-amber-50/10';
                badgeClass = 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-bold';
                badgeLabel = 'VENCE EM ATÉ 7 DIAS';
              }

              return (
                <div
                  key={c.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border shadow-xs transition ${borderClass}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {c.descricao}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Venc: {formatDateBr(c.dataVencimento)}</span>
                        </span>
                        {c.totalParcelas > 1 && (
                          <span>
                            • Parcela {c.parcelaNumero}/{c.totalParcelas}
                          </span>
                        )}
                        {c.mesCompetencia && (
                          <span className="text-slate-400">
                            • Comp: {c.mesCompetencia}
                          </span>
                        )}
                      </div>

                      {/* Plano de contas badge / edit link */}
                      <div className="mt-1.5">
                        {plano ? (
                          <button
                            type="button"
                            onClick={() => setContaParaVincularPlano(c)}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md transition"
                            title="Clique para alterar a conta do plano"
                          >
                            <span>📁 {plano.codigo} - {plano.nome}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setContaParaVincularPlano(c)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded-md transition"
                            title="Clique para vincular ao plano de contas e incluir no DRE"
                          >
                            <span>⚠️ Sem plano de contas</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-black ${
                          c.tipo === 'receber'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(c.valorCentavos)}
                      </div>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Baixa button if pending */}
                  {!isPago && (
                    <div className="flex justify-end pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => abrirBaixa(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-xs ${
                          c.tipo === 'receber'
                            ? 'bg-emerald-600 hover:bg-emerald-500'
                            : 'bg-rose-600 hover:bg-rose-500'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{c.tipo === 'receber' ? 'Receber Valor' : 'Pagar Título'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Fluxo de Caixa */}
      {activeTab === 'fluxo' && (
        <div className="space-y-4">
          {/* Contas bancárias e saldos atuais */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-500" />
              Saldos Atuais por Conta
            </h3>

            <div className="space-y-2">
              {contasBancarias.map((b) => {
                // calculate balance of this specific account
                let saldoConta = b.saldoInicialCentavos;
                contas.forEach((c) => {
                  if (c.status === 'pago' && c.contaId === b.id) {
                    if (c.tipo === 'receber') saldoConta += c.valorCentavos;
                    if (c.tipo === 'pagar') saldoConta -= c.valorCentavos;
                  }
                });

                return (
                  <div
                    key={b.id}
                    className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {b.nome}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(saldoConta)}
                    </span>
                  </div>
                );
              })}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Saldo Total Disponível:
                </span>
                <span className="font-black text-sm text-sky-600 dark:text-sky-400">
                  {formatCurrency(fluxo.saldoAtual)}
                </span>
              </div>
            </div>
          </div>

          {/* Projeção das próximas semanas */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Projeção de Fluxo de Caixa (Próximas 4 Semanas)
            </h3>

            <div className="space-y-2.5">
              {fluxo.projecao.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {p.nome}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDateBr(p.inicio)} a {formatDateBr(p.fim)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block">Entradas:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(p.entradas)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Saídas:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(p.saidas)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Saldo Projetado:</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.saldoProjetado)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Baixar Conta */}
      {isBaixaModalOpen && contaParaBaixar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {contaParaBaixar.tipo === 'receber' ? 'Receber Valor' : 'Confirmar Pagamento'}
                </h3>
                <p className="text-[11px] text-slate-500">{contaParaBaixar.descricao}</p>
              </div>
              <button
                onClick={() => setIsBaixaModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarBaixa} className="space-y-3.5">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Valor do Título:</span>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {formatCurrency(contaParaBaixar.valorCentavos)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Conta Financeira / Caixa *
                </label>
                <select
                  value={baixaContaBancariaId}
                  onChange={(e) => setBaixaContaBancariaId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {contasBancarias.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data da Baixa (Pagamento/Recebimento) *
                </label>
                <input
                  type="date"
                  required
                  value={baixaData}
                  onChange={(e) => setBaixaData(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition ${
                  contaParaBaixar.tipo === 'receber'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirmar Baixa Financeira
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lançamento Avulso */}
      {isAvulsoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Lançamento Avulso de Caixa
                </h3>
                <p className="text-[11px] text-slate-500">Despesa ou receita avulsa</p>
              </div>
              <button
                onClick={() => setIsAvulsoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarAvulso} className="space-y-3.5">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAvulsoTipo('pagar');
                    setAvulsoPlanoContaId('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    avulsoTipo === 'pagar' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Despesa (A Pagar)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvulsoTipo('receber');
                    setAvulsoPlanoContaId('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    avulsoTipo === 'receber' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Receita (A Receber)
                </button>
              </div>

              {/* Pessoa com sugestão inteligente */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {avulsoTipo === 'pagar' ? 'Fornecedor / Favorecido (Opcional)' : 'Cliente / Pagador (Opcional)'}
                </label>
                <select
                  value={avulsoPessoaId}
                  onChange={(e) => handleSelecionarPessoaAvulso(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">Selecione para auto-sugerir plano de contas...</option>
                  {pessoas
                    .filter((p) => (avulsoTipo === 'pagar' ? p.isFornecedor || !p.isCliente : p.isCliente || !p.isFornecedor))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </select>
              </div>

              {/* Plano de Contas Obrigatório */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Plano de Contas (Obrigatório para DRE) *</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAvulsoModalOpen(false);
                      setActiveTab('plano');
                    }}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-normal"
                  >
                    Gerenciar plano &rarr;
                  </button>
                </label>
                <select
                  required
                  value={avulsoPlanoContaId}
                  onChange={(e) => setAvulsoPlanoContaId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="" disabled>
                    Selecione a conta contábil...
                  </option>
                  {planoContas
                    .filter((pc) => (avulsoTipo === 'pagar' ? pc.tipo === 'despesa' : pc.tipo === 'receita'))
                    .map((pc) => (
                      <option key={pc.id} value={pc.id}>
                        {pc.codigo} - {pc.nome}
                      </option>
                    ))}
                  {/* Permitir também outras contas caso necessário */}
                  <option disabled>────────── Outras ──────────</option>
                  {planoContas
                    .filter((pc) => (avulsoTipo === 'pagar' ? pc.tipo !== 'despesa' : pc.tipo !== 'receita'))
                    .map((pc) => (
                      <option key={pc.id} value={pc.id}>
                        {pc.codigo} - {pc.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel do Galpão, Conta de Energia, Taxa de Máquina..."
                  value={avulsoDescricao}
                  onChange={(e) => setAvulsoDescricao(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor *
                </label>
                <MoneyInput
                  valueCentavos={avulsoValorCentavos}
                  onChange={(val) => setAvulsoValorCentavos(val)}
                  required
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={avulsoVencimento}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAvulsoVencimento(v);
                      if (v) setAvulsoMesCompetencia(v.substring(0, 7));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mês Competência *
                  </label>
                  <input
                    type="month"
                    required
                    value={avulsoMesCompetencia}
                    onChange={(e) => setAvulsoMesCompetencia(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Salvar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vincular Plano de Contas Rápido */}
      {contaParaVincularPlano && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Vincular Plano de Contas
                </h3>
                <p className="text-[11px] text-slate-500">{contaParaVincularPlano.descricao}</p>
              </div>
              <button
                onClick={() => setContaParaVincularPlano(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Selecione a conta contábil para que este lançamento de{' '}
                <strong>{formatCurrency(contaParaVincularPlano.valorCentavos)}</strong> seja devidamente
                apurado no DRE:
              </p>

              <select
                defaultValue={contaParaVincularPlano.planoContaId || ''}
                onChange={(e) => handleSalvarVinculoPlano(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
              >
                <option value="" disabled>
                  Selecione uma conta do plano...
                </option>
                {planoContas.map((pc) => (
                  <option key={pc.id} value={pc.id}>
                    {pc.codigo} - {pc.nome} ({pc.tipo === 'receita' ? 'Receita' : 'Despesa'})
                  </option>
                ))}
              </select>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setContaParaVincularPlano(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
