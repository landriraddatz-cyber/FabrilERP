import Dexie, { type Table } from 'dexie';
import {
  Pessoa,
  Produto,
  Categoria,
  FichaTecnica,
  OrdemProducao,
  Venda,
  Compra,
  MovimentoEstoque,
  ContaFinanceiraItem,
  ContaBancaria,
  FormaPagamento,
  DadosEmpresa,
  PlanoConta,
} from '../types';
import { calculateRealProductionUnitCost, splitInstallments } from '../utils/calculations';
import { todayIsoDate } from '../utils/formatters';

export class FabrilDatabase extends Dexie {
  pessoas!: Table<Pessoa, string>;
  produtos!: Table<Produto, string>;
  categorias!: Table<Categoria, string>;
  fichasTecnicas!: Table<FichaTecnica, string>;
  ordensProducao!: Table<OrdemProducao, string>;
  vendas!: Table<Venda, string>;
  compras!: Table<Compra, string>;
  movimentosEstoque!: Table<MovimentoEstoque, string>;
  contasFinanceiras!: Table<ContaFinanceiraItem, string>;
  contasBancarias!: Table<ContaBancaria, string>;
  formasPagamento!: Table<FormaPagamento, string>;
  empresaConfig!: Table<DadosEmpresa & { id: string }, string>;
  planoContas!: Table<PlanoConta, string>;

  constructor() {
    super('FabrilERPDB');
    this.version(2).stores({
      pessoas: 'id, nome, tipo, isCliente, isFornecedor, excluido, dataCriacao',
      produtos: 'id, tipo, codigo, nome, categoriaId, excluido, dataCriacao',
      categorias: 'id, nome, excluido',
      fichasTecnicas: 'id, produtoAcabadoId, excluido',
      ordensProducao: 'id, numero, tipo, status, produtoAcabadoId, pedidoId, excluido, dataCriacao',
      vendas: 'id, numero, tipo, status, clienteId, excluido, dataCriacao',
      compras: 'id, numero, fornecedorId, status, excluido, dataCriacao',
      movimentosEstoque: 'id, produtoId, tipo, referenciaTipo, excluido, dataCriacao',
      contasFinanceiras: 'id, tipo, status, dataVencimento, referenciaTipo, referenciaId, planoContaId, mesCompetencia, excluido, dataCriacao',
      contasBancarias: 'id, nome, excluido',
      formasPagamento: 'id, nome, excluido',
      empresaConfig: 'id',
      planoContas: 'id, codigo, nome, tipo, grupoDRE, excluido',
    });
  }
}

export const db = new FabrilDatabase();

// --- ATOMIC OPERATIONS ---

/**
 * Conclui uma Ordem de Produção de forma atômica:
 * - Dá baixa nos insumos consumidos (gera saídas de estoque e decrementa saldo)
 * - Dá entrada no produto acabado (gera entrada de estoque e incrementa saldo)
 * - Calcula o custo unitário real
 * - Atualiza o preço de custo do produto acabado
 * - Atualiza o status da OP para 'concluida'
 */
