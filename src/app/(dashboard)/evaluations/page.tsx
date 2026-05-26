import type { Metadata } from 'next'
import { EvaluationsView } from './EvaluationsView'

export const metadata: Metadata = { title: 'Mes évaluations' }
export default function EvaluationsPage() { return <EvaluationsView /> }
