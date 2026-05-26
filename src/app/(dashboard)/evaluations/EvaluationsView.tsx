'use client'

import { trpc } from '@/components/providers/TRPCProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EvaluationStatusBadge } from '@/components/shared/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, ClipboardList, Star } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatScore, getInitials } from '@/lib/utils'
import { useSession } from 'next-auth/react'

const STATUS_PROGRESS: Record<string, number> = {
  NOT_STARTED: 0,
  SELF_IN_PROGRESS: 25,
  SELF_SUBMITTED: 40,
  MANAGER_IN_PROGRESS: 60,
  MANAGER_SUBMITTED: 70,
  HR_REVIEW: 80,
  CALIBRATION: 85,
  VALIDATED: 95,
  SIGNED: 100,
  CLOSED: 100,
}

export function EvaluationsView() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isManagerOrHR = ['MANAGER', 'RH', 'ADMIN'].includes(role ?? '')

  const { data: myEvals, isLoading: myLoading } = trpc.evaluation.myEvaluations.useQuery()
  const { data: teamEvals, isLoading: teamLoading } = trpc.evaluation.teamEvaluations.useQuery(
    {},
    { enabled: isManagerOrHR }
  )

  return (
    <div className="space-y-6">
      {/* Mes évaluations */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Mes évaluations</h2>

        {myLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : myEvals?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune évaluation assignée pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myEvals?.map((evaluation) => (
              <Card key={evaluation.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-sm">{evaluation.campaign.name}</span>
                        <Badge variant="outline" className="text-xs">{evaluation.campaign.year}</Badge>
                        <EvaluationStatusBadge status={evaluation.status} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progression du workflow</span>
                          <span>{STATUS_PROGRESS[evaluation.status]}%</span>
                        </div>
                        <Progress value={STATUS_PROGRESS[evaluation.status]} className="h-1.5" />
                      </div>
                      {evaluation.finalScore !== null && (
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium">Score final: {formatScore(evaluation.finalScore)}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/evaluations/${evaluation.id}`}>
                        Ouvrir
                        <ArrowRight className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Évaluations de mon équipe */}
      {isManagerOrHR && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Évaluations à réaliser
            {teamEvals && teamEvals.length > 0 && (
              <Badge variant="secondary" className="ml-2">{teamEvals.length}</Badge>
            )}
          </h2>

          {teamLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : teamEvals?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-muted-foreground">Aucune évaluation d'équipe en attente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {teamEvals?.map((evaluation) => (
                <Card key={evaluation.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={evaluation.evaluatee.user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(evaluation.evaluatee.user.firstName, evaluation.evaluatee.user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {evaluation.evaluatee.user.firstName} {evaluation.evaluatee.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evaluation.campaign.name} · {evaluation.evaluatee.department?.name ?? 'Sans département'}
                        </p>
                      </div>
                      <EvaluationStatusBadge status={evaluation.status} />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/evaluations/${evaluation.id}`}>
                          Évaluer
                          <ArrowRight className="ml-1.5 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