export async function concluirOrdemProducao(
  ordemId: string,
  quantidadeProduzida: number,
  insumosConsumidos: Array<{ materiaPrimaId: string; quantidadeReal: number; custoTotalCentavos: number }>,
  custosAdicionais: {
    maoDeObraCentavos?: number;
    energiaCentavos?: number;
    embalagemCentavos?: number;
    outrosCentavos?: number;
  }
) {
  return await db.transaction('rw', [db.ordensProducao, db.produtos, db.movimentosEstoque], async () => {
    const op = await db.ordensProducao.get(ordemId);
    if (!op || op.excluido) throw new Error('Ordem de produção não encontrada.');
    if (op.status === 'concluida') throw new Error('Ordem já concluída.');

    const agora = new Date().toISOString();
    const dataConclusao = todayIsoDate();

    // 1. Processar baixa das matérias-primas consumidas
    for (const item of insumosConsumidos) {
      const mp = await db.produtos.get(item.materiaPrimaId);
      if (!mp) continue;

      const qtdAnterior = mp.estoqueAtual;
      const qtdPosterior = qtdAnterior - item.quantidadeReal;

      // Movimento de saída
      const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      await db.movimentosEstoque.add({
        id: movId,
        produtoId: mp.id,
        tipo: 'saida',
        quantidade: item.quantidadeReal,
        quantidadeAnterior: qtdAnterior,
        quantidadePosterior: qtdPosterior,
        custoUnitarioCentavos: item.quantidadeReal > 0 ? Math.round(item.custoTotalCentavos / item.quantidadeReal) : mp.precoCustoCentavos,
        motivo: `Consumo OP #${op.numero}`,
        referenciaTipo: 'ordem_producao',
        referenciaId: op.id,
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });

      // Atualiza saldo da MP
      await db.produtos.update(mp.id, {
        estoqueAtual: parseFloat(qtdPosterior.toFixed(3)),
        dataAlteracao: agora,
      });
    }

    // 2. Calcular custo unitário real
    const calc = calculateRealProductionUnitCost(insumosConsumidos, custosAdicionais, quantidadeProduzida);

    // 3. Processar entrada do produto acabado
    const prodAcabado = await db.produtos.get(op.produtoAcabadoId);
    if (prodAcabado) {
      const qtdAnteriorProd = prodAcabado.estoqueAtual;
      const qtdPosteriorProd = qtdAnteriorProd + quantidadeProduzida;

      const movProdId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      await db.movimentosEstoque.add({
        id: movProdId,
        produtoId: prodAcabado.id,
        tipo: 'entrada',
        quantidade: quantidadeProduzida,
        quantidadeAnterior: qtdAnteriorProd,
        quantidadePosterior: qtdPosteriorProd,
        custoUnitarioCentavos: calc.custoUnitarioRealCentavos,
        motivo: `Conclusão OP #${op.numero}`,
        referenciaTipo: 'ordem_producao',
        referenciaId: op.id,
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });

      // Atualiza estoque atual e preço de custo do produto acabado com o custo real
      await db.produtos.update(prodAcabado.id, {
        estoqueAtual: parseFloat(qtdPosteriorProd.toFixed(3)),
        precoCustoCentavos: calc.custoUnitarioRealCentavos,
        dataAlteracao: agora,
      });
    }

    // 4. Concluir a OP
    await db.ordensProducao.update(op.id, {
      status: 'concluida',
      quantidadeProduzida,
      dataConclusao,
      insumosConsumidosReal: insumosConsumidos,
      custosAdicionais: {
        maoDeObraCentavos: custosAdicionais.maoDeObraCentavos || 0,
        energiaCentavos: custosAdicionais.energiaCentavos || 0,
        embalagemCentavos: custosAdicionais.embalagemCentavos || 0,
        outrosCentavos: custosAdicionais.outrosCentavos || 0,
      },
      custoUnitarioRealCentavos: calc.custoUnitarioRealCentavos,
      dataAlteracao: agora,
    });

    return { opId: op.id, custoUnitarioRealCentavos: calc.custoUnitarioRealCentavos };
  });
}

/**
 * Fatura um pedido de venda de forma atômica:
 * - Dá baixa no estoque para itens de origem 'estoque'
 * - Registra custo da venda
 * - Gera contas a receber por parcela
 * - Atualiza status do pedido para 'faturado'
 */
