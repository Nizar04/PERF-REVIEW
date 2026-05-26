'use client'

import { useState } from 'react'
import { trpc } from '@/components/providers/TRPCProvider'
import { useSession } from 'next-auth/react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EvaluationStatusBadge } from '@/components/shared/StatusBadge'
import { selfEvaluationSchema, type SelfEvaluationInput } from '@/lib/validations/evaluation'
import { formatDate, formatScore, getInitials, scoreToLabel, scoreToColor, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  User, Star, Target, MessageSquare,
  CheckCircle, Save, Send, ArrowLeft, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props { id: string }

const SCORE_LABELS = ['', 'Insuffisant', 'À améliorer', 'Répond aux attentes', 'Dépasse les attentes', 'Exceptionnel']
const SCORE_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']

function ScoreSelector({
  value,
  onChange,
  readonly = false,
}: {
  value: number | null
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(score)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium border transition-all',
            value === score
              ? `${SCORE_COLORS[score]} text-white border-transparent`
              : 'border-border hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60'
          )}
          title={SCORE_LABELS[score]}
        >
          {score}
        </button>
      ))}
      {value !== null && value !== undefined && (
        <span className="ml-2 text-xs text-muted-foreground">{SCORE_LABELS[value ?? 0]}</span>
      )}
    </div>
  )
}

