import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export const metadata = { title: 'Mot de passe oublié' }

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Contactez votre administrateur pour réinitialiser votre mot de passe.
          </p>
          <Link href="/login" className="text-sm text-primary underline">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
