import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createMachineSchema,
  createProductSchema,
  createRestockSchema,
  loginSchema,
  registerWasteSchema,
  DEFAULT_LAYOUT,
  MAX_PRODUCTS_PER_SLOT,
} from '../src/index';

test('loginSchema rechaza correo inválido', () => {
  const result = loginSchema.safeParse({ email: 'no-es-correo', password: '123' });
  assert.equal(result.success, false);
});

test('loginSchema acepta credenciales válidas', () => {
  const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
  assert.equal(result.success, true);
});

test('createProductSchema rechaza precio negativo', () => {
  const result = createProductSchema.safeParse({ name: 'Agua', price: -1, cost: 5 });
  assert.equal(result.success, false);
});

test('createMachineSchema acepta sin layout (usa DEFAULT_LAYOUT en el servicio)', () => {
  const result = createMachineSchema.safeParse({ name: 'Máquina 1' });
  assert.equal(result.success, true);
});

test('DEFAULT_LAYOUT tiene 44 espirales, como la máquina real de Capithal Park', () => {
  const total = DEFAULT_LAYOUT.flat().length;
  assert.equal(total, 44);
});

test('createRestockSchema exige al menos un renglón', () => {
  const result = createRestockSchema.safeParse({ machineId: 'm1', lines: [] });
  assert.equal(result.success, false);
});

test('registerWasteSchema rechaza cantidad cero', () => {
  const result = registerWasteSchema.safeParse({
    machineId: 'm1',
    productId: 'p1',
    quantity: 0,
    reason: 'JAMMED',
  });
  assert.equal(result.success, false);
});

test('registerWasteSchema rechaza una razón inválida', () => {
  const result = registerWasteSchema.safeParse({
    machineId: 'm1',
    productId: 'p1',
    quantity: 1,
    reason: 'SE_LO_COMIERON',
  });
  assert.equal(result.success, false);
});

test('MAX_PRODUCTS_PER_SLOT es 4', () => {
  assert.equal(MAX_PRODUCTS_PER_SLOT, 4);
});
