export type TipoPessoa = 'fisica' | 'juridica';

export interface Pessoa {
  id: string;
  nome: string;
  tipo: TipoPessoa;
  cpfCnpj?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  observacoes?: string;
  isCliente: boolean;
  isFornecedor: boolean;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export type GrupoDRE =
  | 'receita_venda'
  | 'deducao'
  | 'cmv'
  | 'custo_producao'
  | 'despesa_venda'
  | 'despesa_administrativa'
  | 'despesa_financeira'
  | 'receita_financeira'
  | 'outras'
  | 'imposto_lucro'
  | 'nenhum';

export interface PlanoConta {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  grupoDRE: GrupoDRE;
  contaPaiId?: string;
  padrao?: boolean;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export type TipoProduto = 'materia_prima' | 'produto_acabado' | 'embalagem' | 'revenda' | 'servico';

export interface Produto {
  id: string;
  tipo: TipoProduto;
  codigo: string;
  nome: string;
  categoriaId: string;
  unidade: string; // UN, KG, M, L, CX, etc.
  precoCustoCentavos: number;
  precoVendaCentavos: number;
  estoqueMinimo: number;
  estoqueAtual: number;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface Categoria {
  id: string;
  nome: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface InsumoFicha {
  materiaPrimaId: string;
  quantidade: number; // Por rendimento da receita
}

export interface FichaTecnica {
  id: string;
  produtoAcabadoId: string;
  nome: string;
  rendimento: number; // Ex: 10 unidades
  perdaPercentual: number; // Ex: 5%
  custoMaoDeObraPadraoCentavos: number;
  custoEnergiaOutrosPadraoCentavos: number;
  insumos: InsumoFicha[];
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export type TipoOrdemProducao = 'estoque' | 'encomenda';
export type StatusOrdemProducao = 'planejada' | 'em_producao' | 'concluida' | 'cancelada';

export interface OrdemProducao {
  id: string;
  numero: number;
  tipo: TipoOrdemProducao;
  pedidoId?: string;
  produtoAcabadoId: string;
  fichaTecnicaId: string;
  quantidadePlanejada: number;
  quantidadeProduzida?: number;
  dataPrevista: string;
  dataConclusao?: string;
  status: StatusOrdemProducao;
  insumosPrevistos: Array<{
    materiaPrimaId: string;
    quantidadePrevista: number;
  }>;
  insumosConsumidosReal?: Array<{
    materiaPrimaId: string;
    quantidadeReal: number;
    custoTotalCentavos: number;
  }>;
  custosAdicionais?: {
    maoDeObraCentavos: number;
    energiaCentavos: number;
    embalagemCentavos: number;
    outrosCentavos: number;
  };
  custoUnitarioRealCentavos?: number;
  observacoes?: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export type OrigemItemVenda = 'estoque' | 'producao';

export interface ItemVenda {
  id: string;
  produtoId: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  custoUnitarioGravadoCentavos?: number;
  origem: OrigemItemVenda;
  ordemProducaoId?: string;
}

export type TipoDocumentoVenda = 'orcamento' | 'pedido';
export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
export type StatusPedido = 'aberto' | 'em_producao' | 'faturado' | 'entregue' | 'cancelado';

export interface Venda {
  id: string;
  numero: number;
  tipo: TipoDocumentoVenda;
  clienteId: string;
  itens: ItemVenda[];
  descontoCentavos: number;
  freteCentavos: number;
  totalCentavos: number;
  validade?: string; // Para orçamentos
  formaPagamentoId: string;
  numeroParcelas: number;
  dataEntregaPrevista?: string;
  status: string; // StatusOrcamento ou StatusPedido
  faturadoEm?: string;
  observacoes?: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface ItemCompra {
  materiaPrimaId: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  totalCentavos: number;
}

export interface Compra {
  id: string;
  numero: number;
  fornecedorId: string;
  itens: ItemCompra[];
  totalCentavos: number;
  formaPagamentoId: string;
  numeroParcelas: number;
  status: 'pendente' | 'recebido' | 'cancelado';
  recebidoEm?: string;
  observacoes?: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export type TipoMovimentoEstoque = 'entrada' | 'saida' | 'ajuste';

export interface MovimentoEstoque {
  id: string;
  produtoId: string;
  tipo: TipoMovimentoEstoque;
  quantidade: number;
  quantidadeAnterior: number;
  quantidadePosterior: number;
  custoUnitarioCentavos: number;
  motivo: string;
  referenciaTipo?: 'compra' | 'ordem_producao' | 'venda' | 'ajuste';
  referenciaId?: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export type TipoContaFinanceira = 'receber' | 'pagar';
export type StatusContaFinanceira = 'pendente' | 'pago' | 'cancelado';

export interface ContaFinanceiraItem {
  id: string;
  tipo: TipoContaFinanceira;
  descricao: string;
  pessoaId?: string;
  referenciaTipo?: 'venda' | 'compra' | 'avulso';
  referenciaId?: string;
  planoContaId?: string;
  mesCompetencia?: string; // YYYY-MM
  parcelaNumero: number;
  totalParcelas: number;
  valorCentavos: number;
  dataVencimento: string; // YYYY-MM-DD
  dataPagamento?: string; // YYYY-MM-DD
  status: StatusContaFinanceira;
  contaId?: string;
  formaPagamentoId?: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface ContaBancaria {
  id: string;
  nome: string;
  saldoInicialCentavos: number;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface FormaPagamento {
  id: string;
  nome: string;
  excluido: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface DadosEmpresa {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  email: string;
  logoUrl?: string;
  lembreteBackupSemanal: boolean;
  ultimoBackup?: string;
}
