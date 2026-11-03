/**
 * Lógica pura del surtido y el plan de reabasto — sin Prisma ni NestJS, para
 * poder probarla sin una base de datos. operations.service.ts la usa tal
 * cual; aquí solo vive el cálculo.
 */

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Vendido = esperado − encontrado, nunca negativo (más de lo esperado = error de conteo previo). */
export function soldQtyFromDiff(expectedQty: number, foundQty: number): number {
  return Math.max(0, expectedQty - foundQty);
}

export function lineTotals(price: number, cost: number, soldQty: number) {
  return {
    saleValue: round2(price * soldQty),
    cogs: round2(cost * soldQty),
  };
}

/**
 * Piezas/día de los últimos N días medidos, días de cobertura con lo que hay
 * ahora, y si es urgente (menos de 1 día de cobertura, o ya en cero).
 */
export function computeCoverage(totalSold: number, daysMeasured: number, currentQty: number) {
  const perDay = daysMeasured > 0 ? round2(totalSold / daysMeasured) : 0;
  const coverDays = perDay > 0 ? round2(currentQty / perDay) : null;
  const urgent = coverDays !== null ? coverDays < 1 : currentQty === 0;
  return { perDay, coverDays, urgent };
}

export function compareRestockRows(
  a: { urgent: boolean; coverDays: number | null },
  b: { urgent: boolean; coverDays: number | null },
): number {
  if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
  return (a.coverDays ?? 99) - (b.coverDays ?? 99);
}

/**
 * Total de piezas que quedarían en un espiral tras el surtido, sumando los
 * productos tocados en este surtido (foundQty+addedQty) y los que no se
 * tocaron (se quedan con su currentQty). Para validar contra la capacidad.
 */
export function totalAfterRestock(
  items: Array<{ productId: string; currentQty: number }>,
  touched: Map<string, { foundQty: number; addedQty: number }>,
): number {
  let total = 0;
  for (const item of items) {
    const line = touched.get(item.productId);
    total += line ? line.foundQty + line.addedQty : item.currentQty;
  }
  return total;
}
