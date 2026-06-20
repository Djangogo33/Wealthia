import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Copy } from "lucide-react";
import { useTranslation } from "@/lib/strings";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminPage,
});

type Plan = "free" | "pro" | "max";

function planBadgeStyle(plan: string) {
  if (plan === "max") return { background: "#D4745A", color: "#0D0D0D" };
  if (plan === "pro") return { background: "#C8B99A", color: "#0D0D0D" };
  return { background: "#2A2A2A", color: "#A3A3A3" };
}

function genCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (isDemo || !isAdmin) navigate({ to: "/" });
  }, [isAdmin, isDemo, loading, navigate]);

  if (loading || !isAdmin || isDemo) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <Shield className="h-6 w-6 text-[var(--gold)]" />
        <h1 className="text-2xl font-semibold">⚙️ {t("admin.title")} — Wealthia</h1>
        <Badge style={{ background: "#C8B99A", color: "#0D0D0D" }} className="ml-2 px-2 py-0.5 text-[10px]">
          {t("admin.badge")}
        </Badge>
      </header>

      <Tabs defaultValue="users">
        <TabsList className="mb-6 bg-[var(--card)]">
          <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="codes">{t("admin.promoCodes")}</TabsTrigger>
          <TabsTrigger value="referrals">{t("admin.referrals")}</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="codes"><CodesTab /></TabsContent>
        <TabsContent value="referrals"><ReferralsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- USERS ---------- */
function UsersTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | Plan>("all");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,name,email,plan,plan_expires_at,created_at,referral_code")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: counts = [] } = useQuery({
    queryKey: ["admin-referral-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("referrals").select("referrer_id");
      return data ?? [];
    },
  });
  const referralByUser = useMemo(() => {
    const m = new Map<string, number>();
    counts.forEach((r: { referrer_id: string }) => m.set(r.referrer_id, (m.get(r.referrer_id) ?? 0) + 1));
    return m;
  }, [counts]);

  const filtered = users.filter((u) => {
    if (planFilter !== "all" && u.plan !== planFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: users.length,
    free: users.filter((u) => u.plan === "free").length,
    pro: users.filter((u) => u.plan === "pro").length,
    max: users.filter((u) => u.plan === "max").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["totalUsers", stats.total],
          ["paywall.free", stats.free],
          ["paywall.pro", stats.pro],
          ["paywall.max", stats.max],
        ] as const).map(([key, val]) => (
          <div key={key} className="card-surface p-4">
            <div className="text-xs uppercase text-[var(--muted-foreground)]">{t(`admin.${key}`) !== `admin.${key}` ? t(`admin.${key}`) : t(key)}</div>
            <div className="mt-1 text-2xl font-semibold text-[var(--gold)]">{val}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t("admin.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {(["all", "free", "pro", "max"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlanFilter(p)}
            className={`rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase ${
              planFilter === p ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)]"
            }`}
          >
            {p === "all" ? "All" : p}
          </button>
        ))}
      </div>

      <div className="card-surface overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">{t("admin.noUsers")}</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold">
                  {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name ?? "—"}</div>
                  <div className="truncate text-xs text-[var(--muted-foreground)]">{u.email}</div>
                </div>
                <Badge style={planBadgeStyle(u.plan)} className="px-2 py-0.5 text-[10px] uppercase">
                  {u.plan}
                </Badge>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {referralByUser.get(u.id) ?? 0} {t("admin.referredCount")}
                </div>
                <PlanDialog user={u} onDone={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanDialog({
  user,
  onDone,
}: {
  user: { id: string; plan: string };
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>((user.plan as Plan) ?? "free");
  const [days, setDays] = useState<number>(30);
  const [permanent, setPermanent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    const payload: { plan: Plan; plan_expires_at: string | null } = {
      plan,
      plan_expires_at:
        plan === "free" || permanent ? null : new Date(Date.now() + days * 86400000).toISOString(),
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("OK");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">{t("admin.changePlan")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("admin.changePlan")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["free", "pro", "max"] as Plan[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`flex-1 rounded-lg border border-[var(--border)] py-2 text-xs uppercase ${
                  plan === p ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : ""
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {plan !== "free" && (
            <>
              <div>
                <Label>{t("admin.planDuration")}</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  disabled={permanent}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} />
                {t("admin.permanent")}
              </label>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={apply} disabled={busy} className="bg-[var(--gold)] text-[var(--primary-foreground)]">
            {t("admin.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- PROMO CODES ---------- */
function CodesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState<Plan>("pro");
  const [duration, setDuration] = useState(30);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: codes = [] } = useQuery({
    queryKey: ["admin-codes"],
    queryFn: async () => {
      const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create() {
    const finalCode = (code || genCode()).toUpperCase();
    setBusy(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: finalCode,
      plan,
      duration_days: duration,
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiry ? new Date(expiry).toISOString() : null,
      active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(finalCode);
    setCode(""); setMaxUses(""); setExpiry("");
    qc.invalidateQueries({ queryKey: ["admin-codes"] });
  }

  async function deactivate(id: string) {
    await supabase.from("promo_codes").update({ active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-codes"] });
  }

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("admin.customCode")}</Label>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BETA2026" />
              <Button variant="outline" onClick={() => setCode(genCode())}>{t("admin.generateRandom")}</Button>
            </div>
          </div>
          <div>
            <Label>Plan</Label>
            <div className="flex gap-2">
              {(["free", "pro", "max"] as Plan[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 rounded-lg border border-[var(--border)] py-2 text-xs uppercase ${
                    plan === p ? "bg-[var(--gold)] text-[var(--primary-foreground)]" : ""
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("admin.planDuration")}</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("admin.maxUses")}</Label>
            <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" />
          </div>
          <div>
            <Label>{t("admin.expiry")}</Label>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        </div>
        <Button onClick={create} disabled={busy} className="bg-[var(--gold)] text-[var(--primary-foreground)]">
          {t("admin.createCode")}
        </Button>
      </div>

      {codes.length === 0 ? (
        <div className="card-surface p-6 text-center text-sm text-[var(--muted-foreground)]">{t("admin.noCodes")}</div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
              <span className="font-mono text-base font-semibold text-[var(--gold)]">{c.code}</span>
              <Badge
                style={c.active ? { background: "#6BAF7A", color: "#0D0D0D" } : { background: "#D4745A", color: "#0D0D0D" }}
                className="px-2 py-0.5 text-[10px]"
              >
                {c.active ? t("admin.codeActive") : t("admin.codeInactive")}
              </Badge>
              <span className="text-xs text-[var(--muted-foreground)]">
                {c.plan.toUpperCase()} · {c.duration_days}j · {c.uses_count}/{c.max_uses ?? "∞"} {t("admin.uses")}
                {c.expires_at && ` · ${new Date(c.expires_at).toLocaleDateString()}`}
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(c.code); toast.success(t("admin.copied")); }}>
                  <Copy className="mr-1 h-3 w-3" />{t("admin.copy")}
                </Button>
                {c.active && (
                  <Button size="sm" variant="outline" onClick={() => deactivate(c.id)}>
                    {t("admin.deactivate")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- REFERRALS ---------- */
function ReferralsTab() {
  const { t } = useTranslation();
  const { data: refs = [] } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id,reward_granted,created_at,referrer_id,referred_id")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: profilesById = new Map() } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,name,email");
      const m = new Map<string, { name: string | null; email: string | null }>();
      (data ?? []).forEach((p) => m.set(p.id, { name: p.name, email: p.email }));
      return m;
    },
  });

  const stats = {
    total: refs.length,
    granted: refs.filter((r) => r.reward_granted).length,
  };
  const topReferrer = useMemo(() => {
    const counts = new Map<string, number>();
    refs.forEach((r) => counts.set(r.referrer_id, (counts.get(r.referrer_id) ?? 0) + 1));
    let top: string | null = null;
    let max = 0;
    counts.forEach((v, k) => { if (v > max) { max = v; top = k; } });
    return top ? (profilesById.get(top)?.name ?? profilesById.get(top)?.email ?? "—") : "—";
  }, [refs, profilesById]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card-surface p-4">
          <div className="text-xs uppercase text-[var(--muted-foreground)]">{t("admin.totalReferrals")}</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--gold)]">{stats.total}</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs uppercase text-[var(--muted-foreground)]">{t("admin.rewardsGranted")}</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--gold)]">{stats.granted}</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs uppercase text-[var(--muted-foreground)]">{t("admin.topReferrer")}</div>
          <div className="mt-1 truncate text-base font-semibold">{topReferrer}</div>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        {refs.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">{t("admin.noReferrals")}</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {refs.map((r) => {
              const referrer = profilesById.get(r.referrer_id);
              const referred = profilesById.get(r.referred_id);
              return (
                <div key={r.id} className="grid grid-cols-1 gap-1 p-3 text-sm sm:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase text-[var(--muted-foreground)]">{t("admin.referrer")}</div>
                    <div className="truncate">{referrer?.name ?? referrer?.email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[var(--muted-foreground)]">{t("admin.referred")}</div>
                    <div className="truncate">{referred?.name ?? referred?.email ?? "—"}</div>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">{new Date(r.created_at).toLocaleDateString()}</div>
                  <div>
                    <Badge
                      style={r.reward_granted ? { background: "#6BAF7A", color: "#0D0D0D" } : { background: "#2A2A2A", color: "#A3A3A3" }}
                      className="px-2 py-0.5 text-[10px]"
                    >
                      {r.reward_granted ? t("admin.rewardYes") : t("admin.rewardNo")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
