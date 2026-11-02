import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  verificarSaldoSuficienteParaDespesa,
  validarCamposContaFinanceira,
} from './financeiroValidation.ts';

describe('Cross-field balance validation (Validação de Saldo Insuficiente)', () => {
  it('detects when expense is strictly higher than available balance', () => {
    // Expense: R$ 12.000,00 (1.200.000 centavos) vs Balance: R$ 9.700,00 (970.000 centavos)
    const res = verificarSaldoSuficienteParaDespesa(1200000, 970000);
    assert.strictEqual(res.saldoInsuficiente, true);
    assert.strictEqual(res.deficitCentavos, 230000);
    assert.match(res.mensagemAlerta || '', /Saldo Insuficiente/);
  });

  it('allows expense when balance is greater than or equal to expense amount', () => {
    // Expense: R$ 500,00 vs Balance: R$ 9.700,00
    const resMenor = verificarSaldoSuficienteParaDespesa(50000, 970000);
    assert.strictEqual(resMenor.saldoInsuficiente, false);
    assert.strictEqual(resMenor.deficitCentavos, 0);

    // Exact equal balance
    const resIgual = verificarSaldoSuficienteParaDespesa(970000, 970000);
    assert.strictEqual(resIgual.saldoInsuficiente, false);
    assert.strictEqual(resIgual.deficitCentavos, 0);
  });

  it('handles negative or zero expense safely without false alarms', () => {
    const res = verificarSaldoSuficienteParaDespesa(0, 100000);
    assert.strictEqual(res.saldoInsuficiente, false);
  });
});

describe('Financial form field validations (Validação de formulário)', () => {
  it('validates incomplete fields accurately', () => {
    const resInvalido = validarCamposContaFinanceira({
      descricao: '',
      valorCentavos: 0,
      planoContaId: '',
    });
    assert.strictEqual(resInvalido.valido, false);
    assert.strictEqual(Boolean(resInvalido.erros.descricao), true);
    assert.strictEqual(Boolean(resInvalido.erros.valorCentavos), true);
    assert.strictEqual(Boolean(resInvalido.erros.planoContaId), true);
  });

  it('validates complete valid payload', () => {
    const resValido = validarCamposContaFinanceira({
      descricao: 'Pagamento de Fornecedor de Frutas',
      valorCentavos: 150000,
      planoContaId: 'pc_cmv_mp',
      dataVencimento: '2026-11-15',
    });
    assert.strictEqual(resValido.valido, true);
    assert.strictEqual(Object.keys(resValido.erros).length, 0);
  });
});
