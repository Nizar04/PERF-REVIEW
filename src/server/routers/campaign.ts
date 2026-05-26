import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, hrProcedure } from '@/lib/trpc'
import { campaignService } from '@/server/services/campaign.service'
import { notificationService } from '@/server/services/notification.service'
import { createCampaignSchema, updateCampaignSchema } from '@/lib/validations/campaign'

export const campaignRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      search: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.session.user
      return campaignService.findAll(organizationId, input)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await campaignService.findById(input.id, ctx.session.user.organizationId)
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND' })
      return campaign
    }),

  create: hrProcedure
    .input(createCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      return campaignService.create(
        input,
        ctx.session.user.id,
        ctx.session.user.organizationId
      )
    }),

  update: hrProcedure
    .input(z.object({
      id: z.string().cuid(),
      data: updateCampaignSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      return campaignService.update(
        input.id,
        input.data,
        ctx.session.user.organizationId
      )
    }),

  activate: hrProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await campaignService.activate(input.id, ctx.session.user.organizationId)
      // Send notifications async
      notificationService.notifyCampaignStarted(input.id).catch(console.error)
      return campaign
    }),

  delete: hrProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return campaignService.softDelete(input.id, ctx.session.user.organizationId)
    }),
})
