import { prisma } from '@/lib/prisma'
import { EvaluationStatus } from '@prisma/client'
import type { SelfEvaluationInput, ManagerEvaluationInput, HRValidationInput } from '@/lib/validations/evaluation'

export class EvaluationService {
  async findByEmployee(employeeId: string) {
    return prisma.evaluation.findMany({
      where: { evaluateeId: employeeId, deletedAt: null },
      include: {
        campaign: true,
        evaluator: { include: { user: true } },
        competencyRatings: { include: { competency: true } },
        objectives: { include: { objective: true } },
        developmentPlan: { include: { actions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByManager(managerId: string) {
    return prisma.evaluation.findMany({
      where: { evaluatorId: managerId, deletedAt: null },
      include: {
        campaign: true,
        evaluatee: { include: { user: true, department: true } },
        competencyRatings: { include: { competency: true } },
        objectives: { include: { objective: true } },
      },
      orderBy: [{ campaign: { year: 'desc' } }, { status: 'asc' }],
    })
  }

  async findById(id: string) {
    return prisma.evaluation.findUnique({
      where: { id },
      include: {
        campaign: {
          include: {
            campaignCompetencies: {
              include: { competency: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        evaluatee: {
          include: {
            user: true,
            department: true,
            jobFamily: true,
          },
        },
        evaluator: { include: { user: true } },
        competencyRatings: { include: { competency: true } },
        objectives: { include: { objective: true } },
        developmentPlan: { include: { actions: true } },
        attachments: true,
        workflowHistory: { orderBy: { createdAt: 'asc' } },
        feedbacks: true,
      },
    })
  }

  async saveSelfEvaluation(data: SelfEvaluationInput, userId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: data.evaluationId },
      include: { evaluatee: { include: { user: true } } },
    })

    if (!evaluation) throw new Error('EVALUATION_NOT_FOUND')
    if (evaluation.evaluatee.user.id !== userId) throw new Error('UNAUTHORIZED')

    const allowedStatuses: EvaluationStatus[] = [
      EvaluationStatus.NOT_STARTED,
      EvaluationStatus.SELF_IN_PROGRESS,
    ]
    if (!allowedStatuses.includes(evaluation.status)) {
      throw new Error('EVALUATION_NOT_EDITABLE')
    }

    const newStatus = data.isDraft
      ? EvaluationStatus.SELF_IN_PROGRESS
      : EvaluationStatus.SELF_SUBMITTED

    return prisma.$transaction(async (tx) => {
      // Upsert competency ratings
      for (const rating of data.competencyRatings) {
        await tx.competencyRating.upsert({
          where: {
            evaluationId_competencyId: {
              evaluationId: data.evaluationId,
              competencyId: rating.competencyId,
            },
          },
          create: {
            evaluationId: data.evaluationId,
            competencyId: rating.competencyId,
            selfScore: rating.selfScore,
            selfComment: rating.selfComment,
          },
          update: {
            selfScore: rating.selfScore,
            selfComment: rating.selfComment,
          },
        })
      }

      // Upsert objective evaluations
      for (const objEval of data.objectiveEvaluations) {
        await tx.objectiveEvaluation.upsert({
          where: {
            evaluationId_objectiveId: {
              evaluationId: data.evaluationId,
              objectiveId: objEval.objectiveId,
            },
          },
          create: {
            evaluationId: data.evaluationId,
            objectiveId: objEval.objectiveId,
            selfProgress: objEval.selfProgress,
            selfScore: objEval.selfScore,
            selfComment: objEval.selfComment,
          },
          update: {
            selfProgress: objEval.selfProgress,
            selfScore: objEval.selfScore,
            selfComment: objEval.selfComment,
          },
        })
      }

      // Calculate self score
      const selfScore = this.calculateAverageScore(
        data.competencyRatings.map(r => r.selfScore)
      )

      const updatedEval = await tx.evaluation.update({
        where: { id: data.evaluationId },
        data: {
          selfStrengths: data.selfStrengths,
          selfImprovements: data.selfImprovements,
          selfComments: data.selfComments,
          selfScore,
          status: newStatus,
          ...(newStatus === EvaluationStatus.SELF_SUBMITTED ? { selfSubmittedAt: new Date() } : {}),
        },
      })

      // Record workflow transition
      if (newStatus !== evaluation.status) {
        await tx.workflowHistory.create({
          data: {
            evaluationId: data.evaluationId,
            fromStatus: evaluation.status,
            toStatus: newStatus,
            performedById: userId,
            comment: data.isDraft ? 'Autoévaluation sauvegardée' : 'Autoévaluation soumise',
          },
        })
      }

      return updatedEval
    })
  }

  async saveManagerEvaluation(data: ManagerEvaluationInput, userId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: data.evaluationId },
      include: { evaluator: { include: { user: true } } },
    })

    if (!evaluation) throw new Error('EVALUATION_NOT_FOUND')
    if (evaluation.evaluator?.user.id !== userId) throw new Error('UNAUTHORIZED')

    const allowedStatuses: EvaluationStatus[] = [
      EvaluationStatus.SELF_SUBMITTED,
      EvaluationStatus.MANAGER_IN_PROGRESS,
    ]
    if (!allowedStatuses.includes(evaluation.status)) {
      throw new Error('EVALUATION_NOT_EDITABLE')
    }

    const newStatus = data.isDraft
      ? EvaluationStatus.MANAGER_IN_PROGRESS
      : EvaluationStatus.MANAGER_SUBMITTED

    return prisma.$transaction(async (tx) => {
      for (const rating of data.competencyRatings) {
        await tx.competencyRating.upsert({
          where: {
            evaluationId_competencyId: {
              evaluationId: data.evaluationId,
              competencyId: rating.competencyId,
            },
          },
          create: {
            evaluationId: data.evaluationId,
            competencyId: rating.competencyId,
            managerScore: rating.managerScore,
            managerComment: rating.managerComment,
          },
          update: {
            managerScore: rating.managerScore,
            managerComment: rating.managerComment,
          },
        })
      }

      for (const objEval of data.objectiveEvaluations) {
        await tx.objectiveEvaluation.upsert({
          where: {
            evaluationId_objectiveId: {
              evaluationId: data.evaluationId,
              objectiveId: objEval.objectiveId,
            },
          },
          create: {
            evaluationId: data.evaluationId,
            objectiveId: objEval.objectiveId,
            managerProgress: objEval.managerProgress,
            managerScore: objEval.managerScore,
            managerComment: objEval.managerComment,
          },
          update: {
            managerProgress: objEval.managerProgress,
            managerScore: objEval.managerScore,
            managerComment: objEval.managerComment,
          },
        })
      }

      const managerScore = this.calculateAverageScore(
        data.competencyRatings.map(r => r.managerScore)
      )

      const updatedEval = await tx.evaluation.update({
        where: { id: data.evaluationId },
        data: {
          managerStrengths: data.managerStrengths,
          managerImprovements: data.managerImprovements,
          managerComments: data.managerComments,
          managerScore,
          promotionRecommended: data.promotionRecommended,
          salaryIncreaseAmount: data.salaryIncreaseAmount,
          status: newStatus,
          ...(newStatus === EvaluationStatus.MANAGER_SUBMITTED
            ? { managerSubmittedAt: new Date() }
            : {}),
        },
      })

      if (newStatus !== evaluation.status) {
        await tx.workflowHistory.create({
          data: {
            evaluationId: data.evaluationId,
            fromStatus: evaluation.status,
            toStatus: newStatus,
            performedById: userId,
            comment: data.isDraft ? 'Évaluation manager sauvegardée' : 'Évaluation manager soumise',
          },
        })
      }

      return updatedEval
    })
  }

  async hrValidate(data: HRValidationInput, userId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: data.evaluationId },
    })

    if (!evaluation) throw new Error('EVALUATION_NOT_FOUND')
    if (!['MANAGER_SUBMITTED', 'HR_REVIEW', 'CALIBRATION'].includes(evaluation.status)) {
      throw new Error('INVALID_STATUS_FOR_VALIDATION')
    }

    let newStatus: EvaluationStatus
    if (data.action === 'VALIDATE') newStatus = EvaluationStatus.VALIDATED
    else if (data.action === 'REJECT') newStatus = EvaluationStatus.SELF_IN_PROGRESS
    else newStatus = EvaluationStatus.CALIBRATION

    const finalScore = data.calibratedScore ?? evaluation.managerScore

    return prisma.$transaction(async (tx) => {
      const updated = await tx.evaluation.update({
        where: { id: data.evaluationId },
        data: {
          hrComments: data.hrComments,
          calibratedScore: data.calibratedScore,
          finalScore,
          status: newStatus,
          hrValidatorId: userId,
          ...(data.action === 'VALIDATE' ? { hrValidatedAt: new Date() } : {}),
          ...(data.action === 'CALIBRATE' ? { calibratedAt: new Date() } : {}),
        },
      })

      await tx.workflowHistory.create({
        data: {
          evaluationId: data.evaluationId,
          fromStatus: evaluation.status,
          toStatus: newStatus,
          performedById: userId,
          comment: data.rejectionReason ?? data.hrComments ?? `Action: ${data.action}`,
        },
      })

      return updated
    })
  }

  private calculateAverageScore(scores: (number | undefined)[]): number | null {
    const validScores = scores.filter((s): s is number => s !== undefined)
    if (validScores.length === 0) return null
    return validScores.reduce((sum, s) => sum + s, 0) / validScores.length
  }
}

export const evaluationService = new EvaluationService()
