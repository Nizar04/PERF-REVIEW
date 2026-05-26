import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, hrProcedure } from '@/lib/trpc'
import { evaluationService } from '@/server/services/evaluation.service'
import { notificationService } from '@/server/services/notification.service'
import { selfEvaluationSchema, managerEvaluationSchema, hrValidationSchema } from '@/lib/validations/evaluation'
import { prisma } from '@/lib/prisma'

export const evaluationRouter = router({
  // Mon évaluation (collaborateur)
  myEvaluations: protectedProcedure
    .query(async ({ ctx }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
      })
      if (!employee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profil employé introuvable' })
      return evaluationService.findByEmployee(employee.id)
    }),

  // Évaluations de mon équipe (manager)
  teamEvaluations: protectedProcedure
    .input(z.object({ campaignId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
      })
      if (!employee) throw new TRPCError({ code: 'NOT_FOUND' })

      const evaluations = await evaluationService.findByManager(employee.id)
      if (input.campaignId) {
        return evaluations.filter(e => e.campaignId === input.campaignId)
      }
      return evaluations
    }),

  // Detail d'une évaluation
  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const evaluation = await evaluationService.findById(input.id)
      if (!evaluation) throw new TRPCError({ code: 'NOT_FOUND' })

      // Check access: evaluatee, evaluator, or HR/Admin
      const userId = ctx.session.user.id
      const role = ctx.session.user.role
      const isHrOrAdmin = ['RH', 'ADMIN'].includes(role)

      if (!isHrOrAdmin) {
        const isEvaluatee = evaluation.evaluatee.user.id === userId
        const isEvaluator = evaluation.evaluator?.user.id === userId
        if (!isEvaluatee && !isEvaluator) {
          throw new TRPCError({ code: 'FORBIDDEN' })
        }
      }

      return evaluation
    }),

  // Sauvegarder autoévaluation
  saveSelf: protectedProcedure
    .input(selfEvaluationSchema)
    .mutation(async ({ ctx, input }) => {
      const evaluation = await evaluationService.saveSelfEvaluation(input, ctx.session.user.id)

      // Notify manager if submitted
      if (!input.isDraft) {
        notificationService.notifySelfEvalSubmitted(input.evaluationId).catch(console.error)
      }

      return evaluation
    }),

  // Sauvegarder évaluation manager
  saveManager: protectedProcedure
    .input(managerEvaluationSchema)
    .mutation(async ({ ctx, input }) => {
      return evaluationService.saveManagerEvaluation(input, ctx.session.user.id)
    }),

  // Validation RH
  hrValidate: hrProcedure
    .input(hrValidationSchema)
    .mutation(async ({ ctx, input }) => {
      const evaluation = await evaluationService.hrValidate(input, ctx.session.user.id)

      if (input.action === 'VALIDATE') {
        notificationService.notifyEvaluationValidated(input.evaluationId).catch(console.error)
      }

      return evaluation
    }),

  // Lister toutes pour HR
  all: hrProcedure
    .input(z.object({
      campaignId: z.string().cuid().optional(),
      status: z.string().optional(),
      departmentId: z.string().cuid().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, campaignId, status, departmentId } = input
      const skip = (page - 1) * limit

      const where = {
        deletedAt: null,
        campaign: { organizationId: ctx.session.user.organizationId },
        ...(campaignId ? { campaignId } : {}),
        ...(status ? { status: status as never } : {}),
        ...(departmentId ? { evaluatee: { departmentId } } : {}),
      }

      const [total, evaluations] = await Promise.all([
        prisma.evaluation.count({ where }),
        prisma.evaluation.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            campaign: { select: { name: true, year: true } },
            evaluatee: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
                department: { select: { name: true } },
              },
            },
            evaluator: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
      ])

      return {
        data: evaluations,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      }
    }),
})
