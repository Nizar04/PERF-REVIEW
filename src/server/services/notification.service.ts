import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

interface CreateNotificationOptions {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  metadata?: Record<string, unknown>
}

export class NotificationService {
  async create(opts: CreateNotificationOptions) {
    return prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link,
        metadata: opts.metadata as Record<string, string> | undefined,
      },
    })
  }

  async createMany(notifications: CreateNotificationOptions[]) {
    return prisma.notification.createMany({
      data: notifications.map(n => ({ ...n, metadata: n.metadata as Record<string, string> | undefined })),
    })
  }

  async findByUser(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    })
  }

  // Business notifications
  async notifyCampaignStarted(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        evaluations: {
          include: {
            evaluatee: { include: { user: true } },
            evaluator: { include: { user: true } },
          },
        },
      },
    })

    if (!campaign) return

    const notifications: CreateNotificationOptions[] = []

    for (const evaluation of campaign.evaluations) {
      // Notify evaluatee
      notifications.push({
        userId: evaluation.evaluatee.user.id,
        type: NotificationType.CAMPAIGN_STARTED,
        title: `Campagne d'évaluation ${campaign.year} lancée`,
        body: `La campagne "${campaign.name}" est maintenant ouverte. Vous pouvez commencer votre autoévaluation.`,
        link: `/evaluations/${evaluation.id}/self`,
        metadata: { campaignId, evaluationId: evaluation.id },
      })

      // Notify manager
      if (evaluation.evaluator) {
        notifications.push({
          userId: evaluation.evaluator.user.id,
          type: NotificationType.MANAGER_EVAL_DUE,
          title: `Évaluation à réaliser — Campagne ${campaign.year}`,
          body: `Vous avez une évaluation à compléter pour ${evaluation.evaluatee.user.firstName} ${evaluation.evaluatee.user.lastName}.`,
          link: `/evaluations/${evaluation.id}/manager`,
          metadata: { campaignId, evaluationId: evaluation.id },
        })
      }
    }

    await this.createMany(notifications)
  }

  async notifySelfEvalSubmitted(evaluationId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        evaluatee: { include: { user: true } },
        evaluator: { include: { user: true } },
        campaign: true,
      },
    })

    if (!evaluation?.evaluator) return

    await this.create({
      userId: evaluation.evaluator.user.id,
      type: NotificationType.SELF_EVAL_DUE,
      title: `Autoévaluation soumise`,
      body: `${evaluation.evaluatee.user.firstName} ${evaluation.evaluatee.user.lastName} a soumis son autoévaluation. Vous pouvez maintenant réaliser votre évaluation.`,
      link: `/evaluations/${evaluationId}/manager`,
      metadata: { evaluationId, campaignId: evaluation.campaignId },
    })
  }

  async notifyEvaluationValidated(evaluationId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        evaluatee: { include: { user: true } },
        campaign: true,
      },
    })

    if (!evaluation) return

    await this.create({
      userId: evaluation.evaluatee.user.id,
      type: NotificationType.EVALUATION_VALIDATED,
      title: `Votre évaluation a été validée`,
      body: `Votre évaluation pour la campagne "${evaluation.campaign.name}" a été validée par les RH.`,
      link: `/evaluations/${evaluationId}`,
      metadata: { evaluationId, campaignId: evaluation.campaignId },
    })
  }
}

export const notificationService = new NotificationService()
