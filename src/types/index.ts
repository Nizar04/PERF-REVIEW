import type { 
  User, Employee, Campaign, Evaluation, Objective, 
  CompetencyRating, Competency, Department, Organization,
  DevelopmentPlan, DevelopmentAction, Notification, AuditLog
} from '@prisma/client'

// ============================================================
// RE-EXPORTS PRISMA
// ============================================================
export type {
  User, Employee, Campaign, Evaluation, Objective,
  CompetencyRating, Competency, Department, Organization,
  DevelopmentPlan, DevelopmentAction, Notification, AuditLog
}

// ============================================================
// TYPES ÉTENDUS
// ============================================================

export type UserWithEmployee = User & {
  employee: (Employee & {
    department: Department | null
    manager: (Employee & { user: User }) | null
    subordinates: (Employee & { user: User })[]
  }) | null
}

export type EvaluationWithRelations = Evaluation & {
  campaign: Campaign
  evaluatee: Employee & { user: User }
  evaluator: (Employee & { user: User }) | null
  competencyRatings: (CompetencyRating & { competency: Competency })[]
  objectives: ObjectiveEvaluationWithRelation[]
  developmentPlan: (DevelopmentPlan & { actions: DevelopmentAction[] }) | null
}

export type ObjectiveEvaluationWithRelation = {
  id: string
  evaluationId: string
  objectiveId: string
  selfProgress: number | null
  selfScore: number | null
  selfComment: string | null
  managerProgress: number | null
  managerScore: number | null
  managerComment: string | null
  objective: Objective
}

export type CampaignWithStats = Campaign & {
  _count: {
    evaluations: number
  }
  stats?: {
    total: number
    notStarted: number
    inProgress: number
    completed: number
    completionRate: number
  }
}

// ============================================================
// PAGINATION
// ============================================================

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ============================================================
// API RESPONSE
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface DashboardStats {
  activeCampaigns: number
  pendingEvaluations: number
  completionRate: number
  teamSize?: number
  overdueTasks: number
}

export interface ReportingData {
  completionByDepartment: {
    department: string
    total: number
    completed: number
    rate: number
  }[]
  scoreDistribution: {
    range: string
    count: number
  }[]
  statusBreakdown: {
    status: string
    count: number
  }[]
  monthlyTrend: {
    month: string
    completions: number
  }[]
}
