import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { getSettings } from "@/lib/data";
import { dec } from "@/lib/format";

export const metadata: Metadata = { title: "Conditions générales d'utilisation et de vente" };

export default async function CguPage() {
  const { company, commissions, pricing, shipping } = await getSettings();
  return (
    <LegalPage
      title="CGU & CGV"
      intro="Les règles d'utilisation de la plateforme Burkina Or et les conditions applicables aux ventes réalisées par la boutique officielle et par les vendeurs professionnels."
      updated="22 octobre 2026"
      sections={[
        {
          id: "objet",
          title: "Objet et parties",
          body: (
            <>
              <p>
                La plateforme Burkina Or est éditée par {company.name}, {company.address}, RCCM {company.rccm}, {company.agrement.toLowerCase()}. Elle met en relation des acheteurs (particuliers et professionnels) avec la boutique officielle Burkina Or et avec des vendeurs professionnels vérifiés : bijoutiers, grossistes et comptoirs, fondeurs et prestataires logistiques.
              </p>
              <p>Toute utilisation de la plateforme vaut acceptation des présentes conditions.</p>
            </>
          ),
        },
        {
          id: "comptes",
          title: "Comptes et vérification des professionnels",
          body: (
            <>
              <p>La création d&apos;un compte est nécessaire pour commander, demander un devis ou contacter un vendeur. L&apos;utilisateur garantit l&apos;exactitude des informations fournies.</p>
              <p>
                Les comptes professionnels ne sont activés qu&apos;après vérification des pièces justificatives (registre de commerce, identifiant financier unique, pièce d&apos;identité du responsable, autorisations spécifiques à l&apos;activité). Burkina Or peut demander des compléments, refuser ou suspendre un compte lorsque cela est justifié.
              </p>
            </>
          ),
        },
        {
          id: "produits",
          title: "Présentation des produits : vérifié ou déclaré",
          body: (
            <>
              <p>Chaque caractéristique d&apos;un produit (poids, titre, pureté, origine) est affichée avec l&apos;une des deux mentions suivantes :</p>
              <ul>
                <li>
                  <strong>« Vérifié par Burkina Or »</strong> : la caractéristique a été contrôlée sur la base d&apos;un rapport d&apos;analyse d&apos;un laboratoire agréé, dans les tolérances (± 2 ‰ pour la pureté, ± 0,05 g pour le poids) ;
                </li>
                <li>
                  <strong>« Déclaré par le vendeur »</strong> : l&apos;information est fournie par le vendeur, sous sa responsabilité, sans contrôle de notre part.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "prix",
          title: "Prix et garantie de cours",
          body: (
            <>
              <p>
                Le prix des produits indexés (lingotins de la boutique officielle) est calculé ainsi : <strong>cours du jour × poids × pureté + façon</strong>. Le cours public intègre une marge de {dec(pricing.margin_pct, 1)} % sur la cotation de référence ({pricing.source}, convertie selon le {pricing.fx.toLowerCase()}).
              </p>
              <p>
                Le cours appliqué est garanti {pricing.lock_minutes} minutes à compter de l&apos;ajout au panier. Passé ce délai, il est recalculé au cours en vigueur. Les ventes peuvent être suspendues si le cours varie de plus de {pricing.breaker_pct} % en une heure.
              </p>
              <p>Les frais de livraison sécurisée sont affichés ligne par ligne avant le paiement. Aucun frais de service n&apos;est ajouté au prix client.</p>
            </>
          ),
        },
        {
          id: "commande",
          title: "Commande et paiement",
          body: (
            <>
              <p>La commande est définitive après acceptation des présentes conditions et validation du paiement. Moyens acceptés : Orange Money, Moov Money, Wave, cartes Visa et Mastercard (3-D Secure), virement bancaire et paiement en agence.</p>
              <p>En cas de virement ou de paiement en agence, la commande est réservée 48 heures au prix du jour de la commande ; à défaut de règlement, elle est annulée.</p>
            </>
          ),
        },
        {
          id: "livraison",
          title: "Livraison sécurisée",
          body: (
            <>
              <p>
                Les colis sont scellés, photographiés à la collecte, assurés à hauteur de leur valeur déclarée et remis uniquement contre le code de remise à 4 chiffres communiqué à l&apos;acheteur. L&apos;acheteur ne doit communiquer ce code qu&apos;après avoir vérifié l&apos;intégrité du scellé.
              </p>
              <p>Les délais indicatifs dépendent de la zone (même ville, autres villes du Burkina, Afrique de l&apos;Ouest) et du vendeur. Les créations sur mesure ont leur propre délai de fabrication, indiqué sur la fiche.</p>
            </>
          ),
        },
        {
          id: "retractation",
          title: "Rétractation, retours et réclamations",
          body: (
            <>
              <p>L&apos;acheteur peut annuler sa commande sous {shipping.retraction_hours} heures tant que le colis n&apos;a pas été expédié ; il est alors intégralement remboursé. Les créations sur mesure engagées et les bijoux gravés ne sont pas annulables.</p>
              <p>Toute réclamation est déposée depuis l&apos;espace client ; elle est attribuée à un responsable et suivie jusqu&apos;à sa résolution. Voir la page « Retours & réclamations ».</p>
            </>
          ),
        },
        {
          id: "vendeurs",
          title: "Engagements des vendeurs et commissions",
          body: (
            <>
              <p>Les vendeurs s&apos;engagent sur l&apos;exactitude de leurs annonces, la disponibilité des produits, le respect des délais et des autorisations applicables à leur activité. Ils ne gèrent que leur propre boutique.</p>
              <p>
                Burkina Or prélève sur le prix vendeur une commission de : {dec(commissions.bijou, 0)} % sur les bijoux, {dec(commissions.sur_mesure, 0)} % sur les créations sur mesure, {dec(commissions.gros, 0)} % sur les offres de gros, {dec(commissions.service, 0)} % sur les services et {dec(commissions.livraison, 0)} % sur les prestations de livraison. Le reversement intervient 48 heures après la livraison confirmée.
              </p>
            </>
          ),
        },
        {
          id: "conformite",
          title: "Conformité et lutte contre le blanchiment",
          body: (
            <p>
              Les transactions portant sur l&apos;or sont soumises aux réglementations relatives au commerce des métaux précieux, à la provenance des produits et à la lutte contre le blanchiment de capitaux. Burkina Or peut demander tout justificatif, conserver les informations de traçabilité et suspendre une transaction suspecte.
            </p>
          ),
        },
        {
          id: "droit",
          title: "Droit applicable",
          body: <p>Les présentes conditions sont soumises au droit burkinabè. À défaut de règlement amiable, les tribunaux de Ouagadougou sont compétents.</p>,
        },
      ]}
    />
  );
}
