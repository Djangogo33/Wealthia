// Stripe Checkout Session endpoint (placeholder).
// Real implementation requires STRIPE_SECRET_KEY in the environment.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { STRIPE_PRICES } from "@/lib/stripe-constants";

export const Route = createFileRoute("/api/stripe/create-checkout-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Authenticate the caller with the bearer token
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !userData.user) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as { priceId?: string };

        // Only accept known price IDs
        const known = new Set(
          Object.values(STRIPE_PRICES as Record<string, unknown>).flatMap((v) =>
            typeof v === "string" ? [v] : typeof v === "object" && v ? Object.values(v as Record<string, string>) : [],
          ),
        );
        if (!body.priceId || !known.has(body.priceId)) {
          return Response.json({ error: "invalid_price" }, { status: 400 });
        }

        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
          return Response.json(
            {
              error: "stripe_not_configured",
              message:
                "Stripe n'est pas encore configuré. Ajoutez STRIPE_SECRET_KEY pour activer le checkout.",
            },
            { status: 501 },
          );
        }
        // TODO: when STRIPE_SECRET_KEY is set, create the actual Checkout Session here
        // tied to userData.user.id and return { url } for redirect.
        return Response.json({ error: "not_implemented" }, { status: 501 });
      },
    },
  },
});
