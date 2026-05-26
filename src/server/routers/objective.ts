import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/lib/trpc'
import { createObjectiveSchema, updateObjectiveSchema } from '@/lib/validations/objective'
import { prisma } from '@/lib/prisma'

export const objectiveRouter = router({
  myObjectives: protectedProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
      })
      if (!employee) throw new TRPCError({ code: 'NOT_FOUND' })

      return prisma.objective.findMany({
        where: {
          employeeId: employee.id,
          deletedAt: null,
          ...(input.year ? { year: input.year } : {}),
        },
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      })
    }),

  teamObjectives: protectedProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
        include: { subordinates: true },
      })
      if (!employee) throw new TRPCError({ code: 'NOT_FOUND' })

      const subordinateIds = employee.subordinates.map(s => s.id)

      return prisma.objective.findMany({
        where: {
          employeeId: { in: subordinateIds },
          deletedAt: null,
          ...(input.year ? { year: input.year } : {}),
        },
        include: {
          employee: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  create: protectedProcedure
    .input(createObjectiveSchema)
    .mutation(async ({ ctx, input }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
      })
      if (!employee) throw new TRPCError({ code: 'NOT_FOUND' })

      return prisma.objective.create({
        data: { ...input, employeeId: employee.id },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      data: updateObjectiveSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
      })

      const objective = await prisma.objective.findUnique({
        where: { id: input.id },
      })

      if (!objective) throw new TRPCError({ code: 'NOT_FOUND' })

      // Only owner or manager can update
      const isOwner = objective.employeeId === employee?.id
      const isManager = ctx.session.user.role === 'MANAGER'

      if (!isOwner && !['RH', 'ADMIN', 'MANAGER'].includes(ctx.session.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return prisma.objective.update({
        where: { id: input.id },
        data: input.data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const employee = await prisma.employee.findUnique({
        where: { userId: ctx.session.user.id },
      })

      const objective = await prisma.objective.findUnique({
        where: { id: input.id },
      })

      if (!objective) throw new TRPCError({ code: 'NOT_FOUND' })
      if (objective.employeeId !== employee?.id && !['RH', 'ADMIN'].includes(ctx.session.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return prisma.objective.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })
    }),
})