export async function faturarPedido(pedidoId: string) {
  return await db.transaction('rw', [db.vendas, db.produtos, db.movimentosEstoque, db.contasFinanceiras, db.pessoas], async () => {
    const pedido = await db.vendas.get(pedidoId);
    if (!pedido || pedido.excluido) throw new Error('Pedido não encontrado.');
    if (pedido.status === 'faturado') throw new Error('Pedido já está faturado.');

    const agora = new Date().toISOString();
    const cliente = await db.pessoas.get(pedido.clienteId);

    // 1. Gravar custo unitário em cada item e baixar estoque de itens com origem 'estoque'
    const itensAtualizados = [];
    for (const item of pedido.itens) {
      const prod = await db.produtos.get(item.produtoId);
      const custoGravado = item.custoUnitarioGravadoCentavos ?? prod?.precoCustoCentavos ?? 0;
      itensAtualizados.push({
        ...item,
        custoUnitarioGravadoCentavos: custoGravado,
      });

      if (item.origem === 'estoque' && prod) {
        const qtdAnterior = prod.estoqueAtual;
        const qtdPosterior = qtdAnterior - item.quantidade;

        const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await db.movimentosEstoque.add({
          id: movId,
          produtoId: prod.id,
          tipo: 'saida',
          quantidade: item.quantidade,
          quantidadeAnterior: qtdAnterior,
          quantidadePosterior: qtdPosterior,
          custoUnitarioCentavos: custoGravado,
          motivo: `Venda Pedido #${pedido.numero}`,
          referenciaTipo: 'venda',
          referenciaId: pedido.id,
          excluido: false,
          dataCriacao: agora,
          dataAlteracao: agora,
        });

        await db.produtos.update(prod.id, {
          estoqueAtual: parseFloat(qtdPosterior.toFixed(3)),
          dataAlteracao: agora,
        });
      }
    }

    // 2. Gerar Contas a Receber (uma por parcela) - associada automaticamente a 'pc-vendas-produtos'
    const parcelas = splitInstallments(
      pedido.totalCentavos,
      pedido.numeroParcelas || 1,
      todayIsoDate(),
      30
    );

    for (const p of parcelas) {
      const crId = 'cr_' + Date.now() + '_' + p.parcelaNumero + '_' + Math.random().toString(36).substring(2, 6);
      await db.contasFinanceiras.add({
        id: crId,
        tipo: 'receber',
        descricao: `Pedido #${pedido.numero} - ${cliente ? cliente.nome : 'Cliente'} (${p.parcelaNumero}/${parcelas.length})`,
        pessoaId: pedido.clienteId,
        referenciaTipo: 'venda',
        referenciaId: pedido.id,
        planoContaId: 'pc-vendas-produtos',
        mesCompetencia: p.dataVencimento.substring(0, 7),
        parcelaNumero: p.parcelaNumero,
        totalParcelas: parcelas.length,
        valorCentavos: p.valorCentavos,
        dataVencimento: p.dataVencimento,
        status: 'pendente',
        formaPagamentoId: pedido.formaPagamentoId,
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });
    }

    // 3. Atualizar status e itens do pedido com o custo gravado
    await db.vendas.update(pedido.id, {
      status: 'faturado',
      faturadoEm: agora,
      itens: itensAtualizados,
      dataAlteracao: agora,
    });

    return { pedidoId: pedido.id };
  });
}

/**
 * Recebe compra de matéria-prima de forma atômica:
 * - Dá entrada no estoque
 * - Atualiza o custo médio ponderado
 * - Gera contas a pagar por parcela
 * - Atualiza status da compra para 'recebido'
 */
