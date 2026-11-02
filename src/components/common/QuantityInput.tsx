import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { stepQuantity, parseQuantityInput, StepOptions } from '../../utils/stepper';

export interface QuantityInputProps extends StepOptions {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
  quickAddButtons?: number[];
  autoFocusOnMount?: boolean;
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
  className = '',
  label,
  placeholder,
  quickAddButtons,
  autoFocusOnMount = false,
}) => {
  // Local string representation so user can type freely without aggressive formatting interrupting keystrokes
  const [textValue, setTextValue] = useState<string>(() => (value !== undefined && !isNaN(value) ? String(value) : '0'));

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
    const currentNum = parseQuantityInput(textValue, value, { min, max, step, decimals });
    const nextNum = stepQuantity(currentNum, direction, { min, max, step, decimals });
    setTextValue(String(nextNum));
    onChange(nextNum);
  };

  const handleQuickAdd = (delta: number) => {
    if (disabled) return;
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
    const raw = e.target.value;
    setTextValue(raw);
    const parsed = parseQuantityInput(raw, value, { min, max, step, decimals });
    onChange(parsed);
  };

  const handleBlur = () => {
    // On blur, normalize representation
    const parsed = parseQuantityInput(textValue, min ?? 0, { min, max, step, decimals });
    setTextValue(String(parsed));
    onChange(parsed);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Highlight and select all text immediately on focus so typing instantly replaces the number
    e.currentTarget.select();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    // Prevent default deselection on mouse up if clicking into an unselected input
    if (document.activeElement === e.currentTarget && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      e.currentTarget.select();
    }
  };

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

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
          {label}
        </label>
      )}

      <div
        className={`flex items-center min-w-0 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl ${containerPadding} shadow-2xs transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500`}
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
            className={`w-full bg-transparent text-center font-bold text-slate-900 dark:text-white outline-none tabular-nums ${inputClass}`}
          />
          {unit && (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 pr-1 select-none pointer-events-none">
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
    </div>
  );
};
