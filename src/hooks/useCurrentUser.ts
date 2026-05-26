import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";

export function useCurrentUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    role: session?.user?.role ?? null,
    organizationId: session?.user?.organizationId ?? null,
  };
}

export function usePermissions() {
  const { role } = useCurrentUser();

  return {
    isAdmin: role === UserRole.ADMIN,
    isHR: role === UserRole.RH || role === UserRole.ADMIN,
    isManager: role === UserRole.MANAGER || role === UserRole.RH || role === UserRole.ADMIN,
    isCollaborateur: role === UserRole.COLLABORATEUR,
    canManageCampaigns: role === UserRole.RH || role === UserRole.ADMIN,
    canViewReports: role === UserRole.RH || role === UserRole.ADMIN || role === UserRole.MANAGER,
    canManageUsers: role === UserRole.ADMIN,
    canValidateEvaluations: role === UserRole.RH || role === UserRole.ADMIN,
    canEvaluateTeam: role === UserRole.MANAGER || role === UserRole.RH || role === UserRole.ADMIN,
    role,
  };
}
