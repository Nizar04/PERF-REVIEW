import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export const metadata = { title: 'Développement' }

export default function DevelopmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan de développement</h1>
        <p className="text-sm text-muted-foreground mt-1">Vos actions de formation et développement</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Fonctionnalité à venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Le plan de développement individuel sera disponible après la validation de votre évaluation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
