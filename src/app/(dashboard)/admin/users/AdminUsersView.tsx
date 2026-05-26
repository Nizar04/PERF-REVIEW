"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { UserRole } from "@prisma/client";
import { MoreHorizontal, UserPlus, Shield, Ban, RefreshCw } from "lucide-react";
import { trpc } from "@/components/providers/TRPCProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/shared/DataTable";
import { getInitials, formatDateRelative } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const ROLE_CONFIG: Record<UserRole, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info" }> = {
  ADMIN: { label: "Admin", variant: "destructive" },
  RH: { label: "RH", variant: "info" },
  MANAGER: { label: "Manager", variant: "warning" },
  COLLABORATEUR: { label: "Collaborateur", variant: "secondary" },
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  updatedAt: Date;
  employee?: { department?: { name: string } | null } | null;
};

function RoleDropdown({ user }: { user: UserRow }) {
  const utils = trpc.useUtils();
  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      utils.user.list.invalidate();
    },
  });
  const deactivate = trpc.user.deactivate.useMutation({
    onSuccess: () => {
      toast.success(user.isActive ? "Utilisateur désactivé" : "Utilisateur réactivé");
      utils.user.list.invalidate();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Changer le rôle</DropdownMenuLabel>
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <DropdownMenuItem
            key={role}
            onClick={() => updateRole.mutate({ userId: user.id, role: role as UserRole })}
            disabled={user.role === role}
            className="gap-2"
          >
            <Shield className="h-3.5 w-3.5" />
            {cfg.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => deactivate.mutate({ userId: user.id })}
          className={user.isActive ? "text-destructive focus:text-destructive gap-2" : "gap-2"}
        >
          {user.isActive ? (
            <><Ban className="h-3.5 w-3.5" /> Désactiver</>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5" /> Réactiver</>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "lastName",
    header: "Utilisateur",
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(`${u.firstName} ${u.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">{u.firstName} {u.lastName}</div>
            <div className="text-xs text-muted-foreground">{u.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Rôle",
    cell: ({ row }) => {
      const cfg = ROLE_CONFIG[row.original.role];
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
  {
    accessorKey: "employee.department.name",
    header: "Département",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.employee?.department?.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Statut",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "success" : "outline"}>
        {row.original.isActive ? "Actif" : "Inactif"}
      </Badge>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Dernière activité",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateRelative(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RoleDropdown user={row.original} />,
  },
];

export function AdminUsersView() {
  const { data, isLoading } = trpc.user.list.useQuery({ page: 1, limit: 100 });
  const users = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} utilisateur(s) dans votre organisation
          </p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Inviter un utilisateur
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchKey="lastName"
        searchPlaceholder="Rechercher un utilisateur..."
        isLoading={isLoading}
        emptyMessage="Aucun utilisateur trouvé"
      />
    </div>
  );
}
