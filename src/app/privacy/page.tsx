import Link from 'next/link'

export const metadata = { title: 'Politique de confidentialité' }

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground">Les données collectées sont utilisées uniquement dans le cadre de la gestion des évaluations de performance au sein de votre organisation.</p>
      <Link href="/login" className="text-sm text-primary underline">Retour</Link>
    </div>
  )
}
