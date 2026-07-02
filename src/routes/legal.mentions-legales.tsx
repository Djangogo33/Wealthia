import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/legal/mentions-legales")({
  ssr: false,
  component: Page,
  head: () => ({ meta: [{ title: "Mentions légales — Wealthia" }] }),
});

function Page() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).
      </p>

      <LegalSection title="Éditeur du site">
        {`Raison sociale : [NOM DE L'ENTITÉ JURIDIQUE À COMPLÉTER]
Forme juridique : [SAS / SASU / Auto-entrepreneur À COMPLÉTER]
Siège social : [ADRESSE À COMPLÉTER]
Email : contact@wealthia.app
Directeur de la publication : [NOM DU RESPONSABLE LÉGAL À COMPLÉTER]`}
      </LegalSection>

      <LegalSection title="Hébergement">
        {`Frontend (Application) :
  Lovable Technology Inc.
  651 N Broad St, Suite 206
  Middletown, DE 19709, États-Unis
  https://lovable.dev

Base de données & Authentification :
  Supabase Inc.
  970 Toa Payoh North, #07-04
  Singapore 318992
  Région des données : Europe (Frankfurt, Allemagne)
  https://supabase.com`}
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        Le nom « Wealthia », le logo, le design et l'ensemble des contenus de l'application sont la propriété exclusive de l'éditeur. Toute reproduction est interdite sans autorisation écrite préalable.
      </LegalSection>

      <LegalSection title="Limitation de responsabilité">
        Wealthia est un outil de suivi budgétaire et patrimonial. Les informations et analyses fournies par l'application, y compris celles générées par l'intelligence artificielle, ont un caractère purement informatif. Elles ne constituent pas des conseils en investissement, des recommandations financières, ni des actes de gestion de patrimoine réglementés au sens de la réglementation applicable aux Conseillers en Investissements Financiers (CIF). L'utilisateur reste seul responsable de ses décisions financières.
      </LegalSection>
    </LegalPage>
  );
}
