"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [showPassword, setShowPassword] = React.useState(false);
  const [ssoLoading, setSsoLoading] = React.useState<"google" | "azure" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Email ou mot de passe incorrect");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleSSO(provider: "google" | "azure-ad") {
    setSsoLoading(provider === "google" ? "google" : "azure");
    await signIn(provider, { callbackUrl });
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-2">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">PerfReview</h1>
        <p className="text-sm text-muted-foreground">Plateforme d'évaluation des performances</p>
      </div>

      <Card className="shadow-lg border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace de travail</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* SSO Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSSO("google")}
              disabled={!!ssoLoading || isSubmitting}
              className="gap-2"
            >
              {ssoLoading === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSSO("azure-ad")}
              disabled={!!ssoLoading || isSubmitting}
              className="gap-2"
            >
              {ssoLoading === "azure" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M11.4 24H0l8.8-15.2L11.4 24z" fill="#0078D4" />
                  <path d="M13.2 17.6L6.8 6l6.4 2.4L24 20H13.2v-2.4z" fill="#0078D4" opacity=".8" />
                  <path d="M6.8 6L13.2 17.6H13L6.4 8.4 6.8 6z" fill="#0078D4" opacity=".5" />
                  <path d="M24 20L13.2 17.6 19.6 6 24 20z" fill="#0078D4" opacity=".3" />
                </svg>
              )}
              Microsoft
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">ou avec vos identifiants</span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="vous@entreprise.com"
                  className={cn("pl-9", errors.email && "border-destructive")}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Mot de passe</label>
                <a href="/forgot-password" className="text-xs text-primary hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={cn("pl-9 pr-9", errors.password && "border-destructive")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
        </CardContent>

        <CardFooter className="pt-0">
          <p className="text-xs text-muted-foreground text-center w-full">
            En vous connectant, vous acceptez nos{" "}
            <a href="/terms" className="text-primary hover:underline">conditions d'utilisation</a>
            {" "}et notre{" "}
            <a href="/privacy" className="text-primary hover:underline">politique de confidentialité</a>.
          </p>
        </CardFooter>
      </Card>

      {/* Demo hint */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Démo : <code className="bg-muted px-1 py-0.5 rounded text-xs">admin@demo.com</code> / <code className="bg-muted px-1 py-0.5 rounded text-xs">Demo1234!</code>
        </p>
      </div>
    </div>
  );
}
