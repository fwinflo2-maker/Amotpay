import assert from 'node:assert/strict';
import test from 'node:test';
import { isBeneficiaryRejected, normalizePhone, parseAmount, validateAmount } from '../src/utils/transfer';

test('parseAmount accepts spaces and decimal comma without accepting malformed values', () => {
  assert.equal(parseAmount('100 000'), 100000);
  assert.equal(parseAmount('250,50'), 250.5);
  assert.equal(parseAmount('12.345'), null);
  assert.equal(parseAmount('-10'), null);
  assert.equal(parseAmount('abc'), null);
});

test('validateAmount enforces dynamic payment method limits', () => {
  assert.deepEqual(validateAmount('199', 200, 1500000), { error: 'Le montant doit être compris entre 200 et 1500000.' });
  assert.deepEqual(validateAmount('200', 200, 1500000), { value: 200 });
  assert.match(validateAmount('200', Number.NaN, 1500000).error ?? '', /limites/);
});

test('normalizePhone creates an E.164 number and rejects another country', () => {
  assert.deepEqual(normalizePhone('07 08 09 10 11', '+225'), { value: '+225708091011' });
  assert.deepEqual(normalizePhone('00225 07 08 09 10 11', '+225'), { value: '+2250708091011' });
  assert.match(normalizePhone('+237 690 00 00 00', '+225').error ?? '', /pays sélectionné/);
});

test('isBeneficiaryRejected recognizes explicit Magma failures', () => {
  assert.equal(isBeneficiaryRejected({ valid: false }), true);
  assert.equal(isBeneficiaryRejected({ status: 'invalid' }), true);
  assert.equal(isBeneficiaryRejected({ success: true, data: { valid: false } }), true);
  assert.equal(isBeneficiaryRejected({ status: 'available' }), false);
});
