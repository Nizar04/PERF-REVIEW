import { prisma } from '@/lib/prisma'
import type { ReportingData } from '@/types'

export class ReportService {
  async getCampaignReport(campaignId: string): Promise<ReportingData> {
    const evaluations = await prisma.evaluation.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        evaluatee: {
          include: {
            department: true,
            user: true,
          },
        },
      },
    })

    // Completion by department
    const byDept: Record<string, { total: number; completed: number }> = {}
    for (const ev of evaluations) {
      const deptName = ev.evaluatee.department?.name ?? 'Sans département'
      if (!byDept[deptName]) byDept[deptName] = { total: 0, completed: 0 }
      byDept[deptName].total++
      if (['VALIDATED', 'SIGNED', 'CLOSED'].includes(ev.status)) {
        byDept[deptName].completed++
      }
    }

    const completionByDepartment = Object.entries(byDept).map(([dept, data]) => ({
      department: dept,
      ...data,
      rate: Math.round((data.completed / data.total) * 100),
    }))

    // Score distribution
    const scores = evaluations
      .map(ev => ev.finalScore ?? ev.managerScore ?? ev.selfScore)
      .filter((s): s is number => s !== null)

    const scoreDistribution = [
      { range: '1-2', count: scores.filter(s => s >= 1 && s < 2).length },
      { range: '2-3', count: scores.filter(s => s >= 2 && s < 3).length },
      { range: '3-4', count: scores.filter(s => s >= 3 && s < 4).length },
      { range: '4-5', count: scores.filter(s => s >= 4 && s <= 5).length },
    ]

    // Status breakdown
    const statusCount: Record<string, number> = {}
    for (const ev of evaluations) {
      statusCount[ev.status] = (statusCount[ev.status] ?? 0) + 1
    }
    const statusBreakdown = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }))

    // Monthly trend (last 6 months)
    const monthlyTrend = await this.getMonthlyCompletionTrend(campaignId)

    return {
      completionByDepartment,
      scoreDistribution,
      statusBreakdown,
      monthlyTrend,
    }
  }

  async getOrganizationReport(organizationId: string) {
    const currentYear = new Date().getFullYear()

    const [activeCampaigns, totalEmployees, pendingEvaluations, completedEvaluations] =
      await Promise.all([
        prisma.campaign.count({
          where: { organizationId, status: 'ACTIVE', deletedAt: null },
        }),
        prisma.employee.count({
          where: { user: { organizationId }, deletedAt: null },
        }),
        prisma.evaluation.count({
          where: {
            campaign: { organizationId, year: currentYear },
            status: { in: ['NOT_STARTED', 'SELF_IN_PROGRESS', 'SELF_SUBMITTED', 'MANAGER_IN_PROGRESS'] },
          },
        }),
        prisma.evaluation.count({
          where: {
            campaign: { organizationId, year: currentYear },
            status: { in: ['VALIDATED', 'SIGNED', 'CLOSED'] },
          },
        }),
      ])

    const completionRate =
      completedEvaluations + pendingEvaluations > 0
        ? Math.round((completedEvaluations / (completedEvaluations + pendingEvaluations)) * 100)
        : 0

    return {
      activeCampaigns,
      totalEmployees,
      pendingEvaluations,
      completedEvaluations,
      completionRate,
    }
  }

  private async getMonthlyCompletionTrend(campaignId: string) {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      return date
    })

    const trend = await Promise.all(
      months.map(async (date) => {
        const start = new Date(date.getFullYear(), date.getMonth(), 1)
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const completions = await prisma.evaluation.count({
          where: {
            campaignId,
            status: { in: ['VALIDATED', 'SIGNED', 'CLOSED'] },
            updatedAt: { gte: start, lte: end },
          },
        })

        return {
          month: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          completions,
        }
      })
    )

    return trend
  }
}

export const reportService = new ReportService()
