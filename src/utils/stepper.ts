/**
 * Helper utilities for stepping, parsing, and clamping quantities
 */

export interface StepOptions {
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}

/**
 * Accurately steps a number by delta (step or -step), avoiding IEEE-754 floating point precision errors.
 */
export function stepQuantity(currentValue: number, direction: 'inc' | 'dec', options: StepOptions = {}): number {
  const step = options.step ?? 1;
  const min = options.min !== undefined ? options.min : 0;
  const max = options.max !== undefined ? options.max : Infinity;

  // Determine precision from step
  let decimals = options.decimals;
  if (decimals === undefined) {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      decimals = stepStr.split('.')[1].length;
    } else {
      decimals = 0;
    }
  }

  const factor = Math.pow(10, decimals);
  const currentSafe = Math.round(currentValue * factor);
  const stepSafe = Math.round(step * factor);

  let nextSafe = direction === 'inc' ? currentSafe + stepSafe : currentSafe - stepSafe;
  let nextValue = nextSafe / factor;

  // Round to decimal places to eliminate any minor float artifact
  nextValue = Number(nextValue.toFixed(decimals));

  if (nextValue < min) nextValue = min;
  if (nextValue > max) nextValue = max;

  return nextValue;
}

/**
 * Parses user typed input into a clean numeric value, supporting both comma and dot decimal separators.
 */
export function parseQuantityInput(raw: string, fallback: number = 0, options: StepOptions = {}): number {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return options.min !== undefined ? options.min : fallback;
  }

  // Replace comma with dot
  const normalized = raw.replace(',', '.').trim();
  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return options.min !== undefined ? options.min : fallback;
  }

  let finalVal = parsed;
  if (options.min !== undefined && finalVal < options.min) {
    finalVal = options.min;
  }
  if (options.max !== undefined && finalVal > options.max) {
    finalVal = options.max;
  }

  if (options.decimals !== undefined) {
    finalVal = Number(finalVal.toFixed(options.decimals));
  }

  return finalVal;
}
