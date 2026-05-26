import { Badge } from '@/components/ui/badge'
import type { EvaluationStatus, CampaignStatus } from '@prisma/client'

const EVALUATION_STATUS_CONFIG: Record<
  EvaluationStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline' | 'destructive' }
> = {
  NOT_STARTED: { label: 'Non démarré', variant: 'outline' },
  SELF_IN_PROGRESS: { label: 'Auto-éval. en cours', variant: 'info' },
  SELF_SUBMITTED: { label: 'Auto-éval. soumise', variant: 'info' },
  MANAGER_IN_PROGRESS: { label: 'Éval. manager en cours', variant: 'warning' },
  MANAGER_SUBMITTED: { label: 'Éval. manager soumise', variant: 'warning' },
  HR_REVIEW: { label: 'En revue RH', variant: 'secondary' },
  CALIBRATION: { label: 'Calibration', variant: 'secondary' },
  VALIDATED: { label: 'Validé', variant: 'success' },
  SIGNED: { label: 'Signé', variant: 'success' },
  CLOSED: { label: 'Clôturé', variant: 'default' },
}

const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline' | 'destructive' }
> = {
  DRAFT: { label: 'Brouillon', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'success' },
  CALIBRATION: { label: 'Calibration', variant: 'warning' },
  CLOSED: { label: 'Clôturée', variant: 'secondary' },
  ARCHIVED: { label: 'Archivée', variant: 'default' },
}

export function EvaluationStatusBadge({ status }: { status: EvaluationStatus }) {
  const config = EVALUATION_STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = CAMPAIGN_STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
