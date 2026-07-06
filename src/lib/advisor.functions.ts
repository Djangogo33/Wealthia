import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";
import { z } from "zod";

const financialContextSchema = z.object({
  solde_total: z.number(),
  revenus_mois: z.number(),
  depenses_mois: z.number(),
  taux_epargne: z.number(),
  top_categories: z.array(z.object({ name: z.string(), amount: z.number() })).max(10),
  nb_comptes: z.number(),
  nb_actifs: z.number(),
  valeur_portefeuille: z.number(),
  nb_objectifs: z.number(),
  objectif_plus_proche: z
    .object({ name: z.string(), progress: z.number() })
    .nullable(),
  nb_dettes: z.number(),
  dette_restante: z.number(),
  nb_abonnements: z.number(),
  total_abonnements_mois: z.number(),
});

const inputSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
  financialContext: financialContextSchema,
});

function buildSystemPrompt(ctx: z.infer<typeof financialContextSchema>, plan: string): string {
  const top = ctx.top_categories.slice(0, 5).map((c) => `${c.name} ${c.amount}€`).join(", ") || "n/a";
  const maxLine =
    plan === "max"
      ? `- Portefeuille : ${ctx.valeur_portefeuille}€ (${ctx.nb_actifs} actifs)
- Objectif prioritaire : ${ctx.objectif_plus_proche ? `${ctx.objectif_plus_proche.name} à ${ctx.objectif_plus_proche.progress}%` : "aucun"}`
      : "";
  return `Tu es Wealthia AI, un assistant financier personnel bienveillant.
Tu réponds TOUJOURS en français.

PROFIL FINANCIER DE L'UTILISATEUR :
- Solde total : ${ctx.solde_total}€
- Revenus ce mois : ${ctx.revenus_mois}€ | Dépenses : ${ctx.depenses_mois}€
- Taux d'épargne : ${ctx.taux_epargne}%
- Top dépenses : ${top}
- Abonnements : ${ctx.nb_abonnements} abonnements (${ctx.total_abonnements_mois}€/mois)
- Dettes restantes : ${ctx.dette_restante}€
${maxLine}

STYLE DE RÉPONSE — RÈGLES STRICTES :
- Maximum 5 lignes de texte au total
- Utilise des emojis pour structurer (1 emoji par point clé)
- Format préféré : 1 phrase intro + 3 bullet points max + 1 conclusion actionnable
- Nombres toujours en gras avec le symbole € : **1 234 €**
- Jamais de longs paragraphes
- Ton : direct, bienveillant, comme un ami qui s'y connaît en finance

EXEMPLE DE BONNE RÉPONSE :
"📊 Voici ton bilan rapide :
• 💰 Revenus : **3 120 €** → bien au-dessus de la moyenne
• 📉 Dépenses : **923 €** (30% des revenus) → très sain
• 🎯 Taux d'épargne : **70%** → excellent !

👉 Continue comme ça et tu atteindras ton objectif Japon en **5 mois**."

EXEMPLE DE MAUVAISE RÉPONSE (à éviter) :
"D'après l'analyse de vos données financières, il apparaît que votre situation budgétaire présente plusieurs caractéristiques notables qui méritent d'être examinées en détail..."

RÈGLES IMPORTANTES :
- Tu n'es PAS un conseiller financier réglementé. Rappelle-le si on te demande des recommandations précises.
- Ne donne JAMAIS de recommandations d'achat/vente de titres spécifiques.
- Plan actuel : ${plan}. Si l'utilisateur demande une fonctionnalité Max et qu'il est en Pro, suggère l'upgrade.
- Réponds UNIQUEMENT sur des sujets financiers personnels. Redirige poliment sinon.`;
}

export const aiAdvisorChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Server-side plan lookup — never trust client-supplied plan value
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", context.userId)
      .single();
    const now = Date.now();
    const expired = profile?.plan_expires_at
      ? new Date(profile.plan_expires_at).getTime() < now
      : false;
    const plan = (expired ? "free" : profile?.plan) ?? "free";

    if (plan === "free") {
      return { reply: "", error: "plan_required" as const };
    }
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { reply: "", error: "no_key" as const };

    const gateway = createLovableAiGatewayProvider(key);
    const recent = data.messages.slice(-8);
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: buildSystemPrompt(data.financialContext, plan),
        messages: recent.map((m) => ({ role: m.role, content: m.content })),
      });
      return { reply: text, error: null };
    } catch (e) {
      console.error("advisor error", e);
      return { reply: "", error: "generation_failed" as const };
    }
  });
