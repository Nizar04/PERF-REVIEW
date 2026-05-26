import { z } from 'zod'
import { router, hrProcedure, protectedProcedure } from '@/lib/trpc'
import { reportService } from '@/server/services/report.service'
import { notificationService } from '@/server/services/notification.service'

export const reportRouter = router({
  orgStats: protectedProcedure.query(async ({ ctx }) => {
    return reportService.getOrganizationReport(ctx.session.user.organizationId)
  }),

  campaignReport: hrProcedure
    .input(z.object({ campaignId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return reportService.getCampaignReport(input.campaignId)
    }),

  notifications: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      return notificationService.findByUser(ctx.session.user.id, input.unreadOnly)
    }),

  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return notificationService.markAsRead(input.id, ctx.session.user.id)
    }),

  markAllNotificationsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      return notificationService.markAllAsRead(ctx.session.user.id)
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return notificationService.countUnread(ctx.session.user.id)
  }),
})
