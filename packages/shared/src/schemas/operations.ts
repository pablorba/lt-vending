import { z } from 'zod';

/** Agrega un espiral nuevo a una charola (nivel). Si el nivel no existe
 * todavía en la máquina, lo crea — así también se agregan charolas nuevas. */
export const addSlotSchema = z.object({
  level: z.number().int().positive('El nivel debe ser mayor a 0'),
  capacity: z.number().int().min(1, 'La capacidad debe ser al menos 1'),
  /** Opcional: si no se manda, se genera como "{nivel}-{posición}". */
  code: z.string().optional(),
});
export type AddSlotInput = z.infer<typeof addSlotSchema>;

export const updateSlotSchema = z.object({
  code: z.string().min(1, 'El nombre del espiral no puede quedar vacío').optional(),
  capacity: z.number().int().min(1, 'La capacidad debe ser al menos 1').optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;

export const setSlotProductsSchema = z.object({
  productIds: z.array(z.string()),
});
export type SetSlotProductsInput = z.infer<typeof setSlotProductsSchema>;

const restockLineSchema = z.object({
  slotId: z.string(),
  productId: z.string(),
  foundQty: z.number().int().nonnegative(),
  addedQty: z.number().int().nonnegative(),
});

export const createRestockSchema = z.object({
  machineId: z.string(),
  lines: z.array(restockLineSchema).min(1, 'El surtido no tiene renglones'),
  notes: z.string().optional(),
});
export type CreateRestockInput = z.infer<typeof createRestockSchema>;

export const wasteReasons = ['JAMMED', 'EXPIRED', 'DAMAGED', 'THEFT', 'OTHER'] as const;

export const registerWasteSchema = z.object({
  machineId: z.string(),
  slotId: z.string().optional(),
  productId: z.string(),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  reason: z.enum(wasteReasons),
  notes: z.string().optional(),
});
export type RegisterWasteInput = z.infer<typeof registerWasteSchema>;

export const registerCollectionSchema = z.object({
  machineId: z.string(),
  cashAmount: z.number().nonnegative().optional(),
  cardAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type RegisterCollectionInput = z.infer<typeof registerCollectionSchema>;
