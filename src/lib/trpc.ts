import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from '@/server/context'
import type { UserRole } from '@prisma/client'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

// Role middleware factory
const hasRole = (roles: UserRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Rôle requis: ${roles.join(' ou ')}`,
      })
    }
    return next({ ctx: { ...ctx, session: ctx.session } })
  })

export const protectedProcedure = t.procedure.use(isAuthed)
export const hrProcedure = t.procedure.use(hasRole(['RH', 'ADMIN']))
export const adminProcedure = t.procedure.use(hasRole(['ADMIN']))
export const managerProcedure = t.procedure.use(hasRole(['MANAGER', 'RH', 'ADMIN']))
