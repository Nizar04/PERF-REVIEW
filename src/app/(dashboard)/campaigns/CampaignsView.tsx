'use client'

import { useState } from 'react'
import { trpc } from '@/components/providers/TRPCProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CampaignStatusBadge } from '@/components/shared/StatusBadge'
import { Plus, Play, Trash2, Eye, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

export function CampaignsView() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.campaign.list.useQuery({ page: 1, limit: 20 })

  const activateMutation = trpc.campaign.activate.useMutation({
    onSuccess: () => {
      toast({ title: 'Campagne activée', description: 'Les évaluations ont été créées et les notifications envoyées.' })
      utils.campaign.list.invalidate()
    },
    onError: (err) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = trpc.campaign.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Campagne supprimée' })
      utils.campaign.list.invalidate()
    },
    onError: (err) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
  })

  const canManage = ['RH', 'ADMIN'].includes(role ?? '')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} campagne(s) au total
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.data.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{campaign.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {campaign.year}
                    </CardDescription>
                  </div>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                {campaign.stats && campaign.stats.total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {campaign.stats.completed}/{campaign.stats.total}
                      </span>
                      <span className="font-medium">{campaign.stats.completionRate}%</span>
                    </div>
                    <Progress value={campaign.stats.completionRate} className="h-1.5" />
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Début</p>
                    <p>{formatDate(campaign.startDate)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Fin</p>
                    <p>{formatDate(campaign.endDate)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Eye className="mr-1.5 h-3 w-3" />
                      Détails
                    </Link>
                  </Button>
                  {canManage && campaign.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => activateMutation.mutate({ id: campaign.id })}
                      disabled={activateMutation.isPending}
                    >
                      <Play className="mr-1.5 h-3 w-3" />
                      Activer
                    </Button>
                  )}
                  {canManage && campaign.status === 'DRAFT' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Supprimer cette campagne ?')) {
                          deleteMutation.mutate({ id: campaign.id })
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {data?.data.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Aucune campagne</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez votre première campagne d'évaluation annuelle.
              </p>
              {canManage && (
                <Button asChild>
                  <Link href="/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une campagne
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
