/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utilitários robustos para tratamento e digitação de valores monetários (R$).
 * Suporta separadores brasileiro (,) e internacional (.), múltiplos formatos de entrada,
 * e converte com precisão em centavos inteiros (evitando problemas de ponto flutuante).
 */

/**
 * Converte qualquer string digitada ou formatada em centavos inteiros.
 * Exemplos:
 * "1" -> 100 centavos (R$ 1,00)
 * "1,5" -> 150 centavos (R$ 1,50)
 * "1,50" -> 150 centavos (R$ 1,50)
 * "1.50" -> 150 centavos (R$ 1,50)
 * "1.250,00" -> 125000 centavos (R$ 1.250,00)
 * "0,05" -> 5 centavos (R$ 0,05)
 * "" -> 0 centavos
 */
export function parseMoneyToCentavos(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return 0;
    return Math.round(input);
  }

  const raw = String(input).trim();
  if (!raw) return 0;

  // Detect negative values
  const isNegative = raw.startsWith('-');
  const clean = raw.replace(/[^\d.,]/g, '');

  if (!clean) return 0;

  let normalized = clean;

  // Se tiver vírgula, tratamos como separador decimal brasileiro
  if (normalized.includes(',')) {
    // Remove qualquer ponto de milhar antes da vírgula
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes('.')) {
    // Se só tem ponto, verificar se é separador decimal ou milhar
    const parts = normalized.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos = pontos de milhar ex: 1.000.000
      normalized = parts.join('');
    } else if (parts.length === 2) {
      // Se tiver apenas 1 ponto e a parte decimal tem mais de 2 dígitos (ex: 1.000),
      // mas se o usuário digitou normalmente tipo "12.5" ou "12.50", é decimal.
      // Em campos de valor em geral 12.5 = R$ 12,50
      normalized = parts[0] + '.' + parts[1];
    }
  }

  // Se terminar em ponto decimal (ex: o usuário acabou de digitar a vírgula "15.")
  if (normalized.endsWith('.')) {
    normalized = normalized.slice(0, -1);
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;

  const centavos = Math.round(parsed * 100);
  return isNegative ? -Math.abs(centavos) : centavos;
}

/**
 * Formata centavos para a representação textual ideal em input de edição (ex: "12,50").
 */
export function formatCentavosToInput(centavos: number): string {
  const safe = isNaN(centavos) || !isFinite(centavos) ? 0 : centavos;
  const reais = safe / 100;
  return reais.toFixed(2).replace('.', ',');
}

/**
 * Higieniza o texto enquanto o usuário digita:
 * - Converte '.' em ','
 * - Permite no máximo uma vírgula
 * - Limita a 2 casas decimais após a vírgula
 * - Permite apenas dígitos e vírgula (e sinal de menos no início para detecção de validação)
 */
export function sanitizeMoneyInputText(text: string, allowNegative = false, preserveNegativeForValidation = true): string {
  if (!text) return '';

  let sanitized = String(text).trim();

  const isNeg = sanitized.startsWith('-');
  sanitized = sanitized.replace(/-/g, '');

  // Substitui pontos por vírgulas para padronizar
  sanitized = sanitized.replace(/\./g, ',');

  // Mantém apenas dígitos e vírgula
  sanitized = sanitized.replace(/[^\d,]/g, '');

  // Garante no máximo 1 vírgula
  const commaIndex = sanitized.indexOf(',');
  if (commaIndex !== -1) {
    const before = sanitized.slice(0, commaIndex);
    let after = sanitized.slice(commaIndex + 1).replace(/,/g, '');
    // No máximo 2 casas decimais
    after = after.slice(0, 2);
    sanitized = `${before},${after}`;
  }

  const shouldKeepNegative = isNeg && (allowNegative || preserveNegativeForValidation);
  return shouldKeepNegative ? `-${sanitized}` : sanitized;
}
