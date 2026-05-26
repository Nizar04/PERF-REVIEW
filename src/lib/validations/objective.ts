import { z } from 'zod'
import { ObjectiveStatus } from '@prisma/client'

export const createObjectiveSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(1000).optional(),
  kpi: z.string().max(200).optional(),
  weight: z.number().min(0.1).max(10).default(1),
  targetValue: z.string().max(100).optional(),
  dueDate: z.coerce.date().optional(),
  year: z.number().int().min(2020).max(2030),
  campaignId: z.string().cuid().optional(),
})

export const updateObjectiveSchema = createObjectiveSchema.partial().extend({
  currentValue: z.string().max(100).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: z.nativeEnum(ObjectiveStatus).optional(),
})

export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>
export type UpdateObjectiveInput = z.infer<typeof updateObjectiveSchema>
