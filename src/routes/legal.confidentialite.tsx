import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/legal/confidentialite")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Wealthia" },
      { name: "description", content: "Politique RGPD de Wealthia : données collectées, sous-traitants, durée de conservation et droits utilisateurs." },
      { property: "og:title", content: "Politique de confidentialité — Wealthia" },
      { property: "og:description", content: "Politique RGPD de Wealthia : données collectées, sous-traitants, durée de conservation et droits utilisateurs." },
      { property: "og:url", content: "https://wealthia.lovable.app/legal/confidentialite" },
    ],
    links: [{ rel: "canonical", href: "https://wealthia.lovable.app/legal/confidentialite" }],
  }),
});

function Page() {
  return (
    <LegalPage title="Politique de confidentialité & protection des données">
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD - UE 2016/679) et à la loi Informatique et Libertés.
      </p>

      <LegalSection title="1. Responsable du traitement">
        {`[NOM DE L'ENTITÉ À COMPLÉTER]
[ADRESSE À COMPLÉTER]
Email : privacy@wealthia.app`}
      </LegalSection>

      <LegalSection title="2. Données collectées">
        {`• Données d'identification : nom, adresse email
• Données financières personnelles : soldes de comptes, transactions, budgets, actifs — saisies manuellement par l'utilisateur
• Données techniques : adresse IP, type de navigateur, logs d'accès
• Données de paiement : gérées exclusivement par Stripe Inc. Wealthia ne stocke aucune donnée de carte bancaire.`}
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales">
        {`• Fourniture du service (exécution du contrat)
• Sécurité et prévention de la fraude (intérêt légitime)
• Amélioration du service — analytics anonymisés opt-in uniquement (consentement)
• Obligations légales et comptables (obligation légale)`}
      </LegalSection>

      <LegalSection title="4. Sous-traitants">
        {`• Supabase Inc. (base de données — région Europe, Frankfurt)
• Lovable Technology Inc. (hébergement application)
• Stripe Inc. (paiements — certifié PCI-DSS)

Tous nos sous-traitants offrent des garanties conformes au RGPD (clauses contractuelles types ou Privacy Framework UE-États-Unis).`}
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        {`• Données de compte actif : durée de vie du compte
• Après suppression du compte : 30 jours (soft delete) puis purge
• Logs de sécurité : 12 mois
• Données de facturation : 10 ans (obligation légale comptable)`}
      </LegalSection>

      <LegalSection title="6. Vos droits">
        {`Vous disposez des droits suivants, exerçables à privacy@wealthia.app :
• Droit d'accès à vos données
• Droit de rectification
• Droit à l'effacement (« droit à l'oubli ») — via Paramètres > Supprimer mon compte
• Droit à la portabilité — via la fonction Export
• Droit d'opposition et de limitation du traitement
• Droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr — 3 Place de Fontenoy, 75007 Paris)`}
      </LegalSection>

      <LegalSection title="7. Transferts hors UE">
        Certains de nos prestataires sont établis hors de l'Union Européenne. Ces transferts sont encadrés par des clauses contractuelles types approuvées par la Commission Européenne.
      </LegalSection>

      <LegalSection title="8. Sécurité">
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des données en transit (HTTPS/TLS) et au repos, contrôle d'accès par Row Level Security, authentification forte, journalisation des accès.
      </LegalSection>
    </LegalPage>
  );
}
