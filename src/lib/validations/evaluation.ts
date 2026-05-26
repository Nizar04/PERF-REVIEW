import { z } from 'zod'

export const selfEvaluationSchema = z.object({
  evaluationId: z.string().cuid(),
  selfStrengths: z.string().max(2000).optional(),
  selfImprovements: z.string().max(2000).optional(),
  selfComments: z.string().max(2000).optional(),
  competencyRatings: z.array(z.object({
    competencyId: z.string().cuid(),
    selfScore: z.number().min(1).max(5),
    selfComment: z.string().max(500).optional(),
  })),
  objectiveEvaluations: z.array(z.object({
    objectiveId: z.string().cuid(),
    selfProgress: z.number().int().min(0).max(100),
    selfScore: z.number().min(1).max(5).optional(),
    selfComment: z.string().max(500).optional(),
  })),
  isDraft: z.boolean().default(true),
})

export const managerEvaluationSchema = z.object({
  evaluationId: z.string().cuid(),
  managerStrengths: z.string().max(2000).optional(),
  managerImprovements: z.string().max(2000).optional(),
  managerComments: z.string().max(2000).optional(),
  competencyRatings: z.array(z.object({
    competencyId: z.string().cuid(),
    managerScore: z.number().min(1).max(5),
    managerComment: z.string().max(500).optional(),
  })),
  objectiveEvaluations: z.array(z.object({
    objectiveId: z.string().cuid(),
    managerProgress: z.number().int().min(0).max(100),
    managerScore: z.number().min(1).max(5).optional(),
    managerComment: z.string().max(500).optional(),
  })),
  promotionRecommended: z.boolean().default(false),
  salaryIncreaseAmount: z.number().min(0).max(100).optional(),
  isDraft: z.boolean().default(true),
})

export const hrValidationSchema = z.object({
  evaluationId: z.string().cuid(),
  hrComments: z.string().max(2000).optional(),
  calibratedScore: z.number().min(1).max(5).optional(),
  action: z.enum(['VALIDATE', 'REJECT', 'CALIBRATE']),
  rejectionReason: z.string().max(500).optional(),
})

export type SelfEvaluationInput = z.infer<typeof selfEvaluationSchema>
export type ManagerEvaluationInput = z.infer<typeof managerEvaluationSchema>
export type HRValidationInput = z.infer<typeof hrValidationSchema>
