import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  compareRestockRows,
  computeCoverage,
  lineTotals,
  soldQtyFromDiff,
  totalAfterRestock,
} from '../src/modules/operations/restock-math';

test('soldQtyFromDiff: lo normal, encontró menos de lo esperado', () => {
  assert.equal(soldQtyFromDiff(10, 3), 7);
});

test('soldQtyFromDiff: nunca negativo si encontró MÁS de lo esperado (conteo previo mal)', () => {
  assert.equal(soldQtyFromDiff(5, 9), 0);
});

test('soldQtyFromDiff: espiral vacío sigue en cero, nada vendido', () => {
  assert.equal(soldQtyFromDiff(0, 0), 0);
});

test('lineTotals: redondea a centavos', () => {
  const t = lineTotals(19.99, 10.333, 3);
  assert.equal(t.saleValue, 59.97);
  assert.equal(t.cogs, 31.0); // 10.333*3 = 30.999 -> 31.00
});

test('computeCoverage: sin historial, no sugiere nada más que llenar', () => {
  const c = computeCoverage(0, 0, 5);
  assert.equal(c.perDay, 0);
  assert.equal(c.coverDays, null);
  assert.equal(c.urgent, false);
});

test('computeCoverage: espiral vacío y sin historial es urgente', () => {
  const c = computeCoverage(0, 0, 0);
  assert.equal(c.urgent, true);
});

test('computeCoverage: menos de un día de cobertura es urgente', () => {
  const c = computeCoverage(20, 10, 1); // 2/día, 1 pieza = 0.5 días
  assert.equal(c.perDay, 2);
  assert.equal(c.coverDays, 0.5);
  assert.equal(c.urgent, true);
});

test('computeCoverage: con sobra de días no es urgente', () => {
  const c = computeCoverage(10, 10, 20); // 1/día, 20 piezas = 20 días
  assert.equal(c.urgent, false);
});

test('compareRestockRows: urgentes primero', () => {
  const rows = [
    { code: 'A', urgent: false, coverDays: 3 },
    { code: 'B', urgent: true, coverDays: 0.2 },
    { code: 'C', urgent: false, coverDays: 1 },
  ];
  const sorted = [...rows].sort(compareRestockRows).map((r) => r.code);
  assert.deepEqual(sorted, ['B', 'C', 'A']);
});

test('totalAfterRestock: suma lo tocado más lo que no se tocó', () => {
  const items = [
    { productId: 'p1', currentQty: 5 },
    { productId: 'p2', currentQty: 2 },
  ];
  const touched = new Map([['p1', { foundQty: 1, addedQty: 4 }]]);
  // p1 tocado: 1+4=5 ; p2 no tocado: se queda en 2
  assert.equal(totalAfterRestock(items, touched), 7);
});

test('totalAfterRestock: espiral sin tocar nada se queda igual', () => {
  const items = [
    { productId: 'p1', currentQty: 3 },
    { productId: 'p2', currentQty: 4 },
  ];
  assert.equal(totalAfterRestock(items, new Map()), 7);
});
