"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X, Calendar, Users, Settings, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/components/providers/TRPCProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(3, "Minimum 3 caractères"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
  selfEvalDeadline: z.string().optional(),
  managerEvalDeadline: z.string().optional(),
  competencyIds: z.array(z.string()).min(1, "Sélectionnez au moins une compétence"),
  departmentIds: z.array(z.string()),
});
type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 1, title: "Informations", icon: Settings },
  { id: 2, title: "Période", icon: Calendar },
  { id: 3, title: "Compétences", icon: ListChecks },
  { id: 4, title: "Population", icon: Users },
];

function StepIndicator({ current, steps }: { current: number; steps: typeof STEPS }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isComplete = current > step.id;
        const isCurrent = current === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all text-sm font-medium",
                  isComplete && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 border-primary text-primary",
                  !isComplete && !isCurrent && "bg-background border-border text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn("text-xs font-medium", isCurrent ? "text-primary" : "text-muted-foreground")}>
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-16 h-0.5 mb-5 mx-1", current > step.id ? "bg-primary" : "bg-border")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function NewCampaignView() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);

  const { data: departments = [] } = trpc.user.departments.useQuery();
  // In a real app, competencies would come from the API
  const competencies = [
    { id: "comp-1", name: "Communication", category: "Soft Skills" },
    { id: "comp-2", name: "Leadership", category: "Management" },
    { id: "comp-3", name: "Travail en équipe", category: "Soft Skills" },
    { id: "comp-4", name: "Orienté résultats", category: "Performance" },
    { id: "comp-5", name: "Innovation", category: "Soft Skills" },
    { id: "comp-6", name: "Gestion du temps", category: "Organisation" },
    { id: "comp-7", name: "Expertise technique", category: "Technique" },
    { id: "comp-8", name: "Adaptabilité", category: "Soft Skills" },
  ];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { competencyIds: [], departmentIds: [] },
  });

  const selectedCompetencies = watch("competencyIds");
  const selectedDepts = watch("departmentIds");

  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: () => {
      toast.success("Campagne créée avec succès !");
      router.push("/campaigns");
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: FormData) => createCampaign.mutate({
    ...data,
    year: new Date(data.startDate).getFullYear(),
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    selfEvalDeadline: data.selfEvalDeadline ? new Date(data.selfEvalDeadline) : undefined,
    managerEvalDeadline: data.managerEvalDeadline ? new Date(data.managerEvalDeadline) : undefined,
  });

  function toggleItem(field: "competencyIds" | "departmentIds", id: string) {
    const current = field === "competencyIds" ? selectedCompetencies : selectedDepts;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setValue(field, next, { shouldValidate: true });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle campagne</h1>
          <p className="text-sm text-muted-foreground">Créez une nouvelle campagne d'évaluation</p>
        </div>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1 — Informations */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Donnez un nom et une description à votre campagne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom de la campagne *</label>
                <Input
                  {...register("name")}
                  placeholder="ex : Entretiens annuels 2025"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Décrivez les objectifs de cette campagne..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Période */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
              <CardDescription>Définissez les dates clés de la campagne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date de début *</label>
                  <Input type="date" {...register("startDate")} className={errors.startDate ? "border-destructive" : ""} />
                  {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date de fin *</label>
                  <Input type="date" {...register("endDate")} className={errors.endDate ? "border-destructive" : ""} />
                  {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Deadlines intermédiaires (optionnel)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Fin autoévaluation</label>
                    <Input type="date" {...register("selfEvalDeadline")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Fin évaluation manager</label>
                    <Input type="date" {...register("managerEvalDeadline")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Compétences */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Compétences évaluées</CardTitle>
              <CardDescription>Sélectionnez les compétences à évaluer dans cette campagne</CardDescription>
            </CardHeader>
            <CardContent>
              {errors.competencyIds && (
                <p className="text-xs text-destructive mb-3">{errors.competencyIds.message}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {competencies.map((comp) => {
                  const selected = selectedCompetencies.includes(comp.id);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleItem("competencyIds", comp.id)}
                      className={cn(
                        "text-left p-3 rounded-lg border-2 transition-all",
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="font-medium text-sm">{comp.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{comp.category}</div>
                      {selected && (
                        <Check className="h-3.5 w-3.5 text-primary float-right -mt-5" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedCompetencies.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {selectedCompetencies.length} compétence(s) sélectionnée(s)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4 — Population */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Population cible</CardTitle>
              <CardDescription>
                Sélectionnez les départements concernés, ou laissez vide pour tous les employés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {departments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Aucun département configuré — tous les employés seront inclus
                  </p>
                ) : (
                  departments.map((dept: { id: string; name: string }) => {
                    const selected = selectedDepts.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleItem("departmentIds", dept.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-between",
                          selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        <span className="font-medium text-sm">{dept.name}</span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>
              {selectedDepts.length === 0 && departments.length > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠ Aucun département sélectionné → tous les employés seront inclus
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>

          {step < STEPS.length ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)} className="gap-2">
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || createCampaign.isPending} className="gap-2">
              {(isSubmitting || createCampaign.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer la campagne
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
