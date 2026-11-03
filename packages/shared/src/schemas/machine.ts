import { z } from 'zod';

/**
 * Layout por defecto de la primera máquina (AMS VISI Combo 39", Capithal
 * Park Colotlán): 6 niveles, 44 espirales. El número es cuántas piezas caben
 * en cada espiral de ese nivel. Niveles 4-6 son la sección refrigerada.
 * Portado tal cual de la-terraza-pos (apps/api/src/modules/vending), que ya
 * opera esta misma máquina física. Es solo el punto de partida: el
 * planograma se puede modificar después (agregar/quitar espirales por
 * charola — ver addSlotSchema) y un operador con otra máquina puede pasar
 * su propio layout al crearla.
 */
export const DEFAULT_LAYOUT: number[][] = [
  [9, 9, 9, 9, 9], // nivel 1
  [12, 12, 12, 15, 15], // nivel 2
  [10, 12, 15, 15, 15, 15, 18, 18, 18, 24], // nivel 3
  [6, 6, 6, 6, 6, 6, 6, 6], // nivel 4 (refrigerado)
  [6, 6, 6, 6, 6, 6, 6, 6], // nivel 5 (refrigerado)
  [6, 6, 6, 6, 6, 6, 6, 6], // nivel 6 (refrigerado)
];

/** Valor por defecto de cuántos productos distintos caben en un espiral (editable por máquina). */
export const DEFAULT_MAX_PRODUCTS_PER_SLOT = 4;

export const createMachineSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  location: z.string().optional(),
  notes: z.string().optional(),
  /** Opcional: layout propio. Si no se manda, se usa DEFAULT_LAYOUT. */
  layout: z.array(z.array(z.number().int().positive())).optional(),
  /** Opcional: cuántos productos distintos caben por espiral en esta máquina (default 4). */
  maxProductsPerSlot: z.number().int().min(1).max(20).optional(),
});
export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export const updateMachineSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  maxProductsPerSlot: z.number().int().min(1).max(20).optional(),
});
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
