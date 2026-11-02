import { db } from './index';
import { todayIsoDate, addDaysIso } from '../utils/formatters';

export async function ensureDefaultPlanoContas() {
  const count = await db.planoContas.count();
  if (count > 0) return;

  const agora = new Date().toISOString();
  await db.planoContas.bulkAdd([
    // Receita de Venda
    { id: 'pc-vendas-produtos', codigo: '1.01', nome: 'Vendas de produtos', tipo: 'receita', grupoDRE: 'receita_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Deduções
    { id: 'pc-impostos-vendas', codigo: '1.02', nome: 'Impostos sobre vendas', tipo: 'despesa', grupoDRE: 'deducao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-descontos-concedidos', codigo: '1.03', nome: 'Descontos concedidos', tipo: 'despesa', grupoDRE: 'deducao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-devolucoes', codigo: '1.04', nome: 'Devoluções', tipo: 'despesa', grupoDRE: 'deducao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Despesas com Vendas
    { id: 'pc-comissoes', codigo: '2.01', nome: 'Comissões', tipo: 'despesa', grupoDRE: 'despesa_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-fretes-vendas', codigo: '2.02', nome: 'Fretes sobre vendas', tipo: 'despesa', grupoDRE: 'despesa_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-marketing', codigo: '2.03', nome: 'Marketing', tipo: 'despesa', grupoDRE: 'despesa_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Despesas Administrativas
    { id: 'pc-aluguel', codigo: '3.01', nome: 'Aluguel', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-salarios-adm', codigo: '3.02', nome: 'Salários administrativos', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-contador', codigo: '3.03', nome: 'Contador', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-internet-tel', codigo: '3.04', nome: 'Internet e telefone', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-material-escritorio', codigo: '3.05', nome: 'Material de escritório', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Custo de Produção (Entra no CMV via OP)
    { id: 'pc-energia-fabrica', codigo: '4.01', nome: 'Energia da fábrica', tipo: 'despesa', grupoDRE: 'custo_producao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-mao-obra-fabrica', codigo: '4.02', nome: 'Mão de obra da fábrica', tipo: 'despesa', grupoDRE: 'custo_producao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-embalagens-fabrica', codigo: '4.03', nome: 'Embalagens', tipo: 'despesa', grupoDRE: 'custo_producao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Despesas Financeiras
    { id: 'pc-juros-pagos', codigo: '5.01', nome: 'Juros pagos', tipo: 'despesa', grupoDRE: 'despesa_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-tarifas-bancarias', codigo: '5.02', nome: 'Tarifas bancárias', tipo: 'despesa', grupoDRE: 'despesa_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-taxas-cartao', codigo: '5.03', nome: 'Taxas de cartão', tipo: 'despesa', grupoDRE: 'despesa_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Receitas Financeiras
    { id: 'pc-rendimentos', codigo: '6.01', nome: 'Rendimentos', tipo: 'receita', grupoDRE: 'receita_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Imposto sobre Lucro
    { id: 'pc-irpj-csll', codigo: '7.01', nome: 'IRPJ e CSLL', tipo: 'despesa', grupoDRE: 'imposto_lucro', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Nenhum (Fora do DRE)
    { id: 'pc-retiradas-dono', codigo: '8.01', nome: 'Retiradas do dono', tipo: 'despesa', grupoDRE: 'nenhum', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-emprestimos', codigo: '8.02', nome: 'Empréstimos', tipo: 'despesa', grupoDRE: 'nenhum', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-transferencias', codigo: '8.03', nome: 'Transferências entre contas', tipo: 'despesa', grupoDRE: 'nenhum', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
  ]);
}

export async function seedSampleData(forceClear: boolean = false) {
  if (forceClear) {
    await db.transaction('rw', [
      db.pessoas,
      db.produtos,
      db.categorias,
      db.fichasTecnicas,
      db.ordensProducao,
      db.vendas,
      db.compras,
      db.movimentosEstoque,
      db.contasFinanceiras,
      db.contasBancarias,
      db.formasPagamento,
      db.empresaConfig,
      db.planoContas,
    ], async () => {
      await db.pessoas.clear();
      await db.produtos.clear();
      await db.categorias.clear();
      await db.fichasTecnicas.clear();
      await db.ordensProducao.clear();
      await db.vendas.clear();
      await db.compras.clear();
      await db.movimentosEstoque.clear();
      await db.contasFinanceiras.clear();
      await db.contasBancarias.clear();
      await db.formasPagamento.clear();
      await db.empresaConfig.clear();
      await db.planoContas.clear();
    });
  }

  const count = await db.produtos.count();
  if (count > 0 && !forceClear) {
    await ensureDefaultPlanoContas();
    return; // Already seeded
  }

  const agora = new Date().toISOString();
  const hoje = todayIsoDate();
  const ontom = addDaysIso(hoje, -1);
  const amanha = addDaysIso(hoje, 1);
  const em5Dias = addDaysIso(hoje, 5);
  const vencida3Dias = addDaysIso(hoje, -3);

  // 1. Formas de Pagamento & Contas
  await db.formasPagamento.bulkAdd([
    { id: 'fp-pix', nome: 'Pix', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'fp-dinheiro', nome: 'Dinheiro', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'fp-cartao', nome: 'Cartão de Crédito/Débito', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'fp-boleto', nome: 'Boleto Bancário', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'fp-prazo', nome: 'A Prazo (Crediário)', excluido: false, dataCriacao: agora, dataAlteracao: agora },
  ]);

  await db.contasBancarias.bulkAdd([
    { id: 'cb-caixa', nome: 'Caixa Físico', saldoInicialCentavos: 150000, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'cb-inter', nome: 'Conta Digital Inter PJ', saldoInicialCentavos: 820000, excluido: false, dataCriacao: agora, dataAlteracao: agora },
  ]);

  // 1.1 Plano de Contas Padrão
  await db.planoContas.bulkAdd([
    // Receita de Venda
    { id: 'pc-vendas-produtos', codigo: '1.01', nome: 'Vendas de produtos', tipo: 'receita', grupoDRE: 'receita_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Deduções
    { id: 'pc-impostos-vendas', codigo: '1.02', nome: 'Impostos sobre vendas', tipo: 'despesa', grupoDRE: 'deducao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-descontos-concedidos', codigo: '1.03', nome: 'Descontos concedidos', tipo: 'despesa', grupoDRE: 'deducao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-devolucoes', codigo: '1.04', nome: 'Devoluções', tipo: 'despesa', grupoDRE: 'deducao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Despesas com Vendas
    { id: 'pc-comissoes', codigo: '2.01', nome: 'Comissões', tipo: 'despesa', grupoDRE: 'despesa_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-fretes-vendas', codigo: '2.02', nome: 'Fretes sobre vendas', tipo: 'despesa', grupoDRE: 'despesa_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-marketing', codigo: '2.03', nome: 'Marketing', tipo: 'despesa', grupoDRE: 'despesa_venda', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Despesas Administrativas
    { id: 'pc-aluguel', codigo: '3.01', nome: 'Aluguel', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-salarios-adm', codigo: '3.02', nome: 'Salários administrativos', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-contador', codigo: '3.03', nome: 'Contador', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-internet-tel', codigo: '3.04', nome: 'Internet e telefone', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-material-escritorio', codigo: '3.05', nome: 'Material de escritório', tipo: 'despesa', grupoDRE: 'despesa_administrativa', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Custo de Produção (Entra no CMV via OP)
    { id: 'pc-energia-fabrica', codigo: '4.01', nome: 'Energia da fábrica', tipo: 'despesa', grupoDRE: 'custo_producao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-mao-obra-fabrica', codigo: '4.02', nome: 'Mão de obra da fábrica', tipo: 'despesa', grupoDRE: 'custo_producao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-embalagens-fabrica', codigo: '4.03', nome: 'Embalagens', tipo: 'despesa', grupoDRE: 'custo_producao', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Despesas Financeiras
    { id: 'pc-juros-pagos', codigo: '5.01', nome: 'Juros pagos', tipo: 'despesa', grupoDRE: 'despesa_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-tarifas-bancarias', codigo: '5.02', nome: 'Tarifas bancárias', tipo: 'despesa', grupoDRE: 'despesa_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-taxas-cartao', codigo: '5.03', nome: 'Taxas de cartão', tipo: 'despesa', grupoDRE: 'despesa_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Receitas Financeiras
    { id: 'pc-rendimentos', codigo: '6.01', nome: 'Rendimentos', tipo: 'receita', grupoDRE: 'receita_financeira', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Imposto sobre Lucro
    { id: 'pc-irpj-csll', codigo: '7.01', nome: 'IRPJ e CSLL', tipo: 'despesa', grupoDRE: 'imposto_lucro', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    // Nenhum (Fora do DRE)
    { id: 'pc-retiradas-dono', codigo: '8.01', nome: 'Retiradas do dono', tipo: 'despesa', grupoDRE: 'nenhum', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-emprestimos', codigo: '8.02', nome: 'Empréstimos', tipo: 'despesa', grupoDRE: 'nenhum', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'pc-transferencias', codigo: '8.03', nome: 'Transferências entre contas', tipo: 'despesa', grupoDRE: 'nenhum', padrao: true, excluido: false, dataCriacao: agora, dataAlteracao: agora },
  ]);

  // 2. Categorias
  await db.categorias.bulkAdd([
    { id: 'cat-ingredientes', nome: 'Ingredientes Secos', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'cat-laticinios', nome: 'Laticínios & Recheios', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'cat-embalagens', nome: 'Embalagens & Caixas', excluido: false, dataCriacao: agora, dataAlteracao: agora },
    { id: 'cat-biscoitos', nome: 'Biscoitos & Doces Acabados', excluido: false, dataCriacao: agora, dataAlteracao: agora },
  ]);

  // 3. Pessoas (3 Clientes + 2 Fornecedores)
  await db.pessoas.bulkAdd([
    {
      id: 'cli-1',
      nome: 'Mercado Central & Mercearia Ltda',
      tipo: 'juridica',
      cpfCnpj: '12.345.678/0001-90',
      telefone: '(11) 3222-1100',
      whatsapp: '11987654321',
      endereco: 'Rua do Comércio, 120 - Centro',
      observacoes: 'Cliente semanal com bom volume de pedidos.',
      isCliente: true,
      isFornecedor: false,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'cli-2',
      nome: 'Padaria & Confeitaria Pão Dourado',
      tipo: 'juridica',
      cpfCnpj: '98.765.432/0001-10',
      telefone: '(11) 3456-7890',
      whatsapp: '11976543210',
      endereco: 'Av. Paulista, 850 - Bela Vista',
      observacoes: 'Paga sempre pontual via Boleto ou Pix.',
      isCliente: true,
      isFornecedor: false,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'cli-3',
      nome: 'Carlos Silva (Restaurante Bom Gosto)',
      tipo: 'fisica',
      cpfCnpj: '123.456.789-00',
      telefone: '(11) 99123-4567',
      whatsapp: '11991234567',
      endereco: 'Rua das Flores, 45 - Jardins',
      observacoes: 'Compra biscoitos finos para café cortesia.',
      isCliente: true,
      isFornecedor: false,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'forn-1',
      nome: 'Distribuidora Moinho Paulista de Trigo',
      tipo: 'juridica',
      cpfCnpj: '44.332.211/0001-55',
      telefone: '(11) 2345-6789',
      whatsapp: '11988887777',
      endereco: 'Estrada Velha, 400 - Barueri',
      observacoes: 'Fornecedor principal de farinhas e amidos.',
      isCliente: false,
      isFornecedor: true,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'forn-2',
      nome: 'Embalagens & Sacarias Gráficas Brasil',
      tipo: 'juridica',
      cpfCnpj: '55.667.788/0001-22',
      telefone: '(11) 4567-8901',
      whatsapp: '11977776666',
      endereco: 'Rodovia dos Bandeirantes, km 32',
      observacoes: 'Fornecedor de sacos kraft com selo e caixas.',
      isCliente: false,
      isFornecedor: true,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
  ]);

  // 4. Produtos (5 Matérias-Primas + 2 Produtos Acabados)
  await db.produtos.bulkAdd([
    {
      id: 'prod-mp-1',
      tipo: 'materia_prima',
      codigo: 'MP-01',
      nome: 'Farinha de Trigo Especial Tipo 1',
      categoriaId: 'cat-ingredientes',
      unidade: 'KG',
      precoCustoCentavos: 450, // R$ 4,50
      precoVendaCentavos: 0,
      estoqueMinimo: 80,
      estoqueAtual: 280,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'prod-mp-2',
      tipo: 'materia_prima',
      codigo: 'MP-02',
      nome: 'Açúcar Cristal Industrial',
      categoriaId: 'cat-ingredientes',
      unidade: 'KG',
      precoCustoCentavos: 380, // R$ 3,80
      precoVendaCentavos: 0,
      estoqueMinimo: 50,
      estoqueAtual: 140,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'prod-mp-3',
      tipo: 'materia_prima',
      codigo: 'MP-03',
      nome: 'Manteiga Extra Especial Sem Sal',
      categoriaId: 'cat-laticinios',
      unidade: 'KG',
      precoCustoCentavos: 2800, // R$ 28,00
      precoVendaCentavos: 0,
      estoqueMinimo: 20,
      estoqueAtual: 35,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'prod-mp-4',
      tipo: 'materia_prima',
      codigo: 'MP-04',
      nome: 'Extrato Puro de Baunilha',
      categoriaId: 'cat-ingredientes',
      unidade: 'L',
      precoCustoCentavos: 4200, // R$ 42,00
      precoVendaCentavos: 0,
      estoqueMinimo: 5,
      estoqueAtual: 7.5,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'prod-mp-5',
      tipo: 'embalagem',
      codigo: 'EMB-01',
      nome: 'Embalagem Kraft com Janela 500g',
      categoriaId: 'cat-embalagens',
      unidade: 'UN',
      precoCustoCentavos: 85, // R$ 0,85
      precoVendaCentavos: 0,
      estoqueMinimo: 150,
      estoqueAtual: 420,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    // 2 Finished Products
    {
      id: 'prod-pa-1',
      tipo: 'produto_acabado',
      codigo: 'BA-500',
      nome: 'Biscoito Amanteigado Artesanal 500g',
      categoriaId: 'cat-biscoitos',
      unidade: 'UN',
      precoCustoCentavos: 780, // R$ 7,80 calculado
      precoVendaCentavos: 2200, // R$ 22,00 venda
      estoqueMinimo: 30,
      estoqueAtual: 65,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'prod-pa-2',
      tipo: 'produto_acabado',
      codigo: 'GO-400',
      nome: 'Goiabinha Crocante Caseira 400g',
      categoriaId: 'cat-biscoitos',
      unidade: 'UN',
      precoCustoCentavos: 690, // R$ 6,90 calculado
      precoVendaCentavos: 1950, // R$ 19,50 venda
      estoqueMinimo: 25,
      estoqueAtual: 8, // BELOW MINIMUM TO TEST ALERT!
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
  ]);

  // 5. Fichas Técnicas (Receitas)
  await db.fichasTecnicas.bulkAdd([
    {
      id: 'ft-1',
      produtoAcabadoId: 'prod-pa-1',
      nome: 'Receita Padrão Amanteigado 20 Pacotes',
      rendimento: 20, // 20 pacotes
      perdaPercentual: 4, // 4% perda
      custoMaoDeObraPadraoCentavos: 2000, // R$ 20,00 lote
      custoEnergiaOutrosPadraoCentavos: 800, // R$ 8,00 forno e gás
      insumos: [
        { materiaPrimaId: 'prod-mp-1', quantidade: 5 }, // 5kg farinha
        { materiaPrimaId: 'prod-mp-2', quantidade: 2 }, // 2kg açúcar
        { materiaPrimaId: 'prod-mp-3', quantidade: 2 }, // 2kg manteiga
        { materiaPrimaId: 'prod-mp-4', quantidade: 0.1 }, // 100ml baunilha
        { materiaPrimaId: 'prod-mp-5', quantidade: 20 }, // 20 embalagens
      ],
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'ft-2',
      produtoAcabadoId: 'prod-pa-2',
      nome: 'Receita Goiabinha Especial 15 Pacotes',
      rendimento: 15,
      perdaPercentual: 5,
      custoMaoDeObraPadraoCentavos: 1800,
      custoEnergiaOutrosPadraoCentavos: 700,
      insumos: [
        { materiaPrimaId: 'prod-mp-1', quantidade: 3.5 },
        { materiaPrimaId: 'prod-mp-2', quantidade: 1.5 },
        { materiaPrimaId: 'prod-mp-3', quantidade: 1.2 },
        { materiaPrimaId: 'prod-mp-5', quantidade: 15 },
      ],
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
  ]);

  // 6. Ordens de Produção (1 concluída, 1 em produção)
  await db.ordensProducao.bulkAdd([
    {
      id: 'op-1',
      numero: 101,
      tipo: 'estoque',
      produtoAcabadoId: 'prod-pa-1',
      fichaTecnicaId: 'ft-1',
      quantidadePlanejada: 40,
      quantidadeProduzida: 40,
      dataPrevista: ontom,
      dataConclusao: ontom,
      status: 'concluida',
      insumosPrevistos: [
        { materiaPrimaId: 'prod-mp-1', quantidadePrevista: 10 },
        { materiaPrimaId: 'prod-mp-2', quantidadePrevista: 4 },
        { materiaPrimaId: 'prod-mp-3', quantidadePrevista: 4 },
        { materiaPrimaId: 'prod-mp-4', quantidadePrevista: 0.2 },
        { materiaPrimaId: 'prod-mp-5', quantidadePrevista: 40 },
      ],
      insumosConsumidosReal: [
        { materiaPrimaId: 'prod-mp-1', quantidadeReal: 10.2, custoTotalCentavos: 4590 },
        { materiaPrimaId: 'prod-mp-2', quantidadeReal: 4.0, custoTotalCentavos: 1520 },
        { materiaPrimaId: 'prod-mp-3', quantidadeReal: 4.1, custoTotalCentavos: 11480 },
        { materiaPrimaId: 'prod-mp-4', quantidadeReal: 0.2, custoTotalCentavos: 840 },
        { materiaPrimaId: 'prod-mp-5', quantidadeReal: 40, custoTotalCentavos: 3400 },
      ],
      custosAdicionais: {
        maoDeObraCentavos: 4000,
        energiaCentavos: 1600,
        embalagemCentavos: 0,
        outrosCentavos: 0,
      },
      custoUnitarioRealCentavos: 686,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'op-2',
      numero: 102,
      tipo: 'encomenda',
      produtoAcabadoId: 'prod-pa-2',
      fichaTecnicaId: 'ft-2',
      quantidadePlanejada: 30,
      dataPrevista: amanha,
      status: 'em_producao',
      insumosPrevistos: [
        { materiaPrimaId: 'prod-mp-1', quantidadePrevista: 7 },
        { materiaPrimaId: 'prod-mp-2', quantidadePrevista: 3 },
        { materiaPrimaId: 'prod-mp-3', quantidadePrevista: 2.4 },
        { materiaPrimaId: 'prod-mp-5', quantidadePrevista: 30 },
      ],
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
  ]);

  // 7. Vendas (incluindo Venda do Teste de Conferência Oficial)
  await db.vendas.bulkAdd([
    {
      id: 'ven-1',
      numero: 201,
      tipo: 'pedido',
      clienteId: 'cli-1',
      itens: [
        {
          id: 'item-1',
          produtoId: 'prod-pa-1',
          quantidade: 30,
          precoUnitarioCentavos: 2200,
          origem: 'estoque',
        },
      ],
      descontoCentavos: 2000,
      freteCentavos: 0,
      totalCentavos: 64000, // R$ 640,00
      formaPagamentoId: 'fp-pix',
      numeroParcelas: 2,
      dataEntregaPrevista: hoje,
      status: 'faturado',
      faturadoEm: agora,
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'ven-conf-dre',
      numero: 200,
      tipo: 'pedido',
      clienteId: 'cli-1',
      itens: [
        {
          id: 'it-conf',
          produtoId: 'prod-pa-1',
          quantidade: 10,
          precoUnitarioCentavos: 2000, // R$ 20,00
          custoUnitarioGravadoCentavos: 1200, // R$ 12,00
          origem: 'estoque',
        },
      ],
      descontoCentavos: 0,
      freteCentavos: 0,
      totalCentavos: 20000, // R$ 200,00
      formaPagamentoId: 'fp-pix',
      numeroParcelas: 1,
      dataEntregaPrevista: hoje,
      status: 'faturado',
      faturadoEm: agora,
      excluido: false,
      dataCriacao: hoje + 'T09:00:00Z',
      dataAlteracao: agora,
    },
    {
      id: 'ven-2',
      numero: 202,
      tipo: 'orcamento',
      clienteId: 'cli-2',
      itens: [
        {
          id: 'item-2',
          produtoId: 'prod-pa-2',
          quantidade: 50,
          precoUnitarioCentavos: 1950,
          origem: 'producao',
        },
      ],
      descontoCentavos: 2500,
      freteCentavos: 3000,
      totalCentavos: 98000,
      validade: em5Dias,
      formaPagamentoId: 'fp-boleto',
      numeroParcelas: 1,
      status: 'aprovado',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
  ]);

  // 8. Contas Financeiras (Pagar e Receber com vários status para validar cores e alertas)
  await db.contasFinanceiras.bulkAdd([
    // A Receber
    {
      id: 'cr-1',
      tipo: 'receber',
      descricao: 'Pedido #201 - Mercado Central (1/2)',
      pessoaId: 'cli-1',
      referenciaTipo: 'venda',
      referenciaId: 'ven-1',
      parcelaNumero: 1,
      totalParcelas: 2,
      valorCentavos: 32000,
      dataVencimento: hoje, // VENCE HOJE!
      status: 'pendente',
      formaPagamentoId: 'fp-pix',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'cr-2',
      tipo: 'receber',
      descricao: 'Pedido #201 - Mercado Central (2/2)',
      pessoaId: 'cli-1',
      referenciaTipo: 'venda',
      referenciaId: 'ven-1',
      parcelaNumero: 2,
      totalParcelas: 2,
      valorCentavos: 32000,
      dataVencimento: em5Dias, // VENCE EM 5 DIAS (AMARELO)
      status: 'pendente',
      formaPagamentoId: 'fp-pix',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    // A Pagar (1 vencida para validar vermelho, 1 hoje)
    {
      id: 'cp-1',
      tipo: 'pagar',
      descricao: 'Moinho Paulista - Lote de Trigo',
      pessoaId: 'forn-1',
      referenciaTipo: 'compra',
      parcelaNumero: 1,
      totalParcelas: 1,
      valorCentavos: 45000,
      dataVencimento: vencida3Dias, // VENCIDA (VERMELHO)
      status: 'pendente',
      formaPagamentoId: 'fp-boleto',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'cp-aluguel',
      tipo: 'pagar',
      descricao: 'Aluguel do Galpão Industrial',
      referenciaTipo: 'avulso',
      planoContaId: 'pc-aluguel',
      mesCompetencia: hoje.substring(0, 7),
      parcelaNumero: 1,
      totalParcelas: 1,
      valorCentavos: 30000, // R$ 300,00 (Teste de Conferência)
      dataVencimento: hoje,
      status: 'pendente',
      formaPagamentoId: 'fp-boleto',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
    {
      id: 'cp-2',
      tipo: 'pagar',
      descricao: 'Energia Elétrica Enel Industrial',
      referenciaTipo: 'avulso',
      planoContaId: 'pc-energia-fabrica',
      mesCompetencia: hoje.substring(0, 7),
      parcelaNumero: 1,
      totalParcelas: 1,
      valorCentavos: 28000,
      dataVencimento: hoje, // HOJE
      status: 'pendente',
      formaPagamentoId: 'fp-boleto',
      excluido: false,
      dataCriacao: agora,
      dataAlteracao: agora,
    },
  ]);

  // 9. Configurações da Empresa
  await db.empresaConfig.put({
    id: 'empresa_padrao',
    nome: 'Fábrica Artesanal Bom Sabor',
    cpfCnpj: '33.444.555/0001-66',
    telefone: '(11) 3344-5566',
    whatsapp: '11988889999',
    endereco: 'Rua das Indústrias, 500 - São Paulo, SP',
    email: 'contato@bomsaborartesanal.com.br',
    lembreteBackupSemanal: true,
    ultimoBackup: hoje,
  });

  console.log('FabrilERP: Dados de demonstração inicializados com sucesso.');
}
