import type { Metadata } from 'next'
import { EvaluationDetailView } from './EvaluationDetailView'

export const metadata: Metadata = { title: 'Évaluation' }

export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EvaluationDetailView id={id} />
}
