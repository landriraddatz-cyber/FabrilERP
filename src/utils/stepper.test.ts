import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { stepQuantity, parseQuantityInput } from './stepper';

describe('stepper utility tests', () => {
  test('increments and decrements integer values cleanly', () => {
    assert.strictEqual(stepQuantity(1, 'inc', { step: 1, min: 1 }), 2);
    assert.strictEqual(stepQuantity(5, 'dec', { step: 1, min: 1 }), 4);
    assert.strictEqual(stepQuantity(1, 'dec', { step: 1, min: 1 }), 1); // clamped to min
    assert.strictEqual(stepQuantity(10, 'inc', { step: 1, max: 10 }), 10); // clamped to max
  });

  test('avoids floating point artifacts with decimals (e.g. 0.1, 0.05)', () => {
    assert.strictEqual(stepQuantity(0.1, 'inc', { step: 0.1, min: 0 }), 0.2);
    assert.strictEqual(stepQuantity(0.2, 'inc', { step: 0.1, min: 0 }), 0.3); // no 0.30000000000000004!
    assert.strictEqual(stepQuantity(0.3, 'dec', { step: 0.1, min: 0 }), 0.2);
    assert.strictEqual(stepQuantity(0.005, 'inc', { step: 0.001, min: 0 }), 0.006);
  });

  test('parses comma and dot inputs correctly', () => {
    assert.strictEqual(parseQuantityInput('2,5'), 2.5);
    assert.strictEqual(parseQuantityInput('10.75'), 10.75);
    assert.strictEqual(parseQuantityInput('-5', 0, { min: 0 }), 0);
    assert.strictEqual(parseQuantityInput('100', 1, { max: 50 }), 50);
    assert.strictEqual(parseQuantityInput('invalid', 1), 1);
    assert.strictEqual(parseQuantityInput('', 5, { min: 1 }), 1);
  });
});
