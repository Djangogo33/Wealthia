// Stripe Checkout Session endpoint (placeholder).
// Real implementation requires STRIPE_SECRET_KEY in the environment.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/create-checkout-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { priceId?: string };
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
          return Response.json(
            {
              error: "stripe_not_configured",
              message:
                "Stripe n'est pas encore configuré. Ajoutez STRIPE_SECRET_KEY pour activer le checkout.",
              receivedPriceId: body.priceId ?? null,
            },
            { status: 501 },
          );
        }
        // TODO: when STRIPE_SECRET_KEY is set, create the actual Checkout Session here
        // and return { url } for redirect.
        return Response.json({ error: "not_implemented" }, { status: 501 });
      },
    },
  },
});
