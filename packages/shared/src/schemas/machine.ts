import { z } from 'zod';

export const createMachineSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  location: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export const updateMachineSchema = createMachineSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
