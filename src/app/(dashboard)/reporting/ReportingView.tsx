"use client";

import * as React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { trpc } from "@/components/providers/TRPCProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, TrendingUp, Users, CheckCircle2, Clock } from "lucide-react";
import { formatScore } from "@/lib/utils";

const SCORE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#ec4899"];

function ChartSkeleton() {
  return <div className="h-64 bg-muted/40 rounded-lg animate-pulse" />;
}

export function ReportingView() {
  const { data: stats, isLoading: statsLoading } = trpc.report.orgStats.useQuery();

  // Mock enriched data (would come from API in production)
  const completionByDept = [
    { dept: "Tech", completion: 87 },
    { dept: "Sales", completion: 72 },
    { dept: "RH", completion: 95 },
    { dept: "Finance", completion: 68 },
    { dept: "Marketing", completion: 80 },
  ];

  const scoreDistribution = [
    { label: "Insuffisant (1)", count: 8, color: SCORE_COLORS[0] },
    { label: "En progrès (2)", count: 22, color: SCORE_COLORS[1] },
    { label: "Atteint (3)", count: 45, color: SCORE_COLORS[2] },
    { label: "Dépasse (4)", count: 31, color: SCORE_COLORS[3] },
    { label: "Exceptionnel (5)", count: 12, color: SCORE_COLORS[4] },
  ];

  const monthlyTrend = [
    { month: "Sep", submitted: 12, validated: 5 },
    { month: "Oct", submitted: 34, validated: 18 },
    { month: "Nov", submitted: 67, validated: 41 },
    { month: "Déc", submitted: 89, validated: 72 },
    { month: "Jan", submitted: 103, validated: 95 },
    { month: "Fév", submitted: 118, validated: 110 },
  ];

  const statusPie = [
    { name: "Validées", value: stats?.completedEvaluations ?? 42 },
    { name: "En cours", value: stats?.pendingEvaluations ?? 28 },
    { name: "Non démarrées", value: (stats?.completedEvaluations ?? 42) + (stats?.pendingEvaluations ?? 28) > 0 ? 90 - (stats?.completedEvaluations ?? 42) - (stats?.pendingEvaluations ?? 28) : 20 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporting & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble des performances et évaluations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Taux de complétion",
            value: stats ? `${stats.completionRate}%` : "—",
            sub: "évaluations finalisées",
            icon: CheckCircle2,
            color: "text-green-600",
          },
          {
            label: "Évaluations totales",
            value: stats ? stats.completedEvaluations + stats.pendingEvaluations : "—",
            sub: "cette campagne",
            icon: Users,
            color: "text-blue-600",
          },
          {
            label: "En attente",
            value: stats?.pendingEvaluations ?? "—",
            sub: "à compléter",
            icon: Clock,
            color: "text-amber-600",
          },
          {
            label: "Score moyen",
            value: stats?.completionRate ? `${stats.completionRate}%` : "—",
            sub: "sur 5",
            icon: TrendingUp,
            color: "text-purple-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-3xl font-bold mt-1">{statsLoading ? "..." : kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted/50 ${kpi.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion by dept */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Complétion par département</CardTitle>
            <CardDescription>Taux d'évaluations finalisées</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={completionByDept} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs fill-muted-foreground" />
                <YAxis type="category" dataKey="dept" className="text-xs fill-muted-foreground" width={60} />
                <Tooltip formatter={(v) => [`${v}%`, "Complétion"]} />
                <Bar dataKey="completion" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition des statuts</CardTitle>
            <CardDescription>Vue d'ensemble du workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution des scores</CardTitle>
            <CardDescription>Nombre d'évaluations par niveau</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scoreDistribution.map((item) => {
                const total = scoreDistribution.reduce((s, x) => s + x.count, 0);
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium tabular-nums">{item.count} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progression mensuelle</CardTitle>
            <CardDescription>Soumissions et validations dans le temps</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} dot={false} name="Soumises" />
                <Line type="monotone" dataKey="validated" stroke="#22c55e" strokeWidth={2} dot={false} name="Validées" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
