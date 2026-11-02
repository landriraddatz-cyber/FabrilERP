/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import {
  parseMoneyToCentavos,
  formatCentavosToInput,
  sanitizeMoneyInputText,
} from '../../utils/money';

export interface MoneyInputProps {
  valueCentavos: number;
  onChange: (centavos: number) => void;
  minCentavos?: number;
  maxCentavos?: number;
  placeholder?: string;
  showPrefix?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  allowNegative?: boolean;
  selectAllOnFocus?: boolean;
  error?: string | null;
  warning?: string | null;
  helperText?: string;
  validate?: (centavos: number) => string | null | undefined;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  valueCentavos,
  onChange,
  minCentavos = 0,
  maxCentavos,
  placeholder = '0,00',
  showPrefix = true,
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  autoFocus = false,
  id,
  name,
  label,
  size = 'md',
  allowNegative = false,
  selectAllOnFocus = true,
  error,
  warning,
  helperText,
  validate,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [rawText, setRawText] = useState(() =>
    valueCentavos === 0 ? '' : formatCentavosToInput(valueCentavos)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza quando o valor externo muda e o campo NÃO está com foco ativo
  useEffect(() => {
    if (!isFocused) {
      setRawText(valueCentavos === 0 ? '' : formatCentavosToInput(valueCentavos));
    }
  }, [valueCentavos, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setIsTouched(true);
    // Se o valor estiver vazio ou 0, ao focar podemos mostrar o valor formatado para seleção
    if (valueCentavos !== 0 && !rawText) {
      setRawText(formatCentavosToInput(valueCentavos));
    } else if (valueCentavos === 0 && !rawText) {
      setRawText('0,00');
    }

    if (selectAllOnFocus) {
      e.currentTarget.select();
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      });
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (selectAllOnFocus) {
      e.currentTarget.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTouched(true);
    const text = e.target.value;
    const sanitized = sanitizeMoneyInputText(text, allowNegative, true);
    setRawText(sanitized);

    if (!sanitized || sanitized === '-') {
      onChange(0);
      return;
    }

    let parsed = parseMoneyToCentavos(sanitized);
    // Se negativos não forem permitidos, protege o estado de salvar valores negativos
    if (!allowNegative && parsed < 0) {
      onChange(0);
      return;
    }

    if (maxCentavos !== undefined && parsed > maxCentavos) {
      parsed = maxCentavos;
    }
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsTouched(true);

    if (!rawText.trim() || rawText === '-') {
      onChange(0);
      setRawText('');
      return;
    }

    let parsed = parseMoneyToCentavos(rawText);
    if (!allowNegative && parsed < 0) {
      parsed = 0;
    }
    if (minCentavos !== undefined && parsed < minCentavos && parsed !== 0) {
      parsed = minCentavos;
    }
    if (maxCentavos !== undefined && parsed > maxCentavos) {
      parsed = maxCentavos;
    }

    onChange(parsed);
    setRawText(parsed === 0 ? '' : formatCentavosToInput(parsed));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsTouched(true);
      const current = parseMoneyToCentavos(rawText);
      const next = current + 100; // Incrementa R$ 1,00
      if (maxCentavos === undefined || next <= maxCentavos) {
        onChange(next);
        setRawText(formatCentavosToInput(next));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsTouched(true);
      const current = parseMoneyToCentavos(rawText);
      const next = current - 100; // Decrementa R$ 1,00
      if ((!allowNegative && next < 0) || (minCentavos !== undefined && next < minCentavos)) {
        return;
      }
      onChange(next);
      setRawText(formatCentavosToInput(next));
    }
  };

  // Avaliação de mensagens de erro inline e validações automáticas
  let computedError: string | null = error !== undefined ? error : null;

  if (error === undefined && isTouched && !isFocused && required && valueCentavos <= 0) {
    computedError = 'Informe um valor maior que zero.';
  }

  // Validações de valores inválidos e negativos
  const isNegative = rawText.startsWith('-') || valueCentavos < 0;
  if (isNegative && !allowNegative) {
    computedError = 'O valor não pode ser negativo.';
  } else if (rawText && rawText !== '-' && isNaN(parseMoneyToCentavos(rawText))) {
    computedError = 'Valor monetário inválido.';
  } else if (minCentavos !== undefined && minCentavos > 0 && valueCentavos < minCentavos && isTouched && !isFocused) {
    computedError = `O valor mínimo é R$ ${formatCentavosToInput(minCentavos)}.`;
  } else if (maxCentavos !== undefined && valueCentavos > maxCentavos) {
    computedError = `O valor máximo é R$ ${formatCentavosToInput(maxCentavos)}.`;
  } else if (validate) {
    computedError = validate(valueCentavos) || computedError;
  }

  const hasError = Boolean(computedError);
  const hasWarning = !hasError && Boolean(warning);

  const sizeStyles = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-9 text-xs px-3',
    lg: 'h-10 text-sm px-3.5',
  };

  const borderStyles = hasError
    ? 'border-rose-500 dark:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500'
    : hasWarning
    ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/20 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500'
    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500';

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-[11px] font-semibold mb-1 ${
            hasError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center rounded-xl border transition-all ${borderStyles}`}
      >
        {showPrefix && (
          <span
            className={`pl-3 pr-1 text-[11px] font-bold select-none transition-colors ${
              hasError
                ? 'text-rose-500'
                : hasWarning
                ? 'text-amber-500'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            R$
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          value={rawText}
          placeholder={placeholder}
          onFocus={handleFocus}
          onClick={handleClick}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-invalid={hasError}
          className={`w-full bg-transparent font-bold outline-none tabular-nums placeholder:text-slate-400 disabled:opacity-50 transition-colors ${
            hasError
              ? 'text-rose-700 dark:text-rose-300'
              : 'text-slate-900 dark:text-white'
          } ${sizeStyles[size]} ${showPrefix ? 'pl-1' : ''} ${
            hasError || hasWarning ? 'pr-8' : ''
          } ${inputClassName}`}
        />

        {/* Status icons inside right side */}
        {hasError && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="w-4 h-4 text-rose-500 animate-in zoom-in-75 duration-150" />
          </div>
        )}
        {hasWarning && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-in zoom-in-75 duration-150" />
          </div>
        )}
      </div>

      {/* Inline feedback error messages */}
      {computedError && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{computedError}</span>
        </p>
      )}

      {/* Inline warning message */}
      {!computedError && warning && (
        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>{warning}</span>
        </p>
      )}

      {/* Helper text when no error */}
      {!computedError && !warning && helperText && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
};
