import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Page introuvable</p>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]">Accueil</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-xl bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Wealthia — Gestion de Patrimoine" },
      { name: "description", content: "Wealthia : gestion de budget et de patrimoine moderne, sécurisée et intelligente." },
      { name: "theme-color", content: "#0D0D0D" },
      { property: "og:title", content: "Wealthia — Gestion de Patrimoine" },
      { name: "twitter:title", content: "Wealthia — Gestion de Patrimoine" },
      { property: "og:description", content: "Wealthia : gestion de budget et de patrimoine moderne, sécurisée et intelligente." },
      { name: "twitter:description", content: "Wealthia : gestion de budget et de patrimoine moderne, sécurisée et intelligente." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/742f1ac1-936d-4f17-a0cb-a49eedfb6599/id-preview-1c040d16--b37034b8-2107-41d8-bb12-670214a48ea9.lovable.app-1781817732038.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/742f1ac1-936d-4f17-a0cb-a49eedfb6599/id-preview-1c040d16--b37034b8-2107-41d8-bb12-670214a48ea9.lovable.app-1781817732038.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
