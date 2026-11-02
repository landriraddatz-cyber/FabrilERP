import React, { useState, useEffect } from 'react';
import {
  Users,
  Package,
  Tags,
  CreditCard,
  Plus,
  Search,
  X,
  Phone,
  Building,
  Check,
  AlertCircle,
} from 'lucide-react';
import { db } from '../db';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Pessoa, Produto, Categoria, FormaPagamento, ContaBancaria, TipoProduto, PlanoConta, GrupoDRE } from '../types';
import { QuantityInput } from '../components/common/QuantityInput';
import { MoneyInput } from '../components/common/MoneyInput';
import { PlanoContasView } from '../components/dre/PlanoContasView';

export const CadastrosView: React.FC = () => {
  const [subTab, setSubTab] = useState<'produtos' | 'pessoas' | 'categorias' | 'financeiro' | 'planocontas'>('produtos');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoConta[]>([]);

  const [searchTerm, setSearchTerm] = useState('');

  // Modal Pessoas
  const [isPessoaModalOpen, setIsPessoaModalOpen] = useState(false);
  const [pessoaNome, setPessoaNome] = useState('');
  const [pessoaTipo, setPessoaTipo] = useState<'fisica' | 'juridica'>('juridica');
  const [pessoaCpfCnpj, setPessoaCpfCnpj] = useState('');
  const [pessoaTelefone, setPessoaTelefone] = useState('');
  const [pessoaWhatsapp, setPessoaWhatsapp] = useState('');
  const [pessoaEndereco, setPessoaEndereco] = useState('');
  const [pessoaObservacoes, setPessoaObservacoes] = useState('');
  const [pessoaIsCliente, setPessoaIsCliente] = useState(true);
  const [pessoaIsFornecedor, setPessoaIsFornecedor] = useState(false);

  // Modal Produtos
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [prodTipo, setProdTipo] = useState<TipoProduto>('produto_acabado');
  const [prodCodigo, setProdCodigo] = useState('');
  const [prodNome, setProdNome] = useState('');
  const [prodCategoriaId, setProdCategoriaId] = useState('');
  const [prodUnidade, setProdUnidade] = useState('UN');
  const [prodPrecoCustoCentavos, setProdPrecoCustoCentavos] = useState(0);
  const [prodPrecoVendaCentavos, setProdPrecoVendaCentavos] = useState(0);
  const [prodEstoqueMinimo, setProdEstoqueMinimo] = useState(10);
  const [prodEstoqueAtual, setProdEstoqueAtual] = useState(0);
  const [prodFormSubmitted, setProdFormSubmitted] = useState(false);

  // Modal Categorias
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [categoriaNome, setCategoriaNome] = useState('');

  const carregarDados = async () => {
    const pes = await db.pessoas.filter((p) => !p.excluido).toArray();
    setPessoas(pes);

    const prods = await db.produtos.filter((p) => !p.excluido).toArray();
    setProdutos(prods);

    const cats = await db.categorias.filter((c) => !c.excluido).toArray();
    setCategorias(cats);

    const fps = await db.formasPagamento.filter((f) => !f.excluido).toArray();
    setFormasPagamento(fps);

    const cbs = await db.contasBancarias.filter((c) => !c.excluido).toArray();
    setContasBancarias(cbs);

    const pcs = await db.planoContas.filter((c) => !c.excluido).toArray();
    pcs.sort((a, b) => a.codigo.localeCompare(b.codigo));
    setPlanoContas(pcs);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvarPessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaNome) return;

    const agora = new Date().toISOString();
    const id = 'pes_' + Date.now();

    await db.pessoas.add({
      id,
      nome: pessoaNome,
      tipo: pessoaTipo,
      cpfCnpj: pessoaCpfCnpj,
      telefone: pessoaTelefone,
      whatsapp: pessoaWhatsapp,
      endereco: pessoaEndereco,
      observacoes: pessoaObservacoes,
      isCliente: pessoaIsCliente,
      isFornecedor: pessoaIsFornecedor,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsPessoaModalOpen(false);
    await carregarDados();
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFormSubmitted(true);
    if (!prodNome.trim() || !prodCodigo.trim()) return;
    if (prodTipo === 'produto_acabado' && prodPrecoVendaCentavos <= 0) return;

    const agora = new Date().toISOString();
    const id = 'prod_' + Date.now();

    await db.produtos.add({
      id,
      tipo: prodTipo,
      codigo: prodCodigo.toUpperCase().trim(),
      nome: prodNome.trim(),
      categoriaId: prodCategoriaId || categorias[0]?.id || '',
      unidade: prodUnidade.toUpperCase().trim(),
      precoCustoCentavos: prodPrecoCustoCentavos,
      precoVendaCentavos: prodPrecoVendaCentavos,
      estoqueMinimo: prodEstoqueMinimo,
      estoqueAtual: prodEstoqueAtual,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsProdutoModalOpen(false);
    setProdFormSubmitted(false);
    await carregarDados();
  };

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaNome) return;

    const agora = new Date().toISOString();
    const id = 'cat_' + Date.now();

    await db.categorias.add({
      id,
      nome: categoriaNome,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    setIsCategoriaModalOpen(false);
    setCategoriaNome('');
    await carregarDados();
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cadastros Gerais</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pessoas, produtos, categorias, plano de contas e bancos
          </p>
        </div>
        {subTab !== 'planocontas' && (
          <button
            onClick={() => {
              if (subTab === 'pessoas') setIsPessoaModalOpen(true);
              else if (subTab === 'produtos') setIsProdutoModalOpen(true);
              else if (subTab === 'categorias') setIsCategoriaModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setSubTab('produtos')}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition ${
            subTab === 'produtos' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
          }`}
        >
          Produtos
        </button>
        <button
          onClick={() => setSubTab('pessoas')}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition ${
            subTab === 'pessoas' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
          }`}
        >
          Pessoas
        </button>
        <button
          onClick={() => setSubTab('categorias')}
          className={`flex-1 min-w-[75px] py-1.5 text-xs font-bold rounded-lg transition ${
            subTab === 'categorias' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
          }`}
        >
          Categorias
        </button>
        <button
          onClick={() => setSubTab('planocontas')}
          className={`flex-1 min-w-[100px] py-1.5 text-xs font-bold rounded-lg transition ${
            subTab === 'planocontas' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'
          }`}
        >
          Plano de Contas
        </button>
        <button
          onClick={() => setSubTab('financeiro')}
          className={`flex-1 min-w-[75px] py-1.5 text-xs font-bold rounded-lg transition ${
            subTab === 'financeiro' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
          }`}
        >
          Bancos/FP
        </button>
      </div>

      {/* SubTab 1: Produtos */}
      {subTab === 'produtos' && (
        <div className="space-y-2.5">
          {produtos.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-start"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {p.codigo}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {p.nome}
                  </h4>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                  <span className="capitalize">{p.tipo.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{p.unidade}</span>
                  <span>•</span>
                  <span>Custo: {formatCurrency(p.precoCustoCentavos)}</span>
                  {p.precoVendaCentavos > 0 && (
                    <span>• Venda: {formatCurrency(p.precoVendaCentavos)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {formatNumber(p.estoqueAtual)} {p.unidade}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Mín: {p.estoqueMinimo} {p.unidade}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SubTab 2: Pessoas */}
      {subTab === 'pessoas' && (
        <div className="space-y-2.5">
          {pessoas.map((pes) => (
            <div
              key={pes.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {pes.nome}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {pes.cpfCnpj || 'Documento não informado'} {pes.telefone ? `• ${pes.telefone}` : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  {pes.isCliente && (
                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      Cliente
                    </span>
                  )}
                  {pes.isFornecedor && (
                    <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                      Fornecedor
                    </span>
                  )}
                </div>
              </div>
              {pes.endereco && (
                <div className="text-[11px] text-slate-400 truncate">
                  📍 {pes.endereco}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SubTab 3: Categorias */}
      {subTab === 'categorias' && (
        <div className="space-y-2">
          {categorias.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <span>{c.nome}</span>
              <Tags className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      )}

      {/* SubTab 4: Financeiro (Contas e Formas) */}
      {subTab === 'financeiro' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contas Cadastradas
            </h4>
            {contasBancarias.map((b) => (
              <div key={b.id} className="flex justify-between text-xs py-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{b.nome}</span>
                <span className="text-slate-500">Saldo Inicial: {formatCurrency(b.saldoInicialCentavos)}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Formas de Pagamento
            </h4>
            {formasPagamento.map((fp) => (
              <div key={fp.id} className="text-xs py-1 font-semibold text-slate-800 dark:text-slate-200">
                • {fp.nome}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 5: Plano de Contas */}
      {subTab === 'planocontas' && <PlanoContasView />}

      {/* Modal Pessoa */}
      {isPessoaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cadastrar Pessoa</h3>
              <button onClick={() => setIsPessoaModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarPessoa} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nome Completo / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={pessoaNome}
                  onChange={(e) => setPessoaNome(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tipo</label>
                  <select
                    value={pessoaTipo}
                    onChange={(e) => setPessoaTipo(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="juridica">Pessoa Jurídica (PJ)</option>
                    <option value="fisica">Pessoa Física (PF)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={pessoaCpfCnpj}
                    onChange={(e) => setPessoaCpfCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={pessoaWhatsapp}
                    onChange={(e) => setPessoaWhatsapp(e.target.value)}
                    placeholder="11999998888"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Telefone Fixo</label>
                  <input
                    type="text"
                    value={pessoaTelefone}
                    onChange={(e) => setPessoaTelefone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Endereço</label>
                <input
                  type="text"
                  value={pessoaEndereco}
                  onChange={(e) => setPessoaEndereco(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pessoaIsCliente}
                    onChange={(e) => setPessoaIsCliente(e.target.checked)}
                    className="rounded text-sky-600"
                  />
                  <span>É Cliente</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pessoaIsFornecedor}
                    onChange={(e) => setPessoaIsFornecedor(e.target.checked)}
                    className="rounded text-sky-600"
                  />
                  <span>É Fornecedor</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 text-white font-bold text-xs rounded-xl mt-2"
              >
                Salvar Pessoa
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {isProdutoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cadastrar Produto / Insumo</h3>
              <button onClick={() => setIsProdutoModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarProduto} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tipo de Item *</label>
                  <select
                    value={prodTipo}
                    onChange={(e) => setProdTipo(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="materia_prima">Matéria-Prima</option>
                    <option value="produto_acabado">Produto Acabado</option>
                    <option value="embalagem">Embalagem</option>
                    <option value="revenda">Revenda</option>
                    <option value="servico">Serviço</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Código / Ref *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MP-05, PA-10"
                    value={prodCodigo}
                    onChange={(e) => setProdCodigo(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white transition ${
                      prodFormSubmitted && !prodCodigo.trim()
                        ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {prodFormSubmitted && !prodCodigo.trim() && (
                    <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                      <span>Código é obrigatório.</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Descrição / Nome do Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pão de Mel Artesanal 80g, Farinha de Trigo..."
                  value={prodNome}
                  onChange={(e) => setProdNome(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium transition ${
                    prodFormSubmitted && !prodNome.trim()
                      ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {prodFormSubmitted && !prodNome.trim() && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Nome do item é obrigatório.</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Unidade (UN, KG, L, M) *</label>
                  <input
                    type="text"
                    required
                    value={prodUnidade}
                    onChange={(e) => setProdUnidade(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Estoque Mínimo</label>
                  <QuantityInput
                    size="sm"
                    min={0}
                    step={1}
                    value={prodEstoqueMinimo}
                    onChange={(val) => setProdEstoqueMinimo(val)}
                    unit={prodUnidade}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Preço de Custo</label>
                  <MoneyInput
                    valueCentavos={prodPrecoCustoCentavos}
                    onChange={(val) => setProdPrecoCustoCentavos(val)}
                    size="sm"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Preço de Venda</label>
                  <MoneyInput
                    valueCentavos={prodPrecoVendaCentavos}
                    onChange={(val) => setProdPrecoVendaCentavos(val)}
                    size="sm"
                    warning={
                      prodPrecoVendaCentavos < prodPrecoCustoCentavos && prodPrecoVendaCentavos > 0
                        ? 'Atenção: Preço menor que o custo'
                        : null
                    }
                    error={
                      prodFormSubmitted && prodTipo === 'produto_acabado' && prodPrecoVendaCentavos <= 0
                        ? 'Preço de venda obrigatório'
                        : null
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Estoque Inicial</label>
                <QuantityInput
                  size="sm"
                  min={0}
                  step={1}
                  value={prodEstoqueAtual}
                  onChange={(val) => setProdEstoqueAtual(val)}
                  unit={prodUnidade}
                  className="w-full"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 text-white font-bold text-xs rounded-xl mt-2"
              >
                Salvar Produto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoria */}
      {isCategoriaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="font-bold text-sm mb-3">Nova Categoria de Produto</h3>
            <form onSubmit={handleSalvarCategoria} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Nome da Categoria"
                value={categoriaNome}
                onChange={(e) => setCategoriaNome(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoriaModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 text-white text-xs rounded-xl font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
