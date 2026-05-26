'use client'

import { trpc } from '@/components/providers/TRPCProvider'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EvaluationStatusBadge } from '@/components/shared/StatusBadge'
import {
  ClipboardList, Target, Users, TrendingUp,
  ArrowRight, Clock, CheckCircle2, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, getInitials, formatScore } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'

export function DashboardView() {
  const { data: session } = useSession()
  const role = session?.user?.role

  const { data: orgStats, isLoading: statsLoading } = trpc.report.orgStats.useQuery()
  const { data: myEvals } = trpc.evaluation.myEvaluations.useQuery()

  const currentEval = myEvals?.find(e =>
    ['NOT_STARTED', 'SELF_IN_PROGRESS', 'SELF_SUBMITTED', 'MANAGER_IN_PROGRESS'].includes(e.status)
  )

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Bonjour, {session?.user?.firstName} 👋
        </h2>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alert for pending action */}
      {currentEval && currentEval.status === 'NOT_STARTED' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Autoévaluation en attente
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              La campagne {currentEval.campaign.name} est ouverte. Commencez votre autoévaluation.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-300">
            <Link href={`/evaluations/${currentEval.id}`}>
              Commencer <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Campagnes actives"
          value={statsLoading ? '…' : orgStats?.activeCampaigns ?? 0}
          icon={ClipboardList}
          variant="primary"
          description="En cours cette année"
        />
        <StatsCard
          title="Évaluations en attente"
          value={statsLoading ? '…' : orgStats?.pendingEvaluations ?? 0}
          icon={Clock}
          variant="warning"
          description="À compléter"
        />
        <StatsCard
          title="Taux de complétion"
          value={statsLoading ? '…' : `${orgStats?.completionRate ?? 0}%`}
          icon={TrendingUp}
          variant="success"
          description="Progression globale"
        />
        <StatsCard
          title="Collaborateurs"
          value={statsLoading ? '…' : orgStats?.totalEmployees ?? 0}
          icon={Users}
          variant="default"
          description="Dans votre organisation"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mes évaluations récentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mes évaluations</CardTitle>
              <CardDescription>Suivi de vos campagnes d'évaluation</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/evaluations">
                Tout voir <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!myEvals || myEvals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune évaluation pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myEvals.slice(0, 5).map((evaluation) => (
                  <Link
                    key={evaluation.id}
                    href={`/evaluations/${evaluation.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{evaluation.campaign.name}</p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {evaluation.campaign.year}
                        </Badge>
                      </div>
                      <EvaluationStatusBadge status={evaluation.status} />
                    </div>
                    {evaluation.finalScore !== null && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{formatScore(evaluation.finalScore)}</p>
                        <p className="text-xs text-muted-foreground">Score final</p>
                      </div>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/objectives/new">
                  <Target className="mr-2 h-4 w-4 text-primary" />
                  Créer un objectif
                </Link>
              </Button>
              {['RH', 'ADMIN'].includes(role ?? '') && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/campaigns/new">
                    <ClipboardList className="mr-2 h-4 w-4 text-primary" />
                    Nouvelle campagne
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/development">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                  Plan de développement
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Completion gauge */}
          {orgStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progression globale</CardTitle>
                <CardDescription>Campagnes de l'année</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Complétées</span>
                    <span className="font-medium">{orgStats.completionRate}%</span>
                  </div>
                  <Progress value={orgStats.completionRate} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{orgStats.completedEvaluations} validées</span>
                    <span>{orgStats.pendingEvaluations} en cours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
