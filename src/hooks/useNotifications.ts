import { trpc } from "@/components/providers/TRPCProvider";
import { useEffect } from "react";

export function useNotifications() {
  const utils = trpc.useUtils();

  const { data: unreadCount = 0 } = trpc.report.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000, // Poll every 30s
  });

  const { data: notifications, isLoading } = trpc.report.notifications.useQuery({
    unreadOnly: false,
  });

  const markRead = trpc.report.markNotificationRead.useMutation({
    onSuccess: () => {
      utils.report.notifications.invalidate();
      utils.report.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.report.markAllNotificationsRead.useMutation({
    onSuccess: () => {
      utils.report.notifications.invalidate();
      utils.report.unreadCount.invalidate();
    },
  });

  return {
    notifications: notifications ?? [],
    unreadCount,
    isLoading,
    markRead: (id: string) => markRead.mutate({ id }),
    markAllRead: () => markAllRead.mutate(),
  };
}
