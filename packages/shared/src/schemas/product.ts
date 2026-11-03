import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  sku: z.string().optional(),
  price: z.number().nonnegative('El precio no puede ser negativo'),
  cost: z.number().nonnegative('El costo no puede ser negativo'),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
