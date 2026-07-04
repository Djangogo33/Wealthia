import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/strings";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { PaywallModal } from "@/components/paywall-modal";
import { AIDisclaimer } from "@/components/ui/AIDisclaimer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aiAdvisorChat } from "@/lib/advisor.functions";
import {
  demoAccounts,
  demoTransactions,
  demoSubscriptions,
  demoDebts,
  demoGoals,
  demoAssets,
  demoReplies,
} from "@/data/demo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conseiller")({
  component: AdvisorPage,
});

type Msg = { id?: string; role: "user" | "assistant"; content: string; created_at?: string };

type FinancialContext = {
  solde_total: number;
  revenus_mois: number;
  depenses_mois: number;
  taux_epargne: number;
  top_categories: { name: string; amount: number }[];
  nb_comptes: number;
  nb_actifs: number;
  valeur_portefeuille: number;
  nb_objectifs: number;
  objectif_plus_proche: { name: string; progress: number } | null;
  nb_dettes: number;
  dette_restante: number;
  nb_abonnements: number;
  total_abonnements_mois: number;
};

function demoReply(question: string): string {
  if (/santé|health|analyse|bilan/i.test(question)) return demoReplies.sante;
  if (/dépense|reduce|réduire|abonnement/i.test(question)) return demoReplies.depenses;
  if (/objectif|goal|voie|japon/i.test(question)) return demoReplies.objectifs;
  return demoReplies.default;
}

function AdvisorPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { isDemo } = useDemo();
  const plan = isDemo ? "pro" : profile?.plan ?? "free";
  const gate = useFeatureGate("ai_advisor");
  const chat = useServerFn(aiAdvisorChat);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<FinancialContext | null>(null);

  // Feature gate — free plan
  useEffect(() => {
    if (plan === "free") gate.setPaywallOpen(true);
  }, [plan, gate]);

  // Load latest conversation + build financial context
  useEffect(() => {
    if (plan === "free") return;
    if (isDemo) {
      setCtx(buildDemoContext());
      return;
    }
    if (!user) return;
    (async () => {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (conv) {
        setConversationId(conv.id);
        const { data: msgs } = await supabase
          .from("ai_messages")
          .select("id,role,content,created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });
        if (msgs) setMessages(msgs as Msg[]);
      }
      setCtx(await buildLiveContext(user.id));
    })();
  }, [user, isDemo, plan]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    if (plan === "free") {
      gate.setPaywallOpen(true);
      return;
    }
    const userMsg: Msg = { role: "user", content: text.trim(), created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    // Demo mode
    if (isDemo) {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: demoReply(text), created_at: new Date().toISOString() },
        ]);
        setSending(false);
      }, 1500);
      return;
    }

    if (!ctx || !user) {
      setSending(false);
      return;
    }

    try {
      // Save user message + ensure conversation
      let convId = conversationId;
      if (!convId) {
        const title = text.trim().split(/\s+/).slice(0, 7).join(" ");
        const { data: newConv, error } = await supabase
          .from("ai_conversations")
          .insert({ user_id: user.id, title })
          .select("id")
          .single();
        if (error || !newConv) throw error;
        convId = newConv.id;
        setConversationId(convId);
      }
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "user",
        content: userMsg.content,
      });

      const history = [...messages, userMsg]
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await chat({
        data: { messages: history, financialContext: ctx, plan: plan as "pro" | "max" },
      });

      if (res.error || !res.reply) {
        toast.error(t("advisor.errorRetry"));
        setSending(false);
        return;
      }

      const aiMsg: Msg = { role: "assistant", content: res.reply, created_at: new Date().toISOString() };
      setMessages((m) => [...m, aiMsg]);
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: res.reply,
      });
      await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    } catch (e) {
      console.error(e);
      toast.error(t("advisor.errorRetry"));
    } finally {
      setSending(false);
    }
  }

  async function newConversation() {
    if (isDemo) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    if (conversationId) {
      await supabase
        .from("ai_conversations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setMessages([]);
    setConversationId(null);
  }

  const suggestions = useMemo(() => {
    const base = [t("advisor.suggestion1"), t("advisor.suggestion2"), t("advisor.suggestion3")];
    if (plan === "max") base.push(t("advisor.suggestion4"));
    return base;
  }, [plan, t]);

  const locked = plan === "free";

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col px-4 pt-4 pb-4 md:pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-5 w-5 text-[var(--gold)]" /> {t("advisor.title")}
        </h1>
        {messages.length > 0 && !locked && (
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("advisor.newConversation")}
          </button>
        )}
      </div>

      <div className="mb-3">
        <AIDisclaimer />
      </div>

      <div
        ref={scrollRef}
        className={`card-surface flex-1 overflow-y-auto p-4 ${locked ? "pointer-events-none blur-sm" : ""}`}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="card-surface max-w-md p-5">
              <div className="mb-2 flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gold)]/10">
                  <Sparkles className="h-5 w-5 text-[var(--gold)]" />
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{t("advisor.greeting")}</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <MessageBubble key={m.id ?? i} msg={m} />
            ))}
            {sending && <TypingBubble label={t("advisor.thinking")} />}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("advisor.placeholder")}
          disabled={sending || locked}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-[var(--gold)]"
        />
        <Button
          type="submit"
          disabled={sending || locked || !input.trim()}
          className="bg-[var(--gold)] text-[var(--primary-foreground)] hover:opacity-90 h-auto px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <PaywallModal open={gate.paywallOpen} onOpenChange={gate.setPaywallOpen} requiredPlan="pro" />
    </div>
  );
}

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[75%] rounded-2xl bg-[var(--gold)] px-4 py-2.5 text-sm text-[var(--primary-foreground)]">
          {msg.content}
        </div>
        <span className="mt-1 text-[10px] text-[var(--muted-foreground)]">{formatTime(msg.created_at)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10">
        <Sparkles className="h-4 w-4 text-[var(--gold)]" />
      </div>
      <div className="flex flex-col items-start">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm leading-relaxed">
          {msg.content}
        </div>
        <span className="mt-1 ml-1 text-[10px] text-[var(--muted-foreground)]">{formatTime(msg.created_at)}</span>
      </div>
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10">
        <Sparkles className="h-4 w-4 text-[var(--gold)]" />
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-1.5" aria-label={label}>
          <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-foreground)]" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-foreground)]" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-foreground)]" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function buildDemoContext(): FinancialContext {
  const solde = demoAccounts.reduce((s, a) => s + a.balance, 0);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthTx = demoTransactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const revenus = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) || 3120;
  const depenses = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) || 924;
  const taux = revenus > 0 ? Math.round(((revenus - depenses) / revenus) * 1000) / 10 : 0;
  const byCat: Record<string, number> = {};
  demoTransactions.filter((t) => t.type === "expense").forEach((t) => {
    byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
  });
  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));
  const goal = demoGoals[0];
  return {
    solde_total: Math.round(solde * 100) / 100,
    revenus_mois: Math.round(revenus * 100) / 100,
    depenses_mois: Math.round(depenses * 100) / 100,
    taux_epargne: taux,
    top_categories: top,
    nb_comptes: demoAccounts.length,
    nb_actifs: demoAssets.length,
    valeur_portefeuille: Math.round(demoAssets.reduce((s, a: any) => s + (a.quantity ?? 0) * (a.current_price ?? a.avg_price ?? 0), 0)),
    nb_objectifs: demoGoals.length,
    objectif_plus_proche: goal ? { name: (goal as any).name ?? (goal as any).title ?? "Objectif", progress: Math.round((((goal as any).current ?? 0) / ((goal as any).target ?? 1)) * 100) } : null,
    nb_dettes: demoDebts.length,
    dette_restante: demoDebts.reduce((s, d: any) => s + (d.balance ?? 0), 0),
    nb_abonnements: demoSubscriptions.length,
    total_abonnements_mois: Math.round(demoSubscriptions.reduce((s, sub: any) => s + (sub.amount ?? 0), 0) * 100) / 100,
  };
}

