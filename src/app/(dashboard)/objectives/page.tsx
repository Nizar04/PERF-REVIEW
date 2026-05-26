"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ObjectiveStatus } from "@prisma/client";
import { Plus, Target, Loader2, ChevronRight, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/components/providers/TRPCProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const objectiveSchema = z.object({
  title: z.string().min(3, "Minimum 3 caractères"),
  description: z.string().optional(),
  weight: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  kpi: z.string().optional(),
});
type ObjectiveForm = z.infer<typeof objectiveSchema>;

const STATUS_CONFIG: Record<ObjectiveStatus, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  ACTIVE: { label: "En cours", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  COMPLETED: { label: "Atteint", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function ObjectivesPage() {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);

  const { data: objectives = [], isLoading } = trpc.objective.myObjectives.useQuery({});

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
  });

  const create = trpc.objective.create.useMutation({
    onSuccess: () => {
      toast.success("Objectif créé");
      utils.objective.myObjectives.invalidate();
      reset(); setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteObj = trpc.objective.delete.useMutation({
    onSuccess: () => {
      toast.success("Objectif supprimé");
      utils.objective.myObjectives.invalidate();
    },
  });

  const onSubmit = (data: ObjectiveForm) => create.mutate({
    ...data,
    year: new Date().getFullYear(),
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  });

  const totalWeight = objectives.reduce((s: number, o: { weight?: number | null }) => s + (o.weight ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes objectifs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {objectives.length} objectif(s) — poids total :{" "}
            <span className={totalWeight !== 100 && objectives.length > 0 ? "text-amber-600 font-medium" : "font-medium"}>
              {totalWeight}%
            </span>
          </p>
        </div>
        <Button onClick={() => { reset(); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un objectif
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : objectives.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Aucun objectif</p>
              <p className="text-sm text-muted-foreground">Créez vos premiers objectifs SMART</p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2 mt-1">
              <Plus className="h-4 w-4" />
              Créer un objectif
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {objectives.map((obj: {
            id: string;
            title: string;
            description?: string | null;
            status: ObjectiveStatus;
            weight?: number | null;
            progress: number;
            dueDate?: Date | null;
            kpi?: string | null;
          }) => {
            const statusCfg = STATUS_CONFIG[obj.status];
            return (
              <Card key={obj.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{obj.title}</h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                        {obj.weight != null && (
                          <Badge variant="outline" className="text-xs">Poids : {obj.weight}%</Badge>
                        )}
                      </div>
                      {obj.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{obj.description}</p>
                      )}
                      {obj.kpi && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">KPI :</span> {obj.kpi}
                        </p>
                      )}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Avancement</span>
                          <span className="font-medium">{obj.progress}%</span>
                        </div>
                        <Progress value={obj.progress} className="h-1.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground"
                        onClick={() => setEditId(obj.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteObj.mutate({ id: obj.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel objectif SMART</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Titre *</label>
              <Input {...register("title")} placeholder="ex : Augmenter les ventes de 15%" className={errors.title ? "border-destructive" : ""} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register("description")}
                rows={2}
                placeholder="Décrivez le contexte et les critères de succès..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Poids (%)</label>
                <Input {...register("weight")} type="number" min="0" max="100" placeholder="ex : 30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Échéance</label>
                <Input {...register("dueDate")} type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">KPI mesurable</label>
              <Input {...register("kpi")} placeholder="ex : Chiffre d'affaires Q4 2025" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting || create.isPending} className="gap-2">
                {(isSubmitting || create.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
