import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  FileText,
  Share2,
  CheckCircle,
  Clock,
  Send,
  X,
  AlertCircle,
  ChevronRight,
  PackageCheck,
  Printer,
  Trash2,
} from 'lucide-react';
import { db, faturarPedido } from '../db';
import { formatCurrency, formatDateBr, todayIsoDate, addDaysIso } from '../utils/formatters';
import { Venda, ItemVenda, Produto, Pessoa, FormaPagamento, DadosEmpresa } from '../types';
import { QuantityInput } from '../components/common/QuantityInput';
import { MoneyInput } from '../components/common/MoneyInput';

export const VendasView: React.FC = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null);

  const [activeTab, setActiveTab] = useState<'pedidos' | 'orcamentos'>('pedidos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendaEmEdicao, setVendaEmEdicao] = useState<Venda | null>(null);

  // Form State
  const [formTipo, setFormTipo] = useState<'orcamento' | 'pedido'>('pedido');
  const [formClienteId, setFormClienteId] = useState('');
  const [formFormaPagamentoId, setFormFormaPagamentoId] = useState('');
  const [formNumeroParcelas, setFormNumeroParcelas] = useState(1);
  const [formDataEntrega, setFormDataEntrega] = useState(todayIsoDate());
  const [formValidade, setFormValidade] = useState(addDaysIso(todayIsoDate(), 15));
  const [formDescontoCentavos, setFormDescontoCentavos] = useState(0);
  const [formFreteCentavos, setFormFreteCentavos] = useState(0);
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formItens, setFormItens] = useState<ItemVenda[]>([]);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const carregarDados = async () => {
    const todasVendas = await db.vendas.filter((v) => !v.excluido).reverse().toArray();
    setVendas(todasVendas);

    const todosProds = await db.produtos
      .filter((p) => !p.excluido && p.tipo === 'produto_acabado')
      .toArray();
    setProdutos(todosProds);

    const todosClientes = await db.pessoas
      .filter((p) => !p.excluido && p.isCliente)
      .toArray();
    setClientes(todosClientes);

    const fps = await db.formasPagamento.filter((f) => !f.excluido).toArray();
    setFormasPagamento(fps);

    const emp = await db.empresaConfig.get('empresa_padrao');
    if (emp) setEmpresa(emp);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirCriacao = (tipo: 'orcamento' | 'pedido' = 'pedido') => {
    setFormTipo(tipo);
    setFormClienteId(clientes[0]?.id || '');
    setFormFormaPagamentoId(formasPagamento[0]?.id || '');
    setFormNumeroParcelas(1);
    setFormDataEntrega(addDaysIso(todayIsoDate(), 3));
    setFormValidade(addDaysIso(todayIsoDate(), 15));
    setFormDescontoCentavos(0);
    setFormFreteCentavos(0);
    setFormObservacoes('');

    if (produtos.length > 0) {
      setFormItens([
        {
          id: 'item_' + Date.now(),
          produtoId: produtos[0].id,
          quantidade: 10,
          precoUnitarioCentavos: produtos[0].precoVendaCentavos,
          origem: 'estoque',
        },
      ]);
    } else {
      setFormItens([]);
    }

    setVendaEmEdicao(null);
    setFormSubmitted(false);
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (produtos.length === 0) return;
    setFormItens((prev) => [
      ...prev,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        produtoId: produtos[0].id,
        quantidade: 1,
        precoUnitarioCentavos: produtos[0].precoVendaCentavos,
        origem: 'estoque',
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof ItemVenda, value: any) => {
    setFormItens((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      // Se mudou o produto, atualiza o preço de venda padrão
      if (field === 'produtoId') {
        const prod = produtos.find((p) => p.id === value);
        if (prod) {
          copy[index].precoUnitarioCentavos = prod.precoVendaCentavos;
        }
      }
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormItens((prev) => prev.filter((_, i) => i !== index));
  };

  // Totais do formulário
  const subtotalCentavos = formItens.reduce(
    (acc, it) => acc + Math.round(it.quantidade * it.precoUnitarioCentavos),
    0
  );
  const totalLiquidoCentavos = Math.max(
    0,
    subtotalCentavos - formDescontoCentavos + formFreteCentavos
  );

  const handleSalvarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!formClienteId || formItens.length === 0) {
      return;
    }
    if (formDescontoCentavos > subtotalCentavos) {
      return;
    }
    if (formItens.some((i) => i.quantidade <= 0 || i.precoUnitarioCentavos <= 0)) {
      return;
    }

    const agora = new Date().toISOString();
    const countVendas = await db.vendas.count();
    const numero = countVendas + 101;

    // Criar registro da Venda
    const vendaId = vendaEmEdicao?.id || 'ven_' + Date.now();
    const novaVenda: Venda = {
      id: vendaId,
      numero: vendaEmEdicao?.numero || numero,
      tipo: formTipo,
      clienteId: formClienteId,
      itens: formItens,
      descontoCentavos: formDescontoCentavos,
      freteCentavos: formFreteCentavos,
      totalCentavos: totalLiquidoCentavos,
      validade: formTipo === 'orcamento' ? formValidade : undefined,
      formaPagamentoId: formFormaPagamentoId,
      numeroParcelas: formNumeroParcelas,
      dataEntregaPrevista: formTipo === 'pedido' ? formDataEntrega : undefined,
      status:
        vendaEmEdicao?.status ||
        (formTipo === 'orcamento' ? 'rascunho' : 'aberto'),
      observacoes: formObservacoes,
      excluido: false,
      dataCriacao: vendaEmEdicao?.dataCriacao || agora,
      dataAlteracao: agora,
    };

    // Se for Pedido e tiver itens com origem 'producao', cria as ordens de produção correspondentes
    if (formTipo === 'pedido' && !vendaEmEdicao) {
      for (const item of formItens) {
        if (item.origem === 'producao') {
          // Busca a ficha técnica desse produto
          const ficha = await db.fichasTecnicas
            .filter((f) => !f.excluido && f.produtoAcabadoId === item.produtoId)
            .first();

          if (ficha) {
            const opCount = await db.ordensProducao.count();
            const opNumero = opCount + 101;
            const opId = 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

            // Calcular necessidade de insumos
            const rend = ficha.rendimento > 0 ? ficha.rendimento : 1;
            const mult = item.quantidade / rend;
            const insumosPrevistos = ficha.insumos.map((ins) => ({
              materiaPrimaId: ins.materiaPrimaId,
              quantidadePrevista: parseFloat((ins.quantidade * mult).toFixed(3)),
            }));

            await db.ordensProducao.add({
              id: opId,
              numero: opNumero,
              tipo: 'encomenda',
              pedidoId: vendaId,
              produtoAcabadoId: item.produtoId,
              fichaTecnicaId: ficha.id,
              quantidadePlanejada: item.quantidade,
              dataPrevista: formDataEntrega,
              status: 'planejada',
              insumosPrevistos,
              excluido: false,
              dataCriacao: agora,
              dataAlteracao: agora,
            });

            item.ordemProducaoId = opId;
          }
        }
      }
    }

    if (vendaEmEdicao) {
      await db.vendas.put(novaVenda);
    } else {
      await db.vendas.add(novaVenda);
    }

    setIsModalOpen(false);
    await carregarDados();
  };

  const handleConverterEmPedido = async (orcamento: Venda) => {
    const agora = new Date().toISOString();
    await db.vendas.update(orcamento.id, {
      tipo: 'pedido',
      status: 'aberto',
      dataEntregaPrevista: addDaysIso(todayIsoDate(), 5),
      dataAlteracao: agora,
    });
    await carregarDados();
  };

  const handleFaturar = async (pedido: Venda) => {
    if (!window.confirm(`Confirmar faturamento do Pedido #${pedido.numero}? Isso dará baixa no estoque e gerará as contas a receber.`)) {
      return;
    }
    try {
      await faturarPedido(pedido.id);
      await carregarDados();
      alert(`Pedido #${pedido.numero} faturado com sucesso! Contas a receber geradas.`);
    } catch (err: any) {
      alert('Erro ao faturar pedido: ' + err.message);
    }
  };

  const handleCompartilharWhatsApp = async (v: Venda) => {
    const cli = clientes.find((c) => c.id === v.clienteId);
    const cliNome = cli?.nome || 'Cliente';
    const tipoStr = v.tipo === 'orcamento' ? 'ORÇAMENTO' : 'PEDIDO';

    let texto = `*${empresa?.nome || 'Fábrica'}*\n`;
    texto += `📋 *${tipoStr} #${v.numero}*\n`;
    texto += `👤 Cliente: ${cliNome}\n`;
    texto += `📅 Data: ${formatDateBr(v.dataCriacao)}\n`;
    if (v.dataEntregaPrevista) texto += `🚚 Previsão de Entrega: ${formatDateBr(v.dataEntregaPrevista)}\n`;
    texto += `----------------------------\n`;
    texto += `*ITENS:*\n`;

    v.itens.forEach((it, i) => {
      const prod = produtos.find((p) => p.id === it.produtoId);
      const sub = (it.quantidade * it.precoUnitarioCentavos) / 100;
      texto += `${i + 1}. ${prod?.nome || 'Item'} - ${it.quantidade}x ${formatCurrency(it.precoUnitarioCentavos)} = R$ ${sub.toFixed(2)}\n`;
    });

    texto += `----------------------------\n`;
    if (v.descontoCentavos > 0) texto += `Desconto: -${formatCurrency(v.descontoCentavos)}\n`;
    if (v.freteCentavos > 0) texto += `Frete: ${formatCurrency(v.freteCentavos)}\n`;
    texto += `*TOTAL: ${formatCurrency(v.totalCentavos)}*\n`;
    texto += `💳 Parcelas: ${v.numeroParcelas}x\n`;
    if (v.observacoes) texto += `Obs: ${v.observacoes}\n`;
    texto += `\nAgradecemos a preferência!`;

    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tipoStr} #${v.numero} - ${empresa?.nome || 'Fábrica'}`,
          text: texto,
        });
        return;
      } catch (e) {
        // Fallback to WhatsApp URL
      }
    }

    const phone = cli?.whatsapp?.replace(/\D/g, '') || '';
    const encoded = encodeURIComponent(texto);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=55${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const listaFiltrada = vendas
    .filter((v) => v.tipo === (activeTab === 'pedidos' ? 'pedido' : 'orcamento'))
    .filter((v) => {
      if (!searchTerm) return true;
      const cli = clientes.find((c) => c.id === v.clienteId);
      return (
        v.numero.toString().includes(searchTerm) ||
        (cli?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
    });

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Top Header & New Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Vendas & Comercial</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Orçamentos, pedidos sob encomenda e faturamento
          </p>
        </div>
        <button
          onClick={() => abrirCriacao(activeTab === 'pedidos' ? 'pedido' : 'orcamento')}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'pedidos' ? 'Novo Pedido' : 'Novo Orçamento'}</span>
        </button>
      </div>

      {/* Segmented Switcher (Pedidos / Orçamentos) */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'pedidos'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Pedidos de Venda</span>
        </button>
        <button
          onClick={() => setActiveTab('orcamentos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'orcamentos'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Orçamentos</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por cliente ou número..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* List */}
      {listaFiltrada.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Nenhum {activeTab === 'pedidos' ? 'pedido' : 'orçamento'} cadastrado
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Toque no botão acima para criar uma nova venda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map((v) => {
            const cli = clientes.find((c) => c.id === v.clienteId);
            const isFaturado = v.status === 'faturado';
            const isOrcamento = v.tipo === 'orcamento';

            return (
              <div
                key={v.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        #{v.numero}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {cli?.nome || 'Cliente não identificado'}
                      </h4>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {formatDateBr(v.dataCriacao)} • {v.itens.length} {v.itens.length === 1 ? 'item' : 'itens'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(v.totalCentavos)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                        isFaturado
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : v.status === 'aprovado'
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                </div>

                {/* Items summary */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  {v.itens.map((it, idx) => {
                    const prod = produtos.find((p) => p.id === it.produtoId);
                    return (
                      <div key={idx} className="flex justify-between items-center text-[11px] gap-2">
                        <span className="truncate flex-1 min-w-0">
                          {it.quantidade}x {prod?.nome || 'Produto'}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {it.origem === 'producao' ? '🛠️ Produção' : '📦 Estoque'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleCompartilharWhatsApp(v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* If Orcamento: Convert button */}
                    {isOrcamento && v.status !== 'recusado' && (
                      <button
                        onClick={() => handleConverterEmPedido(v)}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
                      >
                        Converter em Pedido
                      </button>
                    )}

                    {/* If Pedido and not yet faturado: Faturar button */}
                    {!isOrcamento && !isFaturado && v.status !== 'cancelado' && (
                      <button
                        onClick={() => handleFaturar(v)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Faturar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar/Editar Venda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {vendaEmEdicao ? 'Editar Venda' : formTipo === 'pedido' ? 'Novo Pedido de Venda' : 'Novo Orçamento'}
                </h3>
                <p className="text-[11px] text-slate-500">Preencha os dados comerciais</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarVenda} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Type Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormTipo('pedido')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    formTipo === 'pedido' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setFormTipo('orcamento')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    formTipo === 'orcamento' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Orçamento
                </button>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cliente *
                </label>
                <select
                  value={formClienteId}
                  onChange={(e) => setFormClienteId(e.target.value)}
                  required
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none transition ${
                    formSubmitted && !formClienteId
                      ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500'
                  }`}
                >
                  <option value="" disabled>Selecione um cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''}
                    </option>
                  ))}
                </select>
                {formSubmitted && !formClienteId && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Selecione um cliente para prosseguir com a venda.</span>
                  </p>
                )}
              </div>

              {/* Itens */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Itens da Venda *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                {formSubmitted && formItens.length === 0 && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5 p-2 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Adicione ao menos um item para registrar a venda.</span>
                  </p>
                )}

                {formItens.map((it, idx) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 min-w-0"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Item / Descrição do Produto
                        </label>
                        {formItens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={it.produtoId}
                        onChange={(e) => handleUpdateItem(idx, 'produtoId', e.target.value)}
                        className="w-full min-w-0 truncate bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} (Estoque: {p.estoqueAtual} {p.unidade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end min-w-0">
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Qtd</span>
                        <QuantityInput
                          size="sm"
                          min={1}
                          step={1}
                          required
                          value={it.quantidade}
                          onChange={(val) => handleUpdateItem(idx, 'quantidade', val)}
                          error={formSubmitted && it.quantidade <= 0 ? 'Qtd mínima é 1' : null}
                          className="w-full min-w-0"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Preço Un.</span>
                        <MoneyInput
                          valueCentavos={it.precoUnitarioCentavos}
                          onChange={(val) => handleUpdateItem(idx, 'precoUnitarioCentavos', val)}
                          required
                          error={formSubmitted && it.precoUnitarioCentavos <= 0 ? 'Preço deve ser maior que zero' : null}
                          size="sm"
                          className="w-full min-w-0"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Origem</span>
                        <select
                          value={it.origem}
                          onChange={(e) => handleUpdateItem(idx, 'origem', e.target.value)}
                          className="w-full min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white h-[34px]"
                        >
                          <option value="estoque">📦 Sai do Estoque</option>
                          <option value="producao">🛠️ Vai para Produção (OP)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial & Delivery Details */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formFormaPagamentoId}
                    onChange={(e) => setFormFormaPagamentoId(e.target.value)}
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
                    Número de Parcelas
                  </label>
                  <QuantityInput
                    size="sm"
                    min={1}
                    max={24}
                    step={1}
                    value={formNumeroParcelas}
                    onChange={(val) => setFormNumeroParcelas(val)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Desconto e Frete */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Desconto
                  </label>
                  <MoneyInput
                    valueCentavos={formDescontoCentavos}
                    onChange={(val) => setFormDescontoCentavos(val)}
                    size="sm"
                    error={
                      formDescontoCentavos > subtotalCentavos
                        ? `Desconto não pode superar o subtotal (${formatCurrency(subtotalCentavos)})`
                        : null
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Frete
                  </label>
                  <MoneyInput
                    valueCentavos={formFreteCentavos}
                    onChange={(val) => setFormFreteCentavos(val)}
                    size="sm"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Delivery / Validity date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {formTipo === 'pedido' ? 'Data de Entrega Prevista' : 'Validade da Proposta'}
                </label>
                <input
                  type="date"
                  value={formTipo === 'pedido' ? formDataEntrega : formValidade}
                  onChange={(e) =>
                    formTipo === 'pedido'
                      ? setFormDataEntrega(e.target.value)
                      : setFormValidade(e.target.value)
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Instruções de entrega, notas para o cliente..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Total Banner */}
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-sky-800 dark:text-sky-300 font-semibold">
                    Valor Total Líquido
                  </span>
                  <div className="text-base font-black text-sky-950 dark:text-sky-100">
                    {formatCurrency(totalLiquidoCentavos)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  {formNumeroParcelas}x de {formatCurrency(Math.round(totalLiquidoCentavos / formNumeroParcelas))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Salvar {formTipo === 'pedido' ? 'Pedido' : 'Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
