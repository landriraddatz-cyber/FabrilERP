import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoneyToCentavos, formatCentavosToInput, sanitizeMoneyInputText } from './money.ts';

test('parseMoneyToCentavos parses standard monetary strings accurately', () => {
  assert.equal(parseMoneyToCentavos(''), 0);
  assert.equal(parseMoneyToCentavos(null), 0);
  assert.equal(parseMoneyToCentavos(undefined), 0);
  assert.equal(parseMoneyToCentavos('0'), 0);
  assert.equal(parseMoneyToCentavos('0,00'), 0);
  assert.equal(parseMoneyToCentavos('1'), 100);
  assert.equal(parseMoneyToCentavos('1,'), 100);
  assert.equal(parseMoneyToCentavos('1,5'), 150);
  assert.equal(parseMoneyToCentavos('1,50'), 150);
  assert.equal(parseMoneyToCentavos('1.50'), 150);
  assert.equal(parseMoneyToCentavos('12,34'), 1234);
  assert.equal(parseMoneyToCentavos('1.250,50'), 125050);
  assert.equal(parseMoneyToCentavos('0,05'), 5);
  assert.equal(parseMoneyToCentavos('0,1'), 10);
  assert.equal(parseMoneyToCentavos('0,10'), 10);
  assert.equal(parseMoneyToCentavos('-15,00'), -1500);
});

test('formatCentavosToInput formats centavos to clean Brazilian string', () => {
  assert.equal(formatCentavosToInput(0), '0,00');
  assert.equal(formatCentavosToInput(5), '0,05');
  assert.equal(formatCentavosToInput(50), '0,50');
  assert.equal(formatCentavosToInput(100), '1,00');
  assert.equal(formatCentavosToInput(125050), '1250,50');
});

test('sanitizeMoneyInputText keeps valid digits, comma and max 2 decimal places', () => {
  assert.equal(sanitizeMoneyInputText('12.5'), '12,5');
  assert.equal(sanitizeMoneyInputText('12,500'), '12,50');
  assert.equal(sanitizeMoneyInputText('abc12,99xyz'), '12,99');
  assert.equal(sanitizeMoneyInputText('12,34,56'), '12,34');
});
