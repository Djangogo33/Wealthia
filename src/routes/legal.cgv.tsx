import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/legal/cgv")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "CGV — Wealthia" },
      { name: "description", content: "Conditions Générales de Vente de Wealthia : offres Gratuit, Pro et Max, paiement, rétractation et renouvellement." },
      { property: "og:title", content: "CGV — Wealthia" },
      { property: "og:description", content: "Conditions Générales de Vente de Wealthia : offres Gratuit, Pro et Max, paiement, rétractation et renouvellement." },
      { property: "og:url", content: "https://wealthia.lovable.app/legal/cgv" },
    ],
    links: [{ rel: "canonical", href: "https://wealthia.lovable.app/legal/cgv" }],
  }),
});

function Page() {
  return (
    <LegalPage title="Conditions Générales de Vente">
      <LegalSection title="1. Offres et tarifs">
        {`• Gratuit : 0 €/mois — sans engagement
• Pro : 4,99 €/mois ou 39,99 €/an (économie 33 %)
• Max : 9,99 €/mois ou 79,99 €/an (économie 33 %)

Tarifs TTC, applicables aux résidents français.`}
      </LegalSection>

      <LegalSection title="2. Paiement">
        Le paiement est effectué par carte bancaire via Stripe Inc. (certifié PCI-DSS niveau 1). Les abonnements sont prélevés automatiquement à la date de souscription, chaque mois ou année.
      </LegalSection>

      <LegalSection title="3. Droit de rétractation">
        {`Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours à compter de la souscription pour exercer votre droit de rétractation, sans motif.

Pour l'exercer : contact@wealthia.app`}
      </LegalSection>

      <LegalSection title="4. Renouvellement et résiliation">
        Les abonnements se renouvellent automatiquement. Vous pouvez résilier à tout moment depuis Paramètres &gt; Gérer l'abonnement. La résiliation prend effet à la fin de la période en cours. Aucun remboursement pour les périodes entamées.
      </LegalSection>

      <LegalSection title="5. Codes promotionnels">
        Les codes promo sont accordés à titre commercial, non cumulables, et ne donnent pas droit à remboursement en espèces.
      </LegalSection>
    </LegalPage>
  );
}
