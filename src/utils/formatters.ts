/**
 * Utilities for formatting values in Brazilian Real (R$) and PT-BR standards
 */

export function formatCurrency(centavos: number | undefined | null): string {
  if (centavos === undefined || centavos === null || isNaN(centavos)) {
    return 'R$ 0,00';
  }
  const reais = centavos / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInputToCentavos(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100);
  if (!value) return 0;
  
  // Clean string removing R$, spaces, thousand dots
  const clean = value
    .replace(/[^\d,-]/g, '')
    .replace(',', '.');
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export function formatDateBr(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    // If format is YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      const [year, month, day] = dateString.substring(0, 10).split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTimeBr(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type DueDateStatus = 'overdue' | 'due_today' | 'due_soon' | 'ok';

export function getDueDateStatus(dueDateStr: string, isPaid: boolean): DueDateStatus {
  if (isPaid) return 'ok';
  if (!dueDateStr) return 'ok';

  const todayStr = todayIsoDate();
  if (dueDateStr < todayStr) return 'overdue';
  if (dueDateStr === todayStr) return 'due_today';

  const sevenDaysAhead = addDaysIso(todayStr, 7);
  if (dueDateStr <= sevenDaysAhead) return 'due_soon';

  return 'ok';
}

export function formatNumber(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(val) ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}