export function EvaluationDetailView({ id }: Props) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const utils = trpc.useUtils()
  const [showWorkflow, setShowWorkflow] = useState(false)

  const { data: evaluation, isLoading } = trpc.evaluation.byId.useQuery({ id })

  const saveSelfMutation = trpc.evaluation.saveSelf.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: variables.isDraft ? '✓ Brouillon sauvegardé' : '✓ Autoévaluation soumise',
        description: variables.isDraft
          ? 'Votre progression est sauvegardée.'
          : 'Votre évaluation a été envoyée à votre manager.',
      })
      utils.evaluation.byId.invalidate({ id })
      if (!variables.isDraft) router.push('/evaluations')
    },
    onError: (err) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const saveManagerMutation = trpc.evaluation.saveManager.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: variables.isDraft ? '✓ Brouillon sauvegardé' : '✓ Évaluation soumise aux RH',
      })
      utils.evaluation.byId.invalidate({ id })
    },
    onError: (err) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const hrValidateMutation = trpc.evaluation.hrValidate.useMutation({
    onSuccess: () => {
      toast({ title: '✓ Validation enregistrée' })
      utils.evaluation.byId.invalidate({ id })
    },
    onError: (err) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const [selfComments, setSelfComments] = useState({
    strengths: evaluation?.selfStrengths ?? '',
    improvements: evaluation?.selfImprovements ?? '',
    general: evaluation?.selfComments ?? '',
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!evaluation) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Évaluation introuvable.</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/evaluations">Retour aux évaluations</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const userId = session?.user?.id
  const role = session?.user?.role ?? ''
  const isEvaluatee = evaluation.evaluatee.user.id === userId
  const isEvaluator = evaluation.evaluator?.user.id === userId
  const isHrOrAdmin = ['RH', 'ADMIN'].includes(role)

  // Determine what actions are available
  const canSelfEval = isEvaluatee &&
    ['NOT_STARTED', 'SELF_IN_PROGRESS'].includes(evaluation.status)
  const canManagerEval = isEvaluator &&
    ['SELF_SUBMITTED', 'MANAGER_IN_PROGRESS'].includes(evaluation.status)
  const canHRValidate = isHrOrAdmin &&
    ['MANAGER_SUBMITTED', 'HR_REVIEW', 'CALIBRATION'].includes(evaluation.status)

  // Local state for scores
  const [competencyScores, setCompetencyScores] = useState<Record<string, { selfScore?: number; managerScore?: number; selfComment?: string; managerComment?: string }>>(() => {
    const initial: Record<string, { selfScore?: number; managerScore?: number; selfComment?: string; managerComment?: string }> = {}
    evaluation.competencyRatings.forEach((r) => {
      initial[r.competencyId] = {
        selfScore: r.selfScore ?? undefined,
        managerScore: r.managerScore ?? undefined,
        selfComment: r.selfComment ?? undefined,
        managerComment: r.managerComment ?? undefined,
      }
    })
    return initial
  })

  const [objectiveScores, setObjectiveScores] = useState<Record<string, { selfProgress?: number; managerProgress?: number; selfComment?: string; managerComment?: string }>>(() => {
    const initial: Record<string, { selfProgress?: number; managerProgress?: number; selfComment?: string; managerComment?: string }> = {}
    evaluation.objectives.forEach((o) => {
      initial[o.objectiveId] = {
        selfProgress: o.selfProgress ?? undefined,
        managerProgress: o.managerProgress ?? undefined,
        selfComment: o.selfComment ?? undefined,
        managerComment: o.managerComment ?? undefined,
      }
    })
    return initial
  })

  const handleSaveSelf = (isDraft: boolean) => {
    const competencies = evaluation.campaign.campaignCompetencies.map((cc) => ({
      competencyId: cc.competencyId,
      selfScore: competencyScores[cc.competencyId]?.selfScore ?? 3,
      selfComment: competencyScores[cc.competencyId]?.selfComment,
    }))

    const objectives = evaluation.objectives.map((o) => ({
      objectiveId: o.objectiveId,
      selfProgress: objectiveScores[o.objectiveId]?.selfProgress ?? 0,
      selfScore: undefined,
      selfComment: objectiveScores[o.objectiveId]?.selfComment,
    }))

    saveSelfMutation.mutate({
      evaluationId: id,
      selfStrengths: selfComments.strengths,
      selfImprovements: selfComments.improvements,
      selfComments: selfComments.general,
      competencyRatings: competencies,
      objectiveEvaluations: objectives,
      isDraft,
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/evaluations">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Link>
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={evaluation.evaluatee.user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                {getInitials(evaluation.evaluatee.user.firstName, evaluation.evaluatee.user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">
                  {evaluation.evaluatee.user.firstName} {evaluation.evaluatee.user.lastName}
                </h2>
                <EvaluationStatusBadge status={evaluation.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {evaluation.evaluatee.jobTitle ?? 'Collaborateur'} · {evaluation.evaluatee.department?.name ?? ''}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Campagne: {evaluation.campaign.name}
                </span>
                {evaluation.evaluator && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Manager: {evaluation.evaluator.user.firstName} {evaluation.evaluator.user.lastName}
                  </span>
                )}
              </div>
            </div>
            {evaluation.finalScore !== null && (
              <div className="text-right shrink-0">
                <div className="text-3xl font-bold text-primary">{evaluation.finalScore?.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Score final / 5</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compétences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-amber-500" />
            Évaluation des compétences
          </CardTitle>
          <CardDescription>
            {evaluation.campaign.campaignCompetencies.length} compétence(s) à évaluer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {evaluation.campaign.campaignCompetencies.map(({ competency }) => {
            const scores = competencyScores[competency.id] ?? {}
            const rating = evaluation.competencyRatings.find(r => r.competencyId === competency.id)

            return (
              <div key={competency.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{competency.name}</p>
                    {competency.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{competency.description}</p>
                    )}
                    {competency.category && (
                      <Badge variant="outline" className="mt-1 text-xs">{competency.category}</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Self score */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Autoévaluation
                    </p>
                    <ScoreSelector
                      value={scores.selfScore ?? null}
                      onChange={canSelfEval ? (v) => setCompetencyScores(prev => ({
                        ...prev,
                        [competency.id]: { ...prev[competency.id], selfScore: v },
                      })) : undefined}
                      readonly={!canSelfEval}
                    />
                    {canSelfEval && (
                      <textarea
                        className="w-full text-xs rounded-md border p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                        rows={2}
                        placeholder="Commentaire..."
                        value={scores.selfComment ?? ''}
                        onChange={(e) => setCompetencyScores(prev => ({
                          ...prev,
                          [competency.id]: { ...prev[competency.id], selfComment: e.target.value },
                        }))}
                      />
                    )}
                    {!canSelfEval && rating?.selfComment && (
                      <p className="text-xs text-muted-foreground italic">"{rating.selfComment}"</p>
                    )}
                  </div>

                  {/* Manager score */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Évaluation manager
                    </p>
                    <ScoreSelector
                      value={scores.managerScore ?? null}
                      onChange={canManagerEval ? (v) => setCompetencyScores(prev => ({
                        ...prev,
                        [competency.id]: { ...prev[competency.id], managerScore: v },
                      })) : undefined}
                      readonly={!canManagerEval}
                    />
                    {!canManagerEval && rating?.managerComment && (
                      <p className="text-xs text-muted-foreground italic">"{rating.managerComment}"</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Objectifs */}
      {evaluation.objectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Évaluation des objectifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluation.objectives.map(({ objective, objectiveId, selfProgress, managerProgress, selfComment, managerComment }) => {
              const scores = objectiveScores[objectiveId] ?? {}

              return (
                <div key={objectiveId} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{objective.title}</p>
                      {objective.kpi && (
                        <p className="text-xs text-muted-foreground">KPI: {objective.kpi}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      Poids: {objective.weight}x
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Avancement (auto)
                      </p>
                      {canSelfEval ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={scores.selfProgress ?? 0}
                              onChange={(e) => setObjectiveScores(prev => ({
                                ...prev,
                                [objectiveId]: { ...prev[objectiveId], selfProgress: Number(e.target.value) },
                              }))}
                              className="flex-1 h-2 accent-primary"
                            />
                            <span className="text-sm font-medium w-10 text-right">
                              {scores.selfProgress ?? 0}%
                            </span>
                          </div>
                          <Progress value={scores.selfProgress ?? 0} className="h-1.5" />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Progress value={selfProgress ?? 0} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{selfProgress ?? 0}%</p>
                          {selfComment && <p className="text-xs italic text-muted-foreground">"{selfComment}"</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Avancement (manager)
                      </p>
                      {canManagerEval ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={scores.managerProgress ?? 0}
                              onChange={(e) => setObjectiveScores(prev => ({
                                ...prev,
                                [objectiveId]: { ...prev[objectiveId], managerProgress: Number(e.target.value) },
                              }))}
                              className="flex-1 h-2 accent-primary"
                            />
                            <span className="text-sm font-medium w-10 text-right">
                              {scores.managerProgress ?? 0}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Progress value={managerProgress ?? 0} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{managerProgress ?? 0}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Commentaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Commentaires généraux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Self comments */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Autoévaluation</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['Mes points forts', 'Axes d\'amélioration', 'Commentaire général'] as const).map((label, idx) => {
                const keys = ['strengths', 'improvements', 'general'] as const
                const key = keys[idx]

                return (
                  <div key={label} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <textarea
                      className="w-full text-sm rounded-md border p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                      rows={4}
                      disabled={!canSelfEval}
                      value={canSelfEval ? selfComments[key] : (
                        key === 'strengths' ? evaluation.selfStrengths ?? '' :
                        key === 'improvements' ? evaluation.selfImprovements ?? '' :
                        evaluation.selfComments ?? ''
                      )}
                      onChange={(e) => setSelfComments(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Manager comments (readonly for non-managers) */}
          {(isEvaluator || isHrOrAdmin || evaluation.status === 'VALIDATED') && (
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-semibold">Évaluation manager</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Points forts</label>
                  <div className="text-sm rounded-md border p-2 min-h-[80px] bg-muted/30 whitespace-pre-wrap">
                    {evaluation.managerStrengths ?? <span className="text-muted-foreground italic">—</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Axes d'amélioration</label>
                  <div className="text-sm rounded-md border p-2 min-h-[80px] bg-muted/30 whitespace-pre-wrap">
                    {evaluation.managerImprovements ?? <span className="text-muted-foreground italic">—</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Commentaire général</label>
                  <div className="text-sm rounded-md border p-2 min-h-[80px] bg-muted/30 whitespace-pre-wrap">
                    {evaluation.managerComments ?? <span className="text-muted-foreground italic">—</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow history */}
      {evaluation.workflowHistory.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowWorkflow(!showWorkflow)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Historique du workflow</CardTitle>
              {showWorkflow ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {showWorkflow && (
            <CardContent>
              <div className="space-y-2">
                {evaluation.workflowHistory.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{h.toStatus}</span>
                      {h.comment && <span className="text-muted-foreground"> — {h.comment}</span>}
                      <p className="text-xs text-muted-foreground">{formatDate(h.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pb-6">
        {canSelfEval && (
          <>
            <Button
              variant="outline"
              onClick={() => handleSaveSelf(true)}
              disabled={saveSelfMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder brouillon
            </Button>
            <Button
              onClick={() => {
                if (confirm('Soumettre votre autoévaluation ? Cette action ne peut pas être annulée.')) {
                  handleSaveSelf(false)
                }
              }}
              disabled={saveSelfMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Soumettre l'autoévaluation
            </Button>
          </>
        )}

        {canHRValidate && (
          <Button
            onClick={() => hrValidateMutation.mutate({
              evaluationId: id,
              action: 'VALIDATE',
            })}
            disabled={hrValidateMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Valider l'évaluation
          </Button>
        )}
      </div>
    </div>
  )
}
