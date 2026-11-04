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
  AlertTriangle,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react';
import { db } from '../db';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Pessoa, Produto, Categoria, FormaPagamento, ContaBancaria, TipoProduto, PlanoConta } from '../types';
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

  // --- Modal Pessoas (Incluir / Alterar) ---
  const [isPessoaModalOpen, setIsPessoaModalOpen] = useState(false);
  const [pessoaEmEdicao, setPessoaEmEdicao] = useState<Pessoa | null>(null);
  const [pessoaNome, setPessoaNome] = useState('');
  const [pessoaTipo, setPessoaTipo] = useState<'fisica' | 'juridica'>('juridica');
  const [pessoaCpfCnpj, setPessoaCpfCnpj] = useState('');
  const [pessoaTelefone, setPessoaTelefone] = useState('');
  const [pessoaWhatsapp, setPessoaWhatsapp] = useState('');
  const [pessoaEndereco, setPessoaEndereco] = useState('');
  const [pessoaObservacoes, setPessoaObservacoes] = useState('');
  const [pessoaIsCliente, setPessoaIsCliente] = useState(true);
  const [pessoaIsFornecedor, setPessoaIsFornecedor] = useState(false);
  const [pessoaSubmitted, setPessoaSubmitted] = useState(false);
  const [pessoaParaExcluir, setPessoaParaExcluir] = useState<Pessoa | null>(null);

  // --- Modal Produtos (Incluir / Alterar) ---
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);
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
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);

  // --- Modal Categorias (Incluir / Alterar) ---
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<Categoria | null>(null);
  const [categoriaNome, setCategoriaNome] = useState('');
  const [categoriaSubmitted, setCategoriaSubmitted] = useState(false);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);

  // --- Modal Contas Bancárias (Bancos) - Incluir / Alterar ---
  const [isContaBancariaModalOpen, setIsContaBancariaModalOpen] = useState(false);
  const [contaBancariaEmEdicao, setContaBancariaEmEdicao] = useState<ContaBancaria | null>(null);
  const [contaBancariaNome, setContaBancariaNome] = useState('');
  const [contaBancariaSaldoInicialCentavos, setContaBancariaSaldoInicialCentavos] = useState(0);
  const [contaBancariaSubmitted, setContaBancariaSubmitted] = useState(false);
  const [contaBancariaParaExcluir, setContaBancariaParaExcluir] = useState<ContaBancaria | null>(null);

  // --- Modal Formas de Pagamento - Incluir / Alterar ---
  const [isFormaPagamentoModalOpen, setIsFormaPagamentoModalOpen] = useState(false);
  const [formaPagamentoEmEdicao, setFormaPagamentoEmEdicao] = useState<FormaPagamento | null>(null);
  const [formaPagamentoNome, setFormaPagamentoNome] = useState('');
  const [formaPagamentoSubmitted, setFormaPagamentoSubmitted] = useState(false);
  const [formaPagamentoParaExcluir, setFormaPagamentoParaExcluir] = useState<FormaPagamento | null>(null);

  // --- Modal de escolha do botão "Novo" no Financeiro ---
  const [isEscolhaFinanceiroModalOpen, setIsEscolhaFinanceiroModalOpen] = useState(false);

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

  // --- Handlers: Pessoas ---
  const abrirNovaPessoa = () => {
    setPessoaEmEdicao(null);
    setPessoaNome('');
    setPessoaTipo('juridica');
    setPessoaCpfCnpj('');
    setPessoaTelefone('');
    setPessoaWhatsapp('');
    setPessoaEndereco('');
    setPessoaObservacoes('');
    setPessoaIsCliente(true);
    setPessoaIsFornecedor(false);
    setPessoaSubmitted(false);
    setIsPessoaModalOpen(true);
  };

  const abrirEditarPessoa = (pes: Pessoa) => {
    setPessoaEmEdicao(pes);
    setPessoaNome(pes.nome);
    setPessoaTipo(pes.tipo || 'juridica');
    setPessoaCpfCnpj(pes.cpfCnpj || '');
    setPessoaTelefone(pes.telefone || '');
    setPessoaWhatsapp(pes.whatsapp || '');
    setPessoaEndereco(pes.endereco || '');
    setPessoaObservacoes(pes.observacoes || '');
    setPessoaIsCliente(pes.isCliente);
    setPessoaIsFornecedor(pes.isFornecedor);
    setPessoaSubmitted(false);
    setIsPessoaModalOpen(true);
  };

  const handleSalvarPessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    setPessoaSubmitted(true);
    if (!pessoaNome.trim()) return;

    const agora = new Date().toISOString();

    if (pessoaEmEdicao) {
      await db.pessoas.update(pessoaEmEdicao.id, {
        nome: pessoaNome.trim(),
        tipo: pessoaTipo,
        cpfCnpj: pessoaCpfCnpj.trim(),
        telefone: pessoaTelefone.trim(),
        whatsapp: pessoaWhatsapp.trim(),
        endereco: pessoaEndereco.trim(),
        observacoes: pessoaObservacoes.trim(),
        isCliente: pessoaIsCliente,
        isFornecedor: pessoaIsFornecedor,
        dataAlteracao: agora,
      });
    } else {
      const id = 'pes_' + Date.now();
      await db.pessoas.add({
        id,
        nome: pessoaNome.trim(),
        tipo: pessoaTipo,
        cpfCnpj: pessoaCpfCnpj.trim(),
        telefone: pessoaTelefone.trim(),
        whatsapp: pessoaWhatsapp.trim(),
        endereco: pessoaEndereco.trim(),
        observacoes: pessoaObservacoes.trim(),
        isCliente: pessoaIsCliente,
        isFornecedor: pessoaIsFornecedor,
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });
    }

    setIsPessoaModalOpen(false);
    setPessoaEmEdicao(null);
    setPessoaSubmitted(false);
    await carregarDados();
  };

  const handleExcluirPessoa = async () => {
    if (!pessoaParaExcluir) return;
    await db.pessoas.update(pessoaParaExcluir.id, {
      excluido: true,
      dataAlteracao: new Date().toISOString(),
    });
    setPessoaParaExcluir(null);
    await carregarDados();
  };

  // --- Handlers: Produtos ---
  const abrirNovoProduto = () => {
    setProdutoEmEdicao(null);
    setProdTipo('produto_acabado');
    setProdCodigo('');
    setProdNome('');
    setProdCategoriaId(categorias[0]?.id || '');
    setProdUnidade('UN');
    setProdPrecoCustoCentavos(0);
    setProdPrecoVendaCentavos(0);
    setProdEstoqueMinimo(10);
    setProdEstoqueAtual(0);
    setProdFormSubmitted(false);
    setIsProdutoModalOpen(true);
  };

  const abrirEditarProduto = (p: Produto) => {
    setProdutoEmEdicao(p);
    setProdTipo(p.tipo);
    setProdCodigo(p.codigo);
    setProdNome(p.nome);
    setProdCategoriaId(p.categoriaId);
    setProdUnidade(p.unidade);
    setProdPrecoCustoCentavos(p.precoCustoCentavos);
    setProdPrecoVendaCentavos(p.precoVendaCentavos);
    setProdEstoqueMinimo(p.estoqueMinimo);
    setProdEstoqueAtual(p.estoqueAtual);
    setProdFormSubmitted(false);
    setIsProdutoModalOpen(true);
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFormSubmitted(true);
    if (!prodNome.trim() || !prodCodigo.trim()) return;
    if (prodTipo === 'produto_acabado' && prodPrecoVendaCentavos <= 0) return;

    const agora = new Date().toISOString();

    if (produtoEmEdicao) {
      await db.produtos.update(produtoEmEdicao.id, {
        tipo: prodTipo,
        codigo: prodCodigo.toUpperCase().trim(),
        nome: prodNome.trim(),
        categoriaId: prodCategoriaId || categorias[0]?.id || '',
        unidade: prodUnidade.toUpperCase().trim(),
        precoCustoCentavos: prodPrecoCustoCentavos,
        precoVendaCentavos: prodPrecoVendaCentavos,
        estoqueMinimo: prodEstoqueMinimo,
        estoqueAtual: prodEstoqueAtual,
        dataAlteracao: agora,
      });
    } else {
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
    }

    setIsProdutoModalOpen(false);
    setProdutoEmEdicao(null);
    setProdFormSubmitted(false);
    await carregarDados();
  };

  const handleExcluirProduto = async () => {
    if (!produtoParaExcluir) return;
    await db.produtos.update(produtoParaExcluir.id, {
      excluido: true,
      dataAlteracao: new Date().toISOString(),
    });
    setProdutoParaExcluir(null);
    await carregarDados();
  };

  // --- Handlers: Categorias ---
  const abrirNovaCategoria = () => {
    setCategoriaEmEdicao(null);
    setCategoriaNome('');
    setCategoriaSubmitted(false);
    setIsCategoriaModalOpen(true);
  };

  const abrirEditarCategoria = (c: Categoria) => {
    setCategoriaEmEdicao(c);
    setCategoriaNome(c.nome);
    setCategoriaSubmitted(false);
    setIsCategoriaModalOpen(true);
  };

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoriaSubmitted(true);
    if (!categoriaNome.trim()) return;

    const agora = new Date().toISOString();

    if (categoriaEmEdicao) {
      await db.categorias.update(categoriaEmEdicao.id, {
        nome: categoriaNome.trim(),
        dataAlteracao: agora,
      });
    } else {
      const id = 'cat_' + Date.now();
      await db.categorias.add({
        id,
        nome: categoriaNome.trim(),
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });
    }

    setIsCategoriaModalOpen(false);
    setCategoriaEmEdicao(null);
    setCategoriaNome('');
    setCategoriaSubmitted(false);
    await carregarDados();
  };

  const handleExcluirCategoria = async () => {
    if (!categoriaParaExcluir) return;
    await db.categorias.update(categoriaParaExcluir.id, {
      excluido: true,
      dataAlteracao: new Date().toISOString(),
    });
    setCategoriaParaExcluir(null);
    await carregarDados();
  };

  // --- Handlers: Contas Bancárias (Bancos) ---
  const abrirNovaContaBancaria = () => {
    setContaBancariaEmEdicao(null);
    setContaBancariaNome('');
    setContaBancariaSaldoInicialCentavos(0);
    setContaBancariaSubmitted(false);
    setIsContaBancariaModalOpen(true);
  };

  const abrirEditarContaBancaria = (b: ContaBancaria) => {
    setContaBancariaEmEdicao(b);
    setContaBancariaNome(b.nome);
    setContaBancariaSaldoInicialCentavos(b.saldoInicialCentavos || 0);
    setContaBancariaSubmitted(false);
    setIsContaBancariaModalOpen(true);
  };

  const handleSalvarContaBancaria = async (e: React.FormEvent) => {
    e.preventDefault();
    setContaBancariaSubmitted(true);
    if (!contaBancariaNome.trim()) return;

    const agora = new Date().toISOString();

    if (contaBancariaEmEdicao) {
      await db.contasBancarias.update(contaBancariaEmEdicao.id, {
        nome: contaBancariaNome.trim(),
        saldoInicialCentavos: contaBancariaSaldoInicialCentavos,
        dataAlteracao: agora,
      });
    } else {
      const id = 'cb_' + Date.now();
      await db.contasBancarias.add({
        id,
        nome: contaBancariaNome.trim(),
        saldoInicialCentavos: contaBancariaSaldoInicialCentavos,
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });
    }

    setIsContaBancariaModalOpen(false);
    setContaBancariaEmEdicao(null);
    setContaBancariaNome('');
    setContaBancariaSaldoInicialCentavos(0);
    setContaBancariaSubmitted(false);
    await carregarDados();
  };

  const handleExcluirContaBancaria = async () => {
    if (!contaBancariaParaExcluir) return;
    await db.contasBancarias.update(contaBancariaParaExcluir.id, {
      excluido: true,
      dataAlteracao: new Date().toISOString(),
    });
    setContaBancariaParaExcluir(null);
    await carregarDados();
  };

  // --- Handlers: Formas de Pagamento ---
  const abrirNovaFormaPagamento = () => {
    setFormaPagamentoEmEdicao(null);
    setFormaPagamentoNome('');
    setFormaPagamentoSubmitted(false);
    setIsFormaPagamentoModalOpen(true);
  };

  const abrirEditarFormaPagamento = (fp: FormaPagamento) => {
    setFormaPagamentoEmEdicao(fp);
    setFormaPagamentoNome(fp.nome);
    setFormaPagamentoSubmitted(false);
    setIsFormaPagamentoModalOpen(true);
  };

  const handleSalvarFormaPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormaPagamentoSubmitted(true);
    if (!formaPagamentoNome.trim()) return;

    const agora = new Date().toISOString();

    if (formaPagamentoEmEdicao) {
      await db.formasPagamento.update(formaPagamentoEmEdicao.id, {
        nome: formaPagamentoNome.trim(),
        dataAlteracao: agora,
      });
    } else {
      const id = 'fp_' + Date.now();
      await db.formasPagamento.add({
        id,
        nome: formaPagamentoNome.trim(),
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });
    }

    setIsFormaPagamentoModalOpen(false);
    setFormaPagamentoEmEdicao(null);
    setFormaPagamentoNome('');
    setFormaPagamentoSubmitted(false);
    await carregarDados();
  };

  const handleExcluirFormaPagamento = async () => {
    if (!formaPagamentoParaExcluir) return;
    await db.formasPagamento.update(formaPagamentoParaExcluir.id, {
      excluido: true,
      dataAlteracao: new Date().toISOString(),
    });
    setFormaPagamentoParaExcluir(null);
    await carregarDados();
  };

  // Filtros de busca
  const term = searchTerm.toLowerCase().trim();
  const produtosFiltrados = produtos.filter(
    (p) => p.nome.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term)
  );
  const pessoasFiltradas = pessoas.filter(
    (p) => p.nome.toLowerCase().includes(term) || (p.cpfCnpj && p.cpfCnpj.includes(term))
  );
  const categoriasFiltradas = categorias.filter((c) => c.nome.toLowerCase().includes(term));
  const contasFiltradas = contasBancarias.filter((b) => b.nome.toLowerCase().includes(term));
  const formasFiltradas = formasPagamento.filter((fp) => fp.nome.toLowerCase().includes(term));

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cadastros Gerais</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Produtos, pessoas, categorias, plano de contas, bancos e formas de pagamento
          </p>
        </div>
        {subTab !== 'planocontas' && (
          <button
            onClick={() => {
              if (subTab === 'pessoas') abrirNovaPessoa();
              else if (subTab === 'produtos') abrirNovoProduto();
              else if (subTab === 'categorias') abrirNovaCategoria();
              else if (subTab === 'financeiro') setIsEscolhaFinanceiroModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto gap-1">
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
            subTab === 'planocontas'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500'
          }`}
        >
          Plano DRE
        </button>
        <button
          onClick={() => setSubTab('financeiro')}
          className={`flex-1 min-w-[85px] py-1.5 text-xs font-bold rounded-lg transition ${
            subTab === 'financeiro' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
          }`}
        >
          Bancos & FP
        </button>
      </div>

      {/* Search Input for lists (except PlanoContas which has its own) */}
      {subTab !== 'planocontas' && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* SubTab 1: Produtos */}
      {subTab === 'produtos' && (
        <div className="space-y-2.5">
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <Package className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhum produto ou insumo cadastrado.</p>
            </div>
          ) : (
            produtosFiltrados.map((p) => (
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
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
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
                <div className="flex flex-col items-end gap-1.5">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatNumber(p.estoqueAtual)} {p.unidade}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Mín: {p.estoqueMinimo} {p.unidade}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEditarProduto(p)}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition"
                      title="Editar Produto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdutoParaExcluir(p)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                      title="Excluir Produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SubTab 2: Pessoas */}
      {subTab === 'pessoas' && (
        <div className="space-y-2.5">
          {pessoasFiltradas.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <Users className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhum cliente ou fornecedor cadastrado.</p>
            </div>
          ) : (
            pessoasFiltradas.map((pes) => (
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
                  <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                      <button
                        type="button"
                        onClick={() => abrirEditarPessoa(pes)}
                        className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition"
                        title="Editar Pessoa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPessoaParaExcluir(pes)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                        title="Excluir Pessoa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {pes.endereco && (
                  <div className="text-[11px] text-slate-400 truncate">
                    📍 {pes.endereco}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SubTab 3: Categorias */}
      {subTab === 'categorias' && (
        <div className="space-y-2">
          {categoriasFiltradas.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <Tags className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhuma categoria cadastrada.</p>
            </div>
          ) : (
            categoriasFiltradas.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Tags className="w-4 h-4 text-sky-500" />
                  <span>{c.nome}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEditarCategoria(c)}
                    className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition"
                    title="Editar Categoria"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoriaParaExcluir(c)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SubTab 4: Financeiro (Bancos e Formas de Pagamento com Janelas para Incluir/Alterar) */}
      {subTab === 'financeiro' && (
        <div className="space-y-5">
          {/* SEÇÃO 1: CONTAS BANCÁRIAS E CAIXA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-500" />
                  <span>Contas Bancárias & Caixa</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Contas correntes, digitais e caixa físico
                </p>
              </div>
              <button
                type="button"
                onClick={abrirNovaContaBancaria}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Conta</span>
              </button>
            </div>

            <div className="space-y-2">
              {contasFiltradas.length === 0 ? (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                  Nenhuma conta bancária cadastrada.
                </div>
              ) : (
                contasFiltradas.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-center transition hover:border-sky-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                          {b.nome}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Saldo Inicial: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(b.saldoInicialCentavos)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEditarContaBancaria(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition"
                        title="Alterar Conta Bancária"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Alterar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setContaBancariaParaExcluir(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                        title="Excluir Conta Bancária"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SEÇÃO 2: FORMAS DE PAGAMENTO */}
          <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Formas de Pagamento</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Meios de recebimento e pagamento (Pix, Cartão, Dinheiro...)
                </p>
              </div>
              <button
                type="button"
                onClick={abrirNovaFormaPagamento}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Forma</span>
              </button>
            </div>

            <div className="space-y-2">
              {formasFiltradas.length === 0 ? (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                  Nenhuma forma de pagamento cadastrada.
                </div>
              ) : (
                formasFiltradas.map((fp) => (
                  <div
                    key={fp.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex justify-between items-center transition hover:border-emerald-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                          {fp.nome}
                        </h5>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Ativa para vendas e compras
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEditarFormaPagamento(fp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition"
                        title="Alterar Forma de Pagamento"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Alterar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormaPagamentoParaExcluir(fp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                        title="Excluir Forma de Pagamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SubTab 5: Plano de Contas */}
      {subTab === 'planocontas' && <PlanoContasView />}

      {/* ======================================================== */}
      {/* JANELAS / MODAIS DO MÓDULO BANCOS & FORMAS DE PAGAMENTO */}
      {/* ======================================================== */}

      {/* MODAL 1: Conta Bancária (Incluir ou Alterar) */}
      {isContaBancariaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {contaBancariaEmEdicao ? 'Alterar Conta Bancária / Caixa' : 'Nova Conta Bancária / Caixa'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {contaBancariaEmEdicao ? 'Atualize os dados da conta financeira' : 'Cadastre uma conta corrente ou caixa físico'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsContaBancariaModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarContaBancaria} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome da Conta / Banco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conta Digital Inter PJ, Caixa Físico, Banco do Brasil..."
                  value={contaBancariaNome}
                  onChange={(e) => setContaBancariaNome(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium transition ${
                    contaBancariaSubmitted && !contaBancariaNome.trim()
                      ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {contaBancariaSubmitted && !contaBancariaNome.trim() && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Informe o nome da conta ou banco.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Saldo Inicial (R$)
                </label>
                <MoneyInput
                  valueCentavos={contaBancariaSaldoInicialCentavos}
                  onChange={(val) => setContaBancariaSaldoInicialCentavos(val)}
                  allowNegative={true}
                  helperText="Saldo inicial na abertura ou implantação do sistema."
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsContaBancariaModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {contaBancariaEmEdicao ? 'Salvar Alterações' : 'Cadastrar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Excluir Conta Bancária */}
      {contaBancariaParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Excluir Conta Bancária
                </h3>
                <p className="text-[11px] text-slate-500">Confirmação de exclusão</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Deseja realmente excluir a conta{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{contaBancariaParaExcluir.nome}"
                </strong>
                ?
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                A conta não aparecerá mais para novos lançamentos e baixas financeiras.
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setContaBancariaParaExcluir(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExcluirContaBancaria}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Sim, Excluir Conta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Forma de Pagamento (Incluir ou Alterar) */}
      {isFormaPagamentoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {formaPagamentoEmEdicao ? 'Alterar Forma de Pagamento' : 'Nova Forma de Pagamento'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {formaPagamentoEmEdicao ? 'Atualize o nome da forma de pagamento' : 'Cadastre um novo meio de recebimento/pagamento'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormaPagamentoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarFormaPagamento} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome da Forma de Pagamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pix, Cartão de Crédito 30 dias, Boleto 15 dias, Dinheiro..."
                  value={formaPagamentoNome}
                  onChange={(e) => setFormaPagamentoNome(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium transition ${
                    formaPagamentoSubmitted && !formaPagamentoNome.trim()
                      ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {formaPagamentoSubmitted && !formaPagamentoNome.trim() && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Informe o nome da forma de pagamento.</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormaPagamentoModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {formaPagamentoEmEdicao ? 'Salvar Alterações' : 'Cadastrar Forma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Excluir Forma de Pagamento */}
      {formaPagamentoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Excluir Forma de Pagamento
                </h3>
                <p className="text-[11px] text-slate-500">Confirmação de exclusão</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Deseja realmente excluir a forma de pagamento{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{formaPagamentoParaExcluir.nome}"
                </strong>
                ?
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                A forma de pagamento não constará mais para novas opções de faturamento e compras.
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormaPagamentoParaExcluir(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExcluirFormaPagamento}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Sim, Excluir Forma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Escolha do botão "Novo" quando na aba Bancos & FP */}
      {isEscolhaFinanceiroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">O que deseja cadastrar?</h3>
              <button onClick={() => setIsEscolhaFinanceiroModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsEscolhaFinanceiroModalOpen(false);
                  abrirNovaContaBancaria();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100/60 text-left transition"
              >
                <div className="p-2 bg-sky-500 text-white rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-sky-900 dark:text-sky-300">Nova Conta Bancária / Caixa</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Conta corrente, digital ou caixa físico</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEscolhaFinanceiroModalOpen(false);
                  abrirNovaFormaPagamento();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 text-left transition"
              >
                <div className="p-2 bg-emerald-500 text-white rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300">Nova Forma de Pagamento</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Pix, Boleto, Cartão, Dinheiro...</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* OUTROS MODAIS EXISTENTES (PESSOA, PRODUTO, CATEGORIA) */}
      {/* ======================================================== */}

      {/* Modal Pessoa */}
      {isPessoaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {pessoaEmEdicao ? 'Alterar Pessoa' : 'Cadastrar Pessoa'}
              </h3>
              <button onClick={() => setIsPessoaModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarPessoa} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nome Completo / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={pessoaNome}
                  onChange={(e) => setPessoaNome(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white transition ${
                    pessoaSubmitted && !pessoaNome.trim()
                      ? 'border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {pessoaSubmitted && !pessoaNome.trim() && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Nome é obrigatório.</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">CPF ou CNPJ</label>
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={pessoaWhatsapp}
                    onChange={(e) => setPessoaWhatsapp(e.target.value)}
                    placeholder="11999998888"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Telefone Fixo</label>
                  <input
                    type="text"
                    value={pessoaTelefone}
                    onChange={(e) => setPessoaTelefone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Endereço</label>
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

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPessoaModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 text-white font-bold text-xs rounded-xl"
                >
                  {pessoaEmEdicao ? 'Salvar Alterações' : 'Salvar Pessoa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Pessoa */}
      {pessoaParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Excluir Pessoa</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir <strong>"{pessoaParaExcluir.nome}"</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPessoaParaExcluir(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluirPessoa}
                className="flex-1 py-2 bg-rose-600 text-white text-xs rounded-xl font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {isProdutoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {produtoEmEdicao ? 'Alterar Produto / Insumo' : 'Cadastrar Produto / Insumo'}
              </h3>
              <button onClick={() => setIsProdutoModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarProduto} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Tipo de Item *</label>
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Código / Ref *</label>
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Unidade (UN, KG, L, M) *</label>
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
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {produtoEmEdicao ? 'Estoque Atual' : 'Estoque Inicial'}
                </label>
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

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProdutoModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 text-white font-bold text-xs rounded-xl"
                >
                  {produtoEmEdicao ? 'Salvar Alterações' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Produto */}
      {produtoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Excluir Produto / Insumo</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir <strong>"{produtoParaExcluir.nome}"</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProdutoParaExcluir(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluirProduto}
                className="flex-1 py-2 bg-rose-600 text-white text-xs rounded-xl font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Categoria (Incluir / Alterar) */}
      {isCategoriaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {categoriaEmEdicao ? 'Alterar Categoria' : 'Nova Categoria de Produto'}
              </h3>
              <button onClick={() => setIsCategoriaModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarCategoria} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nome da Categoria"
                  value={categoriaNome}
                  onChange={(e) => setCategoriaNome(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white ${
                    categoriaSubmitted && !categoriaNome.trim()
                      ? 'border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {categoriaSubmitted && !categoriaNome.trim() && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span>Nome da categoria é obrigatório.</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
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
                  {categoriaEmEdicao ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Categoria */}
      {categoriaParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Excluir Categoria</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir a categoria <strong>"{categoriaParaExcluir.nome}"</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoriaParaExcluir(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluirCategoria}
                className="flex-1 py-2 bg-rose-600 text-white text-xs rounded-xl font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
