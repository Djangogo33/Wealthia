import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileText, FileSpreadsheet, FileCode, Braces, Lock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/lib/strings";
import { useAuth } from "@/hooks/use-auth";
import { useDemo } from "@/hooks/use-demo";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { PaywallModal } from "@/components/paywall-modal";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_RANK, type PlanTier } from "@/lib/stripe-constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/export")({
  ssr: false,
  component: ExportPage,
});

type Period = "month" | "3m" | "1y" | "all";

function periodStart(p: Period): Date | null {
  const d = new Date();
  if (p === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (p === "3m") {
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  if (p === "1y") {
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
  return null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportPage() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPlan, setPaywallPlan] = useState<PlanTier>("pro");

  const currentPlan: PlanTier = isDemo ? "pro" : profile?.plan ?? "free";

  const gateXlsx = useFeatureGate("export_xlsx");
  const gatePdf = useFeatureGate("export_pdf");
  const gateJson = useFeatureGate("export_json");
  void gateXlsx; void gatePdf; void gateJson;

  function needsUpgrade(required: PlanTier) {
    return PLAN_RANK[currentPlan] < PLAN_RANK[required];
  }

  function openPaywall(required: PlanTier) {
    setPaywallPlan(required);
    setPaywallOpen(true);
  }

  async function fetchExportData() {
    if (!user) return null;
    const start = periodStart(period);
    const iso = start ? start.toISOString() : null;
    const txQuery = supabase
      .from("transactions")
      .select("*, categories(name), accounts(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("date", { ascending: false });
    const [tx, accts, cats, buds, ass, goals, deb, subs] = await Promise.all([
      iso ? txQuery.gte("date", iso) : txQuery,
      supabase.from("accounts").select("*").eq("user_id", user.id).is("deleted_at", null),
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase.from("budgets").select("*, categories(name)").eq("user_id", user.id),
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("savings_goals").select("*").eq("user_id", user.id),
      supabase.from("debts").select("*").eq("user_id", user.id).is("deleted_at", null),
      supabase.from("subscriptions_tracked").select("*").eq("user_id", user.id).is("deleted_at", null),
    ]);
    return {
      transactions: (tx.data ?? []) as any[],
      accounts: (accts.data ?? []) as any[],
      categories: (cats.data ?? []) as any[],
      budgets: (buds.data ?? []) as any[],
      assets: (ass.data ?? []) as any[],
      savings_goals: (goals.data ?? []) as any[],
      debts: (deb.data ?? []) as any[],
      subscriptions: (subs.data ?? []) as any[],
    };
  }

  function fileTag(): string {
    const p = period === "month" ? "cemois" : period === "3m" ? "3mois" : period === "1y" ? "1an" : "tout";
    return `${p}-${format(new Date(), "yyyyMMdd")}`;
  }

  async function handleCsv() {
    if (isDemo) { toast.info(t("export.demoBlocked")); return; }
    setLoading("csv");
    try {
      const data = await fetchExportData();
      if (!data) return;
      const headers = ["Date", "Libellé", "Catégorie", "Compte", "Montant (€)", "Type", "IA"];
      const rows = data.transactions.map((tx) => [
        tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "",
        (tx.label ?? "").replace(/;/g, ","),
        tx.categories?.name ?? "",
        tx.accounts?.name ?? "",
        String(tx.amount ?? "").replace(".", ","),
        tx.type === "expense" ? "Dépense" : "Revenu",
        tx.ai_categorized ? "Oui" : "Non",
      ]);
      const bom = "\uFEFF";
      const csv = bom + [headers, ...rows].map((r) => r.join(";")).join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `wealthia-transactions-${fileTag()}.csv`);
      toast.success(t("export.success"));
    } catch (e) {
      console.error(e);
      toast.error(t("advisor.errorRetry"));
    } finally {
      setLoading(null);
    }
  }

  async function handleXlsx() {
    if (needsUpgrade("pro")) { openPaywall("pro"); return; }
    if (isDemo) { toast.info(t("export.demoBlocked")); return; }
    setLoading("xlsx");
    try {
      const data = await fetchExportData();
      if (!data) return;
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const txRows = [
        ["Date", "Libellé", "Catégorie", "Compte", "Montant", "Type", "IA"],
        ...data.transactions.map((tx) => [
          tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "",
          tx.label ?? "",
          tx.categories?.name ?? "",
          tx.accounts?.name ?? "",
          Number(tx.amount ?? 0),
          tx.type === "expense" ? "Dépense" : "Revenu",
          tx.ai_categorized ? "Oui" : "Non",
        ]),
      ];
      const wsTx = XLSX.utils.aoa_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, wsTx, t("export.sheetTransactions"));

      const acctRows = [
        ["Nom", "Type", "Solde", "Devise"],
        ...data.accounts.map((a) => [a.name, a.type, Number(a.balance ?? 0), a.currency ?? "EUR"]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(acctRows), t("export.sheetAccounts"));

      const assetRows = [
        ["Symbole", "Nom", "Type", "Quantité", "Prix achat", "Prix actuel", "P&L", "P&L%"],
        ...data.assets.map((a) => {
          const qty = Number(a.quantity ?? 0);
          const avg = Number(a.avg_price ?? a.purchase_price ?? 0);
          const cur = Number(a.current_price ?? avg);
          const pl = (cur - avg) * qty;
          const plPct = avg > 0 ? ((cur - avg) / avg) * 100 : 0;
          return [a.symbol, a.name, a.type, qty, avg, cur, Math.round(pl * 100) / 100, Math.round(plPct * 10) / 10];
        }),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(assetRows), t("export.sheetAssets"));

      const budRows = [
        ["Catégorie", "Plafond", "Dépensé", "Restant", "% utilisé"],
        ...data.budgets.map((b) => {
          const limit = Number(b.limit_amount ?? b.limit ?? 0);
          const spent = Number(b.spent ?? 0);
          const rem = limit - spent;
          const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
          return [b.categories?.name ?? "", limit, spent, rem, pct];
        }),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budRows), t("export.sheetBudgets"));

      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(new Blob([out], { type: "application/octet-stream" }), `wealthia-export-${fileTag()}.xlsx`);
      toast.success(t("export.success"));
    } catch (e) {
      console.error(e);
      toast.error(t("advisor.errorRetry"));
    } finally {
      setLoading(null);
    }
  }

  async function handlePdf() {
    if (needsUpgrade("pro")) { openPaywall("pro"); return; }
    if (isDemo) { toast.info(t("export.demoBlocked")); return; }
    setLoading("pdf");
    try {
      const data = await fetchExportData();
      if (!data) return;
      const { default: jsPDF } = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const autoTable = (autoTableMod.default ?? autoTableMod) as any;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(19, 26, 16);
      doc.text("WEALTHIA", 40, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Gestion de Patrimoine", 40, 66);
      doc.setFontSize(11);
      doc.setTextColor(19, 26, 16);
      doc.text("Rapport Export", pageW - 40, 50, { align: "right" });
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(format(new Date(), "dd MMM yyyy"), pageW - 40, 66, { align: "right" });

      // Line
      doc.setDrawColor(200, 185, 154);
      doc.setLineWidth(1);
      doc.line(40, 80, pageW - 40, 80);

      // Summary
      const start = periodStart(period);
      const revenus = data.transactions.filter((tx) => tx.type === "income").reduce((s, tx) => s + Number(tx.amount ?? 0), 0);
      const depenses = data.transactions.filter((tx) => tx.type === "expense").reduce((s, tx) => s + Number(tx.amount ?? 0), 0);
      const net = revenus - depenses;
      const taux = revenus > 0 ? Math.round(((revenus - depenses) / revenus) * 1000) / 10 : 0;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("RÉSUMÉ DE LA PÉRIODE", 40, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Période : ${start ? `${format(start, "dd/MM/yyyy")} – ${format(new Date(), "dd/MM/yyyy")}` : "Tout l'historique"}`,
        40,
        120,
      );

      const stats = [
        ["Revenus", `${revenus.toFixed(2)} €`],
        ["Dépenses", `${depenses.toFixed(2)} €`],
        ["Solde net", `${net >= 0 ? "+" : ""}${net.toFixed(2)} €`],
        ["Épargne", `${taux}%`],
      ];
      doc.setTextColor(19, 26, 16);
      doc.setFontSize(9);
      let x = 40;
      const colW = (pageW - 80) / 4;
      stats.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(label, x, 140);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(19, 26, 16);
        doc.setFontSize(12);
        doc.text(value, x, 158);
        doc.setFontSize(9);
        x += colW;
      });

      // Table
      autoTable(doc, {
        startY: 185,
        head: [["Date", "Libellé", "Catégorie", "Compte", "Montant"]],
        body: data.transactions.slice(0, 200).map((tx) => [
          tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "",
          tx.label ?? "",
          tx.categories?.name ?? "",
          tx.accounts?.name ?? "",
          `${tx.type === "expense" ? "-" : "+"}${Number(tx.amount ?? 0).toFixed(2)} €`,
        ]),
        headStyles: { fillColor: [200, 185, 154], textColor: [19, 26, 16], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 4 },
        alternateRowStyles: { fillColor: [248, 246, 240] },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          // Watermark
          doc.saveGraphicsState();
          (doc as any).setGState(new (doc as any).GState({ opacity: 0.08 }));
          doc.setFont("helvetica", "bold");
          doc.setFontSize(80);
          doc.setTextColor(150, 150, 150);
          doc.text("WEALTHIA PRO", pageW / 2, pageH / 2, { align: "center", angle: 45 });
          doc.restoreGraphicsState();

          // Footer
          const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const totalPages = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.setFont("helvetica", "normal");
          doc.text(
            `Page ${pageNum}/${totalPages}  ·  Généré par Wealthia  ·  wealthia.app`,
            pageW / 2,
            pageH - 20,
            { align: "center" },
          );
        },
      });

      doc.save(`wealthia-rapport-${fileTag()}.pdf`);
      toast.success(t("export.success"));
    } catch (e) {
      console.error(e);
      toast.error(t("advisor.errorRetry"));
    } finally {
      setLoading(null);
    }
  }

  async function handleJson() {
    if (needsUpgrade("max")) { openPaywall("max"); return; }
    if (isDemo) { toast.info(t("export.demoBlocked")); return; }
    setLoading("json");
    try {
      const data = await fetchExportData();
      if (!data) return;
      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          name: profile?.name,
          email: profile?.email,
          plan: profile?.plan,
        },
        ...data,
      };
      const json = JSON.stringify(exportData, null, 2);
      downloadBlob(new Blob([json], { type: "application/json" }), `wealthia-data-export-${format(new Date(), "yyyyMMdd")}.json`);
      toast.success(t("export.success"));
    } catch (e) {
      console.error(e);
      toast.error(t("advisor.errorRetry"));
    } finally {
      setLoading(null);
    }
  }

  const periods: { id: Period; label: string }[] = [
    { id: "month", label: t("export.periodThisMonth") },
    { id: "3m", label: t("export.period3M") },
    { id: "1y", label: t("export.period1Y") },
    { id: "all", label: t("export.periodAll") },
  ];

  const formats: {
    id: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    tier: "free" | "pro" | "max";
    onClick: () => void;
    required: PlanTier;
  }[] = [
    { id: "csv", icon: <FileText className="h-5 w-5" />, title: t("export.csvTitle"), desc: t("export.csvDesc"), tier: "free", onClick: handleCsv, required: "free" },
    { id: "xlsx", icon: <FileSpreadsheet className="h-5 w-5" />, title: t("export.xlsxTitle"), desc: t("export.xlsxDesc"), tier: "pro", onClick: handleXlsx, required: "pro" },
    { id: "pdf", icon: <FileCode className="h-5 w-5" />, title: t("export.pdfTitle"), desc: t("export.pdfDesc"), tier: "pro", onClick: handlePdf, required: "pro" },
    { id: "json", icon: <Braces className="h-5 w-5" />, title: t("export.jsonTitle"), desc: t("export.jsonDesc"), tier: "max", onClick: handleJson, required: "max" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6">
      <button
        onClick={() => navigate({ to: "/settings" })}
        className="mb-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" /> {t("export.title")}
      </button>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("export.period")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                period === p.id
                  ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--gold)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {t("export.formats")}
        </h2>
        <div className="card-surface divide-y divide-[var(--border)]">
          {formats.map((f) => {
            const locked = needsUpgrade(f.required);
            const busy = loading === f.id;
            return (
              <div key={f.id} className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                  {f.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.title}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        f.tier === "free"
                          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                          : f.tier === "pro"
                            ? "bg-[#C8B99A]/20 text-[#C8B99A]"
                            : "bg-[#D4745A]/20 text-[#D4745A]"
                      }`}
                    >
                      {t(`export.${f.tier}`)}
                    </span>
                    {locked && <Lock className="h-3 w-3 text-[var(--muted-foreground)]" />}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{f.desc}</p>
                </div>
                <Button
                  onClick={f.onClick}
                  disabled={busy}
                  variant={locked ? "outline" : "default"}
                  className={locked ? "" : "bg-[var(--gold)] text-[var(--primary-foreground)] hover:opacity-90"}
                  size="sm"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {t("export.generating")}
                    </>
                  ) : (
                    t("export.download")
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} requiredPlan={paywallPlan} />
    </div>
  );
}