async function buildLiveContext(userId: string): Promise<FinancialContext> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const iso = monthStart.toISOString();

  const [accountsR, txR, subsR, debtsR, goalsR, assetsR] = await Promise.all([
    supabase.from("accounts").select("balance").eq("user_id", userId).is("deleted_at", null),
    supabase
      .from("transactions")
      .select("amount,type,category_id,categories(name)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", iso),
    supabase.from("subscriptions_tracked").select("amount").eq("user_id", userId).is("deleted_at", null),
    supabase.from("debts").select("balance").eq("user_id", userId).is("deleted_at", null).is("settled_at", null),
    supabase.from("savings_goals").select("name,target_amount,current_amount").eq("user_id", userId),
    supabase.from("assets").select("quantity,avg_price,current_price").eq("user_id", userId),
  ]);

  const accounts = accountsR.data ?? [];
  const tx = (txR.data ?? []) as any[];
  const subs = subsR.data ?? [];
  const debts = debtsR.data ?? [];
  const goals = goalsR.data ?? [];
  const assets = assetsR.data ?? [];

  const solde = accounts.reduce((s: number, a: any) => s + Number(a.balance ?? 0), 0);
  const revenus = tx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const depenses = tx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const taux = revenus > 0 ? Math.round(((revenus - depenses) / revenus) * 1000) / 10 : 0;

  const byCat: Record<string, number> = {};
  tx.filter((t) => t.type === "expense").forEach((t) => {
    const name = t.categories?.name ?? "Autre";
    byCat[name] = (byCat[name] ?? 0) + Number(t.amount);
  });
  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));

  const portfolioValue = assets.reduce(
    (s: number, a: any) => s + Number(a.quantity ?? 0) * Number(a.current_price ?? a.avg_price ?? 0),
    0,
  );

  const goalWithProgress = goals
    .map((g: any) => ({
      name: g.name,
      progress: g.target_amount > 0 ? Math.round((Number(g.current_amount ?? 0) / Number(g.target_amount)) * 100) : 0,
    }))
    .sort((a, b) => b.progress - a.progress)[0] ?? null;

  return {
    solde_total: Math.round(solde * 100) / 100,
    revenus_mois: Math.round(revenus * 100) / 100,
    depenses_mois: Math.round(depenses * 100) / 100,
    taux_epargne: taux,
    top_categories: top,
    nb_comptes: accounts.length,
    nb_actifs: assets.length,
    valeur_portefeuille: Math.round(portfolioValue * 100) / 100,
    nb_objectifs: goals.length,
    objectif_plus_proche: goalWithProgress,
    nb_dettes: debts.length,
    dette_restante: debts.reduce((s: number, d: any) => s + Number(d.balance ?? 0), 0),
    nb_abonnements: subs.length,
    total_abonnements_mois: Math.round(subs.reduce((s: number, sub: any) => s + Number(sub.amount ?? 0), 0) * 100) / 100,
  };
}
