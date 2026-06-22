import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/lib/strings";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { supabase } from "@/integrations/supabase/client";
import { demoNotifications, type DemoNotification } from "@/data/demo";

type Notif = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export function NotificationsBell({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [demoState, setDemoState] = useState<DemoNotification[]>(demoNotifications);

  const q = useQuery({
    queryKey: ["notifications", isDemo ? "demo" : user?.id],
    enabled: isDemo || !!user,
    queryFn: async (): Promise<Notif[]> => {
      if (isDemo) return demoState;
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,read,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notif[];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        setDemoState((s) => s.map((n) => ({ ...n, read: true })));
        return;
      }
      if (!user) return;
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const list = isDemo ? demoState : q.data ?? [];
  const unread = list.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t("notifications.title")}
          className={`relative rounded-full border border-[var(--border)] bg-[var(--card)]/80 p-1.5 text-[var(--muted-foreground)] backdrop-blur ${className ?? ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#D4745A] px-1 text-[9px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <div className="text-sm font-semibold">{t("notifications.title")}</div>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[11px] text-[var(--gold)] hover:underline"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {list.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[var(--muted-foreground)]">
              {t("notifications.empty")}
            </div>
          ) : (
            list.map((n) => (
              <div
                key={n.id}
                className={`border-b border-[var(--border)] px-3 py-2 text-sm last:border-0 ${
                  !n.read ? "bg-[var(--muted)]/40" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4745A]" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{n.body}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
