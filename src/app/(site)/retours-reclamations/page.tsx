import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Retours, annulations et réclamations" };

export default async function ReturnsPage() {
  const { shipping } = await getSettings();
  return (
    <LegalPage
      title="Retours & réclamations"
      intro="Annuler une commande, signaler un incident de livraison ou un produit non conforme : la marche à suivre et nos engagements."
      updated="22 octobre 2026"
      sections={[
        {
          id: "annulation",
          title: "Annuler une commande",
          body: (
            <>
              <p>
                Vous pouvez annuler votre commande depuis <Link href="/compte/commandes">votre espace client</Link> pendant {shipping.retraction_hours} heures, tant que le colis n&apos;est pas en préparation. Le remboursement est initié immédiatement sur le moyen de paiement utilisé.
              </p>
              <p>Ne sont pas annulables : les créations sur mesure dont la fabrication a commencé et les bijoux gravés à votre demande.</p>
            </>
          ),
        },
        {
          id: "livraison",
          title: "Incident à la livraison",
          body: (
            <>
              <p>
                <strong>Si le scellé est abîmé ou absent, refusez le colis et ne communiquez pas votre code de remise.</strong> Signalez immédiatement l&apos;incident : une enquête est ouverte auprès du transporteur, qui est assuré à hauteur de la valeur déclarée.
              </p>
              <p>Retard, colis retenu en douane, adresse introuvable : le statut « Incident » apparaît dans votre suivi et notre équipe vous contacte.</p>
            </>
          ),
        },
        {
          id: "non-conforme",
          title: "Produit non conforme",
          body: (
            <>
              <p>Vous disposez de 7 jours après la livraison pour signaler un produit non conforme à sa description (poids, titre, taille, aspect). Joignez des photos à votre réclamation.</p>
              <p>Si un écart est confirmé sur une caractéristique « vérifiée », Burkina Or vous rembourse intégralement. Pour une caractéristique « déclarée », nous faisons procéder à une analyse et engageons la responsabilité du vendeur.</p>
            </>
          ),
        },
        {
          id: "procedure",
          title: "Traitement des réclamations",
          body: (
            <ul>
              <li>Dépôt depuis votre espace client, rubrique « Réclamations » (ou depuis la page de suivi de commande) ;</li>
              <li>Accusé de réception et attribution à un responsable sous 24 h ouvrées ;</li>
              <li>Échanges suivis dans le dossier, avec le vendeur et le transporteur si nécessaire ;</li>
              <li>Solution enregistrée : remboursement, relivraison, échange ou réparation.</li>
            </ul>
          ),
        },
        {
          id: "remboursement",
          title: "Délais de remboursement",
          body: <p>Mobile Money : 24 à 72 h. Carte bancaire : 3 à 10 jours selon votre banque. Virement : 2 à 5 jours ouvrés. Paiement en agence : remboursement en agence ou par virement.</p>,
        },
      ]}
    />
  );
}
