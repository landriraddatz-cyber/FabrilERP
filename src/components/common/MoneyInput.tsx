/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  size?: 'sm' | 'md' | 'lg';
  allowNegative?: boolean;
  selectAllOnFocus?: boolean;
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
  size = 'md',
  allowNegative = false,
  selectAllOnFocus = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
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
    const text = e.target.value;
    const sanitized = sanitizeMoneyInputText(text, allowNegative);
    setRawText(sanitized);

    if (!sanitized) {
      onChange(0);
      return;
    }

    let parsed = parseMoneyToCentavos(sanitized);
    if (maxCentavos !== undefined && parsed > maxCentavos) {
      parsed = maxCentavos;
    }
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!rawText.trim()) {
      onChange(0);
      setRawText('');
      return;
    }

    let parsed = parseMoneyToCentavos(rawText);
    if (minCentavos !== undefined && parsed < minCentavos) {
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
      const current = parseMoneyToCentavos(rawText);
      const next = current + 100; // Incrementa R$ 1,00
      if (maxCentavos === undefined || next <= maxCentavos) {
        onChange(next);
        setRawText(formatCentavosToInput(next));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseMoneyToCentavos(rawText);
      const next = current - 100; // Decrementa R$ 1,00
      if (minCentavos === undefined || next >= minCentavos) {
        onChange(next);
        setRawText(formatCentavosToInput(next));
      }
    }
  };

  const sizeStyles = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-9 text-xs px-3',
    lg: 'h-10 text-sm px-3.5',
  };

  return (
    <div
      className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 ${className}`}
    >
      {showPrefix && (
        <span className="pl-3 pr-1 text-[11px] font-bold text-slate-400 select-none">
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
        className={`w-full bg-transparent text-slate-900 dark:text-white font-bold outline-none placeholder:text-slate-400 disabled:opacity-50 ${
          sizeStyles[size]
        } ${showPrefix ? 'pl-1' : ''} ${inputClassName}`}
      />
    </div>
  );
};
