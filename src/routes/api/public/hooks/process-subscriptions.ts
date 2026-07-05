// Daily cron: process subscriptions due today.
// Called by pg_cron with the Supabase anon key in the `apikey` header.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function addFrequency(iso: string, freq: "weekly" | "monthly" | "yearly"): string {
  const d = new Date(iso + "T00:00:00Z");
  if (freq === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/hooks/process-subscriptions")({
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

        const today = new Date().toISOString().slice(0, 10);

        const { data: subs, error } = await supabase
          .from("subscriptions_tracked")
          .select("id,user_id,name,amount,frequency,next_billing_date,category_id,account_id")
          .eq("paused", false)
          .is("deleted_at", null)
          .eq("next_billing_date", today);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        let processed = 0;
        const failures: Array<{ id: string; error: string }> = [];

        for (const sub of subs ?? []) {
          try {
            const amt = Number(sub.amount);

            // Insert transaction
            const { error: txErr } = await supabase.from("transactions").insert({
              user_id: sub.user_id,
              account_id: sub.account_id,
              category_id: sub.category_id,
              amount: amt,
              label: sub.name,
              type: "expense",
              date: today,
              ai_categorized: false,
              auto_generated: true,
            });
            if (txErr) throw txErr;

            // Debit account
            let newBalance: number | null = null;
            let accountName = "";
            if (sub.account_id) {
              const { data: acct } = await supabase
                .from("accounts")
                .select("balance,name")
                .eq("id", sub.account_id)
                .single();
              if (acct) {
                newBalance = Number(acct.balance) - amt;
                accountName = acct.name;
                await supabase
                  .from("accounts")
                  .update({ balance: newBalance })
                  .eq("id", sub.account_id);
              }
            }

            // Low-balance notification
            if (newBalance !== null && newBalance < 0) {
              await supabase.from("notifications").insert({
                user_id: sub.user_id,
                title: "Solde faible",
                body: `Le compte ${accountName} est passé à ${newBalance.toFixed(2)} € après le prélèvement ${sub.name}.`,
              });
            }

            // Advance next_billing_date
            const next = addFrequency(today, sub.frequency);
            await supabase
              .from("subscriptions_tracked")
              .update({ next_billing_date: next })
              .eq("id", sub.id);

            processed++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[process-subscriptions] sub ${sub.id} failed:`, msg);
            failures.push({ id: sub.id, error: msg });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, processed, failures, total: subs?.length ?? 0 }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
