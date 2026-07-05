// TODO: Add email send step here (Resend API) — in-app notifications only for now
//
// Daily cron: send in-app reminders for upcoming subscription payments.
// Called by pg_cron with the Supabase anon key in the `apikey` header.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatDateFR(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export const Route = createFileRoute("/api/public/hooks/send-subscription-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("unauthorized", { status: 401 });
        }

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const today = isoDate(0);
        const in3Days = isoDate(3);

        const { data: subs, error } = await supabase
          .from("subscriptions_tracked")
          .select("id,user_id,name,amount,next_billing_date")
          .eq("paused", false)
          .is("deleted_at", null)
          .in("next_billing_date", [today, in3Days]);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        let sent = 0;
        for (const sub of subs ?? []) {
          try {
            const amt = Number(sub.amount).toFixed(2);
            const isToday = sub.next_billing_date === today;
            const title = isToday ? "Prélèvement aujourd'hui" : "Prélèvement à venir";
            const body = isToday
              ? `${sub.name} · ${amt} € prélevé aujourd'hui.`
              : `${sub.name} · ${amt} € le ${formatDateFR(sub.next_billing_date!)}.`;

            await supabase.from("notifications").insert({
              user_id: sub.user_id,
              title,
              body,
            });
            sent++;
          } catch (e) {
            console.error(`[send-subscription-reminders] sub ${sub.id} failed:`, e);
          }
        }

        return new Response(JSON.stringify({ ok: true, sent, total: subs?.length ?? 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
