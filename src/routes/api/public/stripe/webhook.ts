// Stripe webhook endpoint (placeholder).
// Real implementation must verify the signature with STRIPE_WEBHOOK_SECRET
// and handle: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted → update profiles.plan / stripe_customer_id.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("stripe_webhook_not_configured", { status: 501 });
        }
        // TODO: verify signature with stripe.webhooks.constructEvent and handle events
        await request.text();
        return new Response("ok");
      },
    },
  },
});
