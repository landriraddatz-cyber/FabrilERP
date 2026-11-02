import React, { useEffect, useState } from 'react';
import { Minus, Plus, AlertCircle, AlertTriangle } from 'lucide-react';
import { stepQuantity, parseQuantityInput, StepOptions } from '../../utils/stepper';

export interface QuantityInputProps extends StepOptions {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
  quickAddButtons?: number[];
  autoFocusOnMount?: boolean;
  error?: string | null;
  warning?: string | null;
  helperText?: string;
  validate?: (val: number) => string | null | undefined;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  decimals,
  unit,
  size = 'md',
  disabled = false,
  required = false,
  className = '',
  label,
  placeholder,
  quickAddButtons,
  autoFocusOnMount = false,
  error,
  warning,
  helperText,
  validate,
}) => {
  // Local string representation so user can type freely without aggressive formatting interrupting keystrokes
  const [textValue, setTextValue] = useState<string>(() => (value !== undefined && !isNaN(value) ? String(value) : '0'));
  const [isTouched, setIsTouched] = useState(false);

  // Sync with prop when prop changes from outside
  useEffect(() => {
    if (value !== undefined && !isNaN(value)) {
      const currentParsed = parseQuantityInput(textValue, value, { min, max, step, decimals });
      if (currentParsed !== value) {
        setTextValue(String(value));
      }
    }
  }, [value]);

  const handleStep = (direction: 'inc' | 'dec') => {
    if (disabled) return;
    setIsTouched(true);
    const currentNum = parseQuantityInput(textValue, value, { min, max, step, decimals });
    const nextNum = stepQuantity(currentNum, direction, { min, max, step, decimals });
    setTextValue(String(nextNum));
    onChange(nextNum);
  };

  const handleQuickAdd = (delta: number) => {
    if (disabled) return;
    setIsTouched(true);
    const currentNum = parseQuantityInput(textValue, value, { min, max, step, decimals });
    let nextNum = currentNum + delta;
    if (min !== undefined && nextNum < min) nextNum = min;
    if (max !== undefined && nextNum > max) nextNum = max;
    if (decimals !== undefined) {
      nextNum = Number(nextNum.toFixed(decimals));
    }
    setTextValue(String(nextNum));
    onChange(nextNum);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTouched(true);
    const raw = e.target.value;
    setTextValue(raw);

    // Se estiver digitando negativo e min >= 0, não deixa corromper o estado pai com negativo
    if (raw.trim().startsWith('-') && (min === undefined || min >= 0)) {
      onChange(0);
      return;
    }

    const parsed = parseQuantityInput(raw, value, { min, max, step, decimals });
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsTouched(true);
    // On blur, normalize representation
    if (textValue.trim().startsWith('-') && (min === undefined || min >= 0)) {
      setTextValue(String(min ?? 0));
      onChange(min ?? 0);
      return;
    }
    const parsed = parseQuantityInput(textValue, min ?? 0, { min, max, step, decimals });
    setTextValue(String(parsed));
    onChange(parsed);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    // Highlight and select all text immediately on focus so typing instantly replaces the number
    e.currentTarget.select();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    // Prevent default deselection on mouse up if clicking into an unselected input
    if (document.activeElement === e.currentTarget && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      e.currentTarget.select();
    }
  };

  // Avaliação de erros inline
  let computedError: string | null = error || null;

  if (!computedError) {
    const isNegative = textValue.trim().startsWith('-') || value < 0;
    if (isNegative && (min === undefined || min >= 0)) {
      computedError = 'A quantidade não pode ser negativa.';
    } else if (textValue.trim() && isNaN(Number(textValue.replace(',', '.')))) {
      computedError = 'Valor numérico inválido.';
    } else if (isTouched && required && value <= 0) {
      computedError = 'Informe uma quantidade maior que zero.';
    } else if (min !== undefined && min > 0 && value < min && isTouched) {
      computedError = `Quantidade mínima é ${min}${unit ? ` ${unit}` : ''}.`;
    } else if (max !== undefined && max !== Infinity && value > max) {
      computedError = `Quantidade máxima é ${max}${unit ? ` ${unit}` : ''}.`;
    } else if (validate) {
      computedError = validate(value) || null;
    }
  }

  const hasError = Boolean(computedError);
  const hasWarning = !hasError && Boolean(warning);

  // Size variations
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const containerPadding = isSm ? 'p-0.5' : isLg ? 'p-1.5' : 'p-1';
  const btnSize = isSm
    ? 'w-6 h-6 min-w-[24px] text-xs'
    : isLg
    ? 'w-10 h-10 min-w-[40px] text-base'
    : 'w-7 h-7 min-w-[28px] text-sm';
  const inputClass = isSm
    ? 'text-xs py-0.5 px-1 min-w-[36px]'
    : isLg
    ? 'text-base py-1.5 px-2 min-w-[64px]'
    : 'text-xs py-1 px-1.5 min-w-[44px]';
  const iconSize = isSm ? 'w-3 h-3' : isLg ? 'w-4 h-4' : 'w-3.5 h-3.5';

  const isMinDisabled = disabled || (min !== undefined && value <= min);
  const isMaxDisabled = disabled || (max !== undefined && value >= max);

  const borderStyles = hasError
    ? 'border-rose-500 dark:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500'
    : hasWarning
    ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/20 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500'
    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500';

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      {label && (
        <label
          className={`block text-[11px] font-semibold mb-1 ${
            hasError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div
        className={`flex items-center min-w-0 rounded-xl border ${containerPadding} shadow-2xs transition-all ${borderStyles}`}
      >
        {/* Decrement Button */}
        <button
          type="button"
          disabled={isMinDisabled}
          onClick={() => handleStep('dec')}
          className={`${btnSize} flex items-center justify-center rounded-lg bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600/60 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100 transition-all select-none`}
          aria-label="Diminuir quantidade"
          title="Diminuir"
        >
          <Minus className={iconSize} />
        </button>

        {/* Numeric Input - Selects on Focus */}
        <div className="relative flex items-center flex-1">
          <input
            type="text"
            inputMode={step < 1 ? 'decimal' : 'numeric'}
            autoFocus={autoFocusOnMount}
            value={textValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onMouseUp={handleMouseUp}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={hasError}
            className={`w-full bg-transparent text-center font-bold tabular-nums outline-none transition-colors ${
              hasError
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-slate-900 dark:text-white'
            } ${inputClass}`}
          />
          {unit && (
            <span
              className={`text-[10px] font-semibold pr-1 select-none pointer-events-none transition-colors ${
                hasError ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {unit}
            </span>
          )}
        </div>

        {/* Increment Button */}
        <button
          type="button"
          disabled={isMaxDisabled}
          onClick={() => handleStep('inc')}
          className={`${btnSize} flex items-center justify-center rounded-lg bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600/60 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100 transition-all select-none`}
          aria-label="Aumentar quantidade"
          title="Aumentar"
        >
          <Plus className={iconSize} />
        </button>
      </div>

      {/* Optional quick add chips */}
      {quickAddButtons && quickAddButtons.length > 0 && (
        <div className="flex gap-1 mt-1.5">
          {quickAddButtons.map((delta) => (
            <button
              key={delta}
              type="button"
              disabled={disabled}
              onClick={() => handleQuickAdd(delta)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200/60 dark:border-slate-700 transition"
            >
              +{delta}
            </button>
          ))}
        </div>
      )}

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
