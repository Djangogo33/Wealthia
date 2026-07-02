import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/legal/cgu")({
  ssr: false,
  component: Page,
  head: () => ({ meta: [{ title: "CGU — Wealthia" }] }),
});

function Page() {
  return (
    <LegalPage title="Conditions Générales d'Utilisation">
      <LegalSection title="1. Objet">
        Wealthia est une application de gestion budgétaire et patrimoniale personnelle. Elle permet à l'utilisateur de suivre ses comptes, transactions, investissements et objectifs d'épargne.
      </LegalSection>
      <LegalSection title="2. Accès au service">
        L'accès à Wealthia requiert la création d'un compte. L'utilisateur doit avoir au moins 18 ans. L'inscription est gratuite (offre Gratuit). Des fonctionnalités supplémentaires sont disponibles via les offres Pro (4,99 €/mois) et Max (9,99 €/mois).
      </LegalSection>
      <LegalSection title="3. Absence de conseil financier réglementé">
        Wealthia ne détient pas d'agrément d'autorité financière (AMF, ACPR ou équivalent). Les analyses, projections et suggestions de l'application, notamment celles générées par l'intelligence artificielle, sont fournies à titre purement indicatif et ne constituent pas des conseils en investissement au sens de la directive MIF II. L'utilisateur s'engage à ne pas les interpréter comme tels et reste seul décisionnaire de ses actes financiers.
      </LegalSection>
      <LegalSection title="4. Données saisies par l'utilisateur">
        L'utilisateur saisit ses données financières manuellement. Wealthia ne se connecte pas directement aux établissements bancaires sans consentement explicite (fonctionnalité Open Banking optionnelle). L'utilisateur est responsable de l'exactitude des données saisies.
      </LegalSection>
      <LegalSection title="5. Sécurité du compte">
        L'utilisateur s'engage à maintenir la confidentialité de ses identifiants et à notifier immédiatement Wealthia en cas d'usage non autorisé de son compte.
      </LegalSection>
      <LegalSection title="6. Suspension et résiliation">
        Wealthia se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU. L'utilisateur peut supprimer son compte à tout moment depuis les Paramètres. Les données sont conservées 30 jours après suppression puis purgées définitivement.
      </LegalSection>
      <LegalSection title="7. Modifications">
        Wealthia se réserve le droit de modifier les présentes CGU. L'utilisateur sera notifié par email en cas de modification substantielle. La poursuite de l'utilisation du service vaut acceptation des nouvelles conditions.
      </LegalSection>
      <LegalSection title="8. Droit applicable">
        Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents de [VILLE À COMPLÉTER].
      </LegalSection>
    </LegalPage>
  );
}
