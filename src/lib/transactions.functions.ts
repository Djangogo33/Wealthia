import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * Pick the best matching category id for a given transaction label.
 * Returns { categoryId, confidence } or { categoryId: null } if no match.
 */
export const aiCategorizeTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        label: z.string().min(1),
        type: z.enum(["expense", "income"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cats, error } = await supabase
      .from("categories")
      .select("id,name,type")
      .eq("user_id", userId);
    if (error) throw error;

    const candidates = (cats ?? []).filter(
      (c) => c.type === data.type || c.type === "both",
    );
    if (candidates.length === 0) return { categoryId: null as string | null };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { categoryId: null };

    const gateway = createLovableAiGatewayProvider(key);
    const list = candidates.map((c, i) => `${i + 1}. ${c.name}`).join("\n");

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({
          schema: z.object({
            index: z
              .number()
              .int()
              .min(1)
              .max(candidates.length)
              .describe("1-based index of the best category"),
          }),
        }),
        system:
          "Tu catégorises des transactions bancaires françaises. Réponds uniquement avec l'index de la meilleure catégorie.",
        prompt: `Transaction: "${data.label}" (${data.type === "expense" ? "dépense" : "revenu"})\n\nCatégories disponibles:\n${list}\n\nRetourne l'index de la meilleure catégorie.`,
      });
      const idx = experimental_output?.index ?? 0;
      const pick = candidates[idx - 1];
      return { categoryId: pick?.id ?? null };
    } catch (e) {
      console.error("ai categorize failed", e);
      return { categoryId: null };
    }
  });
