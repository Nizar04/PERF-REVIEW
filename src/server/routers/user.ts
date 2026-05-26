import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure, hrProcedure } from '@/lib/trpc'
import { updateUserSchema, updateEmployeeSchema } from '@/lib/validations/user'
import { prisma } from '@/lib/prisma'

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        employee: {
          include: {
            department: true,
            jobFamily: true,
            manager: { include: { user: true } },
            subordinates: { include: { user: true } },
          },
        },
      },
    })
  }),

  list: hrProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      departmentId: z.string().cuid().optional(),
      role: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, search, departmentId, role } = input
      const skip = (page - 1) * limit

      const where = {
        organizationId: ctx.session.user.organizationId,
        deletedAt: null,
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        } : {}),
        ...(role ? { role: role as never } : {}),
        ...(departmentId ? { employee: { departmentId } } : {}),
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          include: {
            employee: {
              include: {
                department: true,
                manager: { include: { user: { select: { firstName: true, lastName: true } } } },
              },
            },
          },
        }),
      ])

      return {
        data: users,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
      }
    }),

  updateMe: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      })
    }),

  updateEmployee: protectedProcedure
    .input(z.object({
      userId: z.string().cuid().optional(),
      data: updateEmployeeSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const targetId = input.userId ?? ctx.session.user.id

      // Only HR/Admin can update other users
      if (targetId !== ctx.session.user.id && !['RH', 'ADMIN'].includes(ctx.session.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return prisma.employee.upsert({
        where: { userId: targetId },
        create: { userId: targetId, ...input.data },
        update: input.data,
      })
    }),

  updateRole: adminProcedure
    .input(z.object({
      userId: z.string().cuid(),
      role: z.enum(['COLLABORATEUR', 'MANAGER', 'RH', 'ADMIN']),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      })
    }),

  deactivate: adminProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: { isActive: false },
      })
    }),

  departments: protectedProcedure.query(async ({ ctx }) => {
    return prisma.department.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    })
  }),
})
