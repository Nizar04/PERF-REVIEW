import { z } from 'zod'
import { CampaignStatus } from '@prisma/client'

const campaignBaseSchema = z.object({
  name: z.string().min(3, 'Minimum 3 caractères').max(100),
  description: z.string().max(500).optional(),
  year: z.number().int().min(2020).max(2030),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  selfEvalDeadline: z.coerce.date().optional(),
  managerEvalDeadline: z.coerce.date().optional(),
  calibrationDate: z.coerce.date().optional(),
  requireSelfEval: z.boolean().default(true),
  requireManagerEval: z.boolean().default(true),
  requireHRValidation: z.boolean().default(true),
  requireSignature: z.boolean().default(false),
  departmentIds: z.array(z.string()).optional(),
  competencyIds: z.array(z.string()).optional(),
})

export const createCampaignSchema = campaignBaseSchema.refine(
  data => data.endDate > data.startDate,
  { message: 'La date de fin doit être après la date de début', path: ['endDate'] }
)

export const updateCampaignSchema = campaignBaseSchema.partial().extend({
  status: z.nativeEnum(CampaignStatus).optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
