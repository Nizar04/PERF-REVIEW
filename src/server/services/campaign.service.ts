import { prisma } from '@/lib/prisma'
import type { CreateCampaignInput, UpdateCampaignInput } from '@/lib/validations/campaign'
import type { PaginationParams, PaginatedResponse, CampaignWithStats } from '@/types'
import { CampaignStatus, EvaluationStatus } from '@prisma/client'

export class CampaignService {
  async findAll(
    organizationId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<CampaignWithStats>> {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = params
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [total, campaigns] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { evaluations: true } },
        },
      }),
    ])

    // Enrich with completion stats
    const enriched = await Promise.all(
      campaigns.map(async (campaign) => {
        const evalStats = await prisma.evaluation.groupBy({
          by: ['status'],
          where: { campaignId: campaign.id },
          _count: true,
        })

        const total_evals = evalStats.reduce((sum, s) => sum + s._count, 0)
        const completed = evalStats
          .filter(s => ['VALIDATED', 'SIGNED', 'CLOSED'].includes(s.status))
          .reduce((sum, s) => sum + s._count, 0)

        return {
          ...campaign,
          stats: {
            total: total_evals,
            notStarted: evalStats.find(s => s.status === EvaluationStatus.NOT_STARTED)?._count ?? 0,
            inProgress: evalStats.filter(s =>
              ([EvaluationStatus.SELF_IN_PROGRESS, EvaluationStatus.SELF_SUBMITTED,
               EvaluationStatus.MANAGER_IN_PROGRESS, EvaluationStatus.MANAGER_SUBMITTED] as EvaluationStatus[]).includes(s.status)
            ).reduce((sum, s) => sum + s._count, 0),
            completed,
            completionRate: total_evals > 0 ? Math.round((completed / total_evals) * 100) : 0,
          },
        } as CampaignWithStats
      })
    )

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }
  }

  async findById(id: string, organizationId: string) {
    return prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        campaignCompetencies: {
          include: { competency: true },
          orderBy: { orderIndex: 'asc' },
        },
        campaignPopulations: true,
        _count: { select: { evaluations: true } },
      },
    })
  }

  async create(data: CreateCampaignInput, createdById: string, organizationId: string) {
    const { departmentIds, competencyIds, ...campaignData } = data

    return prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          ...campaignData,
          organizationId,
          createdById,
        },
      })

      // Associate competencies
      if (competencyIds?.length) {
        await tx.campaignCompetency.createMany({
          data: competencyIds.map((competencyId, idx) => ({
            campaignId: campaign.id,
            competencyId,
            orderIndex: idx,
          })),
        })
      }

      // Associate departments/populations
      if (departmentIds?.length) {
        await tx.campaignPopulation.createMany({
          data: departmentIds.map(departmentId => ({
            campaignId: campaign.id,
            departmentId,
          })),
        })
      }

      return campaign
    })
  }

  async update(id: string, data: UpdateCampaignInput, organizationId: string) {
    const existing = await this.findById(id, organizationId)
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND')
    if (existing.status === CampaignStatus.ARCHIVED) {
      throw new Error('CAMPAIGN_ARCHIVED')
    }

    const { departmentIds, competencyIds, ...updateData } = data

    return prisma.campaign.update({
      where: { id },
      data: updateData,
    })
  }

  async activate(id: string, organizationId: string) {
    const campaign = await this.findById(id, organizationId)
    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND')
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new Error('CAMPAIGN_NOT_DRAFT')
    }

    return prisma.$transaction(async (tx) => {
      // Get all employees in population
      const populations = await tx.campaignPopulation.findMany({
        where: { campaignId: id },
      })

      let employees: { id: string; managerId: string | null }[] = []

      if (populations.length === 0) {
        // All employees in org
        const orgUsers = await tx.user.findMany({
          where: { organizationId, isActive: true, deletedAt: null },
          include: { employee: { select: { id: true, managerId: true } } },
        })
        employees = orgUsers.flatMap(u => u.employee ? [u.employee] : [])
      } else {
        const deptIds = populations
          .filter(p => p.departmentId)
          .map(p => p.departmentId!)
        const deptEmployees = await tx.employee.findMany({
          where: { departmentId: { in: deptIds }, deletedAt: null },
          select: { id: true, managerId: true },
        })
        employees = deptEmployees
      }

      // Create evaluations for each employee
      if (employees.length > 0) {
        await tx.evaluation.createMany({
          data: employees.map(emp => ({
            campaignId: id,
            evaluateeId: emp.id,
            evaluatorId: emp.managerId,
            status: EvaluationStatus.NOT_STARTED,
          })),
          skipDuplicates: true,
        })
      }

      return tx.campaign.update({
        where: { id },
        data: { status: CampaignStatus.ACTIVE },
      })
    })
  }

  async softDelete(id: string, organizationId: string) {
    const existing = await this.findById(id, organizationId)
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND')
    if (existing.status === CampaignStatus.ACTIVE) {
      throw new Error('CANNOT_DELETE_ACTIVE_CAMPAIGN')
    }

    return prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}

export const campaignService = new CampaignService()