export async function receberCompra(compraId: string) {
  return await db.transaction('rw', [db.compras, db.produtos, db.movimentosEstoque, db.contasFinanceiras, db.pessoas], async () => {
    const compra = await db.compras.get(compraId);
    if (!compra || compra.excluido) throw new Error('Compra não encontrada.');
    if (compra.status === 'recebido') throw new Error('Compra já recebida.');

    const agora = new Date().toISOString();
    const fornecedor = await db.pessoas.get(compra.fornecedorId);

    // 1. Dar entrada no estoque e atualizar custo médio ponderado
    for (const item of compra.itens) {
      const prod = await db.produtos.get(item.materiaPrimaId);
      if (prod) {
        const qtdAnterior = prod.estoqueAtual;
        const qtdNova = item.quantidade;
        const qtdPosterior = qtdAnterior + qtdNova;

        // Custo médio ponderado se estoque anterior > 0
        let novoCustoMedio = item.precoUnitarioCentavos;
        if (qtdAnterior > 0) {
          const valorAnterior = qtdAnterior * prod.precoCustoCentavos;
          const valorNovo = qtdNova * item.precoUnitarioCentavos;
          novoCustoMedio = Math.round((valorAnterior + valorNovo) / qtdPosterior);
        }

        const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await db.movimentosEstoque.add({
          id: movId,
          produtoId: prod.id,
          tipo: 'entrada',
          quantidade: qtdNova,
          quantidadeAnterior: qtdAnterior,
          quantidadePosterior: qtdPosterior,
          custoUnitarioCentavos: item.precoUnitarioCentavos,
          motivo: `Compra #${compra.numero}`,
          referenciaTipo: 'compra',
          referenciaId: compra.id,
          excluido: false,
          dataCriacao: agora,
          dataAlteracao: agora,
        });

        await db.produtos.update(prod.id, {
          estoqueAtual: parseFloat(qtdPosterior.toFixed(3)),
          precoCustoCentavos: novoCustoMedio,
          dataAlteracao: agora,
        });
      }
    }

    // 2. Gerar Contas a Pagar
    const parcelas = splitInstallments(
      compra.totalCentavos,
      compra.numeroParcelas || 1,
      todayIsoDate(),
      30
    );

    for (const p of parcelas) {
      const cpId = 'cp_' + Date.now() + '_' + p.parcelaNumero + '_' + Math.random().toString(36).substring(2, 6);
      await db.contasFinanceiras.add({
        id: cpId,
        tipo: 'pagar',
        descricao: `Compra #${compra.numero} - ${fornecedor ? fornecedor.nome : 'Fornecedor'} (${p.parcelaNumero}/${parcelas.length})`,
        pessoaId: compra.fornecedorId,
        referenciaTipo: 'compra',
        referenciaId: compra.id,
        parcelaNumero: p.parcelaNumero,
        totalParcelas: parcelas.length,
        valorCentavos: p.valorCentavos,
        dataVencimento: p.dataVencimento,
        status: 'pendente',
        formaPagamentoId: compra.formaPagamentoId,
        excluido: false,
        dataCriacao: agora,
        dataAlteracao: agora,
      });
    }

    // 3. Atualizar status da compra
    await db.compras.update(compra.id, {
      status: 'recebido',
      recebidoEm: agora,
      dataAlteracao: agora,
    });

    return { compraId: compra.id };
  });
}

/**
 * Ajuste manual de estoque de forma atômica
 */
export async function ajustarEstoqueManual(produtoId: string, novoEstoque: number, motivo: string) {
  return await db.transaction('rw', [db.produtos, db.movimentosEstoque], async () => {
    const prod = await db.produtos.get(produtoId);
    if (!prod || prod.excluido) throw new Error('Produto não encontrado.');

    const qtdAnterior = prod.estoqueAtual;
    const diferenca = novoEstoque - qtdAnterior;
    if (diferenca === 0) return;

    const agora = new Date().toISOString();
    const movId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    await db.movimentosEstoque.add({
      id: movId,
      produtoId: prod.id,
      tipo: 'ajuste',
      quantidade: Math.abs(diferenca),
      quantidadeAnterior: qtdAnterior,
      quantidadePosterior: novoEstoque,
      custoUnitarioCentavos: prod.precoCustoCentavos,
      motivo: motivo || 'Ajuste manual de inventário',
      referenciaTipo: 'ajuste',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    });

    await db.produtos.update(prod.id, {
      estoqueAtual: novoEstoque,
      dataAlteracao: agora,
    });
  });
}

/**
 * Baixa de conta financeira (pagar ou receber)
 */
export async function baixarContaFinanceira(contaId: string, contaBancariaId: string, dataPagamento: string) {
  const agora = new Date().toISOString();
  await db.contasFinanceiras.update(contaId, {
    status: 'pago',
    contaId: contaBancariaId,
    dataPagamento: dataPagamento || todayIsoDate(),
    dataAlteracao: agora,
  });
}

/**
 * Exclusão lógica genérica
 */
export async function excluirLogico(table: Table<any, string>, id: string) {
  const agora = new Date().toISOString();
  await table.update(id, {
    excluido: true,
    dataAlteracao: agora,
  });
}
