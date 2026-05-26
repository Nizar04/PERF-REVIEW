import Link from 'next/link'

export const metadata = { title: "Conditions d'utilisation" }

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">{"Conditions d'utilisation"}</h1>
      <p className="text-sm text-muted-foreground">En utilisant cette plateforme, vous acceptez de respecter les règles d&apos;utilisation définies par votre organisation.</p>
      <Link href="/login" className="text-sm text-primary underline">Retour</Link>
    </div>
  )
}
