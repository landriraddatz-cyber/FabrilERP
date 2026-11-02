import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  FolderTree,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { db } from '../../db';
import { ensureDefaultPlanoContas } from '../../db/seed';
import { PlanoConta, GrupoDRE } from '../../types';

export const GRUPOS_DRE_INFO: Record<
  GrupoDRE,
  { label: string; descricao: string; linhaDRE: string; color: string; defaultTipo: 'receita' | 'despesa' }
> = {
  receita_venda: {
    label: 'Receita Bruta de Vendas',
    descricao: 'Faturamento bruto de produtos faturados e receitas de vendas',
    linhaDRE: 'Receita bruta de vendas',
    color: 'emerald',
    defaultTipo: 'receita',
  },
  deducao: {
    label: 'Deduções sobre Vendas',
    descricao: 'Impostos sobre vendas (Simples/ICMS), devoluções e descontos',
    linhaDRE: '(-) Deduções',
    color: 'rose',
    defaultTipo: 'despesa',
  },
  cmv: {
    label: 'CMV (Custo Mercadorias Vendidas)',
    descricao: 'Custos diretos dos produtos vendidos vinculados a pedidos',
    linhaDRE: '(-) CMV',
    color: 'amber',
    defaultTipo: 'despesa',
  },
  custo_producao: {
    label: 'Custos de Produção / Fábrica',
    descricao: 'Energia da fábrica, mão de obra e embalagens (incorporados ao CMV pela OP)',
    linhaDRE: 'Fora do DRE direto (entra no CMV via OP)',
    color: 'orange',
    defaultTipo: 'despesa',
  },
  despesa_venda: {
    label: 'Despesas com Vendas',
    descricao: 'Comissões de vendedores, fretes sobre vendas e campanhas de marketing',
    linhaDRE: '(-) Despesas com vendas',
    color: 'purple',
    defaultTipo: 'despesa',
  },
  despesa_administrativa: {
    label: 'Despesas Administrativas',
    descricao: 'Aluguel, salários adm, contador, internet, telefone e escritório',
    linhaDRE: '(-) Despesas administrativas',
    color: 'blue',
    defaultTipo: 'despesa',
  },
  despesa_financeira: {
    label: 'Despesas Financeiras',
    descricao: 'Juros pagos, tarifas bancárias e taxas de cartão de crédito/débito',
    linhaDRE: '(+/-) Resultado financeiro (despesas)',
    color: 'red',
    defaultTipo: 'despesa',
  },
  receita_financeira: {
    label: 'Receitas Financeiras',
    descricao: 'Rendimentos de aplicações bancárias e descontos obtidos de fornecedores',
    linhaDRE: '(+/-) Resultado financeiro (receitas)',
    color: 'teal',
    defaultTipo: 'receita',
  },
  outras: {
    label: 'Outras Receitas e Despesas',
    descricao: 'Receitas ou despesas operacionais atípicas da fábrica',
    linhaDRE: '(+/-) Outras receitas e despesas',
    color: 'indigo',
    defaultTipo: 'despesa',
  },
  imposto_lucro: {
    label: 'Tributos sobre o Lucro',
    descricao: 'IRPJ e CSLL apurados sobre o lucro real/presumido',
    linhaDRE: '(-) IRPJ e CSLL',
    color: 'rose',
    defaultTipo: 'despesa',
  },
  nenhum: {
    label: 'Nenhum / Não afeta DRE',
    descricao: 'Retiradas de pró-labore/lucro de sócios, empréstimos bancários e transferências',
    linhaDRE: 'Não entra no DRE (Neutro)',
    color: 'slate',
    defaultTipo: 'despesa',
  },
};

interface PlanoContasViewProps {
  onSelectConta?: (conta: PlanoConta) => void;
  preSelectedGrupo?: GrupoDRE;
}

