/**
 * Utilitários de validação financeira e verificação cross-field de saldo
 */

export interface ValidacaoDespesaResultado {
  saldoInsuficiente: boolean;
  deficitCentavos: number;
  mensagemAlerta?: string;
}

/**
 * Validação cross-field: verifica se uma despesa excede o saldo disponível
 */
export function verificarSaldoSuficienteParaDespesa(
  valorCentavos: number,
  saldoDisponivelCentavos: number
): ValidacaoDespesaResultado {
  if (valorCentavos <= 0) {
    return {
      saldoInsuficiente: false,
      deficitCentavos: 0,
    };
  }

  const saldoInsuficiente = valorCentavos > saldoDisponivelCentavos;
  const deficitCentavos = saldoInsuficiente ? valorCentavos - saldoDisponivelCentavos : 0;

  return {
    saldoInsuficiente,
    deficitCentavos,
    mensagemAlerta: saldoInsuficiente
      ? `Saldo Insuficiente: o valor excede o saldo disponível em ${(deficitCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
      : undefined,
  };
}

/**
 * Valida os campos obrigatórios de uma conta financeira antes de salvar
 */
export function validarCamposContaFinanceira(dados: {
  descricao?: string;
  valorCentavos?: number;
  planoContaId?: string;
  dataVencimento?: string;
}): { valido: boolean; erros: Record<string, string> } {
  const erros: Record<string, string> = {};

  if (!dados.descricao || !dados.descricao.trim()) {
    erros.descricao = 'Informe a descrição do lançamento.';
  }

  if (dados.valorCentavos === undefined || dados.valorCentavos <= 0) {
    erros.valorCentavos = 'Informe um valor maior que zero.';
  }

  if (!dados.planoContaId) {
    erros.planoContaId = 'Selecione uma conta do Plano de Contas.';
  }

  if (!dados.dataVencimento) {
    erros.dataVencimento = 'Informe a data de vencimento.';
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
  };
}