export const PlanoContasView: React.FC<PlanoContasViewProps> = ({
  onSelectConta,
  preSelectedGrupo,
}) => {
  const [contas, setContas] = useState<PlanoConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filtroGrupo, setFiltroGrupo] = useState<string>(preSelectedGrupo || 'todos');
  const [visualizacao, setVisualizacao] = useState<'agrupado' | 'lista'>('agrupado');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<PlanoConta | null>(null);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [grupoDRE, setGrupoDRE] = useState<GrupoDRE>('despesa_administrativa');
  const [contaPaiId, setContaPaiId] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregarContas = async () => {
    try {
      setLoading(true);
      await ensureDefaultPlanoContas();
      const list = await db.planoContas.filter((p) => !p.excluido).toArray();
      // Ordenar por código numérico/contábil
      list.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
      setContas(list);
    } catch (err) {
      console.error('Erro ao carregar plano de contas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const abrirNovaConta = (grupoInicial?: GrupoDRE) => {
    setEditingConta(null);
    const grp = grupoInicial || (filtroGrupo !== 'todos' ? (filtroGrupo as GrupoDRE) : 'despesa_administrativa');
    setGrupoDRE(grp);
    setTipo(GRUPOS_DRE_INFO[grp]?.defaultTipo || 'despesa');
    setNome('');
    setContaPaiId('');

    // Sugerir próximo código sequencial baseado no grupo
    const contasDoGrupo = contas.filter((c) => c.grupoDRE === grp);
    if (contasDoGrupo.length > 0) {
      const ultimo = contasDoGrupo[contasDoGrupo.length - 1].codigo;
      const parts = ultimo.split('.');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        const nextNum = Number(parts[1]) + 1;
        setCodigo(`${parts[0]}.${String(nextNum).padStart(2, '0')}`);
      } else {
        setCodigo('');
      }
    } else {
      setCodigo('');
    }

    setIsModalOpen(true);
  };

  const abrirEditarConta = (c: PlanoConta) => {
    setEditingConta(c);
    setCodigo(c.codigo);
    setNome(c.nome);
    setTipo(c.tipo);
    setGrupoDRE(c.grupoDRE);
    setContaPaiId(c.contaPaiId || '');
    setIsModalOpen(true);
  };

  const handleSalvarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nome.trim()) {
      alert('Informe o código e o nome da conta.');
      return;
    }

    try {
      const agora = new Date().toISOString();

      if (editingConta) {
        await db.planoContas.update(editingConta.id, {
          codigo: codigo.trim(),
          nome: nome.trim(),
          tipo,
          grupoDRE,
          contaPaiId: contaPaiId || undefined,
          dataAlteracao: agora,
        });
        setFeedbackMsg({ tipo: 'ok', texto: `Conta "${nome}" atualizada com sucesso!` });
      } else {
        const newId = 'pc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const novaConta: PlanoConta = {
          id: newId,
          codigo: codigo.trim(),
          nome: nome.trim(),
          tipo,
          grupoDRE,
          contaPaiId: contaPaiId || undefined,
          padrao: false,
          excluido: false,
          dataCriacao: agora,
          dataAlteracao: agora,
        };
        await db.planoContas.add(novaConta);
        setFeedbackMsg({ tipo: 'ok', texto: `Conta "${nome}" criada no plano de contas do DRE!` });
        if (onSelectConta) {
          onSelectConta(novaConta);
        }
      }

      setIsModalOpen(false);
      await carregarContas();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert('Erro ao salvar conta: ' + (err.message || 'Erro inesperado'));
    }
  };

  const handleExcluirConta = async (conta: PlanoConta) => {
    // Verificar se há lançamentos vinculados
    const vinculosCount = await db.contasFinanceiras
      .filter((cf) => !cf.excluido && cf.planoContaId === conta.id)
      .count();

    if (vinculosCount > 0) {
      alert(
        `Não é possível excluir esta conta: existem ${vinculosCount} lançamento(s) vinculados a ela no financeiro. Edite a conta ou mude os lançamentos primeiro.`
      );
      return;
    }

    if (!confirm(`Deseja realmente excluir a conta "${conta.codigo} - ${conta.nome}" do Plano de Contas?`)) {
      return;
    }

    await db.planoContas.update(conta.id, {
      excluido: true,
      dataAlteracao: new Date().toISOString(),
    });

    setFeedbackMsg({ tipo: 'ok', texto: `Conta "${conta.nome}" excluída com sucesso.` });
    await carregarContas();
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleRestaurarPadrao = async () => {
    if (confirm('Deseja restaurar as 22 contas contábeis padrão recomendadas para o DRE?')) {
      await ensureDefaultPlanoContas();
      await carregarContas();
      setFeedbackMsg({ tipo: 'ok', texto: 'Contas padrão do DRE conferidas e ativas!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // Filtragem
  const contasFiltradas = contas.filter((c) => {
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false;
    if (filtroGrupo !== 'todos' && c.grupoDRE !== filtroGrupo) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = c.codigo.toLowerCase().includes(q);
      const matchName = c.nome.toLowerCase().includes(q);
      const matchGrupo = (GRUPOS_DRE_INFO[c.grupoDRE]?.label || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchGrupo) return false;
    }
    return true;
  });

  // Agrupamento por Grupo DRE
  const gruposOrdenados: GrupoDRE[] = [
    'receita_venda',
    'deducao',
    'cmv',
    'custo_producao',
    'despesa_venda',
    'despesa_administrativa',
    'despesa_financeira',
    'receita_financeira',
    'outras',
    'imposto_lucro',
    'nenhum',
  ];

  return (
    <div className="space-y-4">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedbackMsg.tipo === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedbackMsg.texto}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Plano de Contas para DRE
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Classificação gerencial de receitas e despesas que alimentam o DRE da fábrica
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRestaurarPadrao}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
              title="Garante que as 22 contas padrão do DRE existam"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar Padrão</span>
            </button>
            <button
              onClick={() => abrirNovaConta()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, nome da conta ou grupo..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-4 flex gap-1">
            <select
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="todos">Todos os Grupos do DRE</option>
              {gruposOrdenados.map((g) => (
                <option key={g} value={g}>
                  {GRUPOS_DRE_INFO[g].label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setVisualizacao('agrupado')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                visualizacao === 'agrupado'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              Por Grupo
            </button>
            <button
              type="button"
              onClick={() => setVisualizacao('lista')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                visualizacao === 'lista'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              Lista ({contasFiltradas.length})
            </button>
          </div>
        </div>
      </div>

      {/* DRE Summary Card */}
      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
        <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Como o Plano de Contas funciona com o DRE:
          </p>
          <p className="text-[11px] text-emerald-800/90 dark:text-emerald-400 leading-relaxed">
            Ao lançar receitas ou despesas, selecione a conta contábil correspondente. O DRE agrupará
            automaticamente os valores calculando <strong>Receita Líquida</strong>, <strong>Lucro Bruto</strong>,{' '}
            <strong>Resultado Operacional</strong> e <strong>Lucro Líquido</strong>.
          </p>
        </div>
      </div>

      {/* List / Groups */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">
          Carregando contas do DRE...
        </div>
      ) : visualizacao === 'agrupado' ? (
        <div className="space-y-3.5">
          {gruposOrdenados.map((grupoId) => {
            const info = GRUPOS_DRE_INFO[grupoId];
            const contasDesteGrupo = contasFiltradas.filter((c) => c.grupoDRE === grupoId);

            if (filtroGrupo !== 'todos' && filtroGrupo !== grupoId) return null;
            if (searchTerm && contasDesteGrupo.length === 0) return null;

            return (
              <div
                key={grupoId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs"
              >
                {/* Group Header */}
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {info.label}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {contasDesteGrupo.length} {contasDesteGrupo.length === 1 ? 'conta' : 'contas'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Linha DRE: <strong className="text-slate-700 dark:text-slate-300">{info.linhaDRE}</strong> • {info.descricao}
                    </p>
                  </div>

                  <button
                    onClick={() => abrirNovaConta(grupoId)}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition shrink-0"
                    title={`Adicionar conta em ${info.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Contas do Grupo */}
                {contasDesteGrupo.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Nenhuma conta cadastrada neste grupo. Toque em &quot;Adicionar&quot; para criar uma.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {contasDesteGrupo.map((c) => (
                      <div
                        key={c.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition text-xs"
                      >
                        <div className="min-w-0 pr-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                              {c.codigo}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {c.nome}
                            </span>
                            {c.padrao && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                Padrão
                              </span>
                            )}
                          </div>
                          {c.contaPaiId && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              ↳ Subconta de:{' '}
                              {contas.find((p) => p.id === c.contaPaiId)?.nome || c.contaPaiId}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              c.tipo === 'receita'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {c.tipo}
                          </span>

                          <button
                            type="button"
                            onClick={() => abrirEditarConta(c)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Editar conta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirConta(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Excluir conta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Lista Linear */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
          {contasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhuma conta encontrada com os filtros selecionados.
            </div>
          ) : (
            contasFiltradas.map((c) => (
              <div
                key={c.id}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition text-xs"
              >
                <div className="min-w-0 pr-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                      {c.codigo}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {c.nome}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      Grupo DRE:{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {GRUPOS_DRE_INFO[c.grupoDRE]?.label || c.grupoDRE}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="capitalize">{c.tipo}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => abrirEditarConta(c)}
                    className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Editar conta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirConta(c)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Criação / Edição de Conta no Plano */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  {editingConta ? 'Editar Conta do Plano' : 'Nova Conta no Plano de Contas'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Enquadramento contábil para apuração no DRE
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarConta} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Código Contábil *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 3.06, 1.05"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Natureza *
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="despesa">Despesa (Saída)</option>
                    <option value="receita">Receita (Entrada)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nome da Conta Contábil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel do Galpão, Contador, Manutenção de Máquinas..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Grupo no DRE (Demonstração do Resultado) *
                </label>
                <select
                  value={grupoDRE}
                  onChange={(e) => {
                    const grp = e.target.value as GrupoDRE;
                    setGrupoDRE(grp);
                    if (GRUPOS_DRE_INFO[grp]) {
                      setTipo(GRUPOS_DRE_INFO[grp].defaultTipo);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {gruposOrdenados.map((g) => (
                    <option key={g} value={g}>
                      {GRUPOS_DRE_INFO[g].label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {GRUPOS_DRE_INFO[grupoDRE]?.descricao}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Conta Pai (Opcional - para subcontas)
                </label>
                <select
                  value={contaPaiId}
                  onChange={(e) => setContaPaiId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">Nenhuma (Conta Sintética Principal)</option>
                  {contas
                    .filter((pc) => !editingConta || pc.id !== editingConta.id)
                    .map((pc) => (
                      <option key={pc.id} value={pc.id}>
                        {pc.codigo} - {pc.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl font-bold transition shadow-xs"
                >
                  {editingConta ? 'Salvar Alterações' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
