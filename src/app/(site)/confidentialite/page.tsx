import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default async function PrivacyPage() {
  const { company } = await getSettings();
  return (
    <LegalPage
      title="Confidentialité"
      intro="Les données que nous collectons, pourquoi, combien de temps nous les conservons et comment exercer vos droits."
      updated="22 octobre 2026"
      sections={[
        {
          id: "responsable",
          title: "Responsable du traitement",
          body: <p>{company.name}, {company.address}. Contact : {company.email}.</p>,
        },
        {
          id: "donnees",
          title: "Données collectées",
          body: (
            <ul>
              <li>Identité et coordonnées : nom, e-mail, téléphone, ville, adresse de livraison ;</li>
              <li>Commandes, paiements (référence de transaction, jamais votre code secret ni les données complètes de carte), livraisons et réclamations ;</li>
              <li>Pour les professionnels : pièces justificatives (RCCM, IFU, pièce d&apos;identité, autorisations, coordonnées bancaires) ;</li>
              <li>Données techniques de connexion et journal d&apos;audit des opérations sensibles.</li>
            </ul>
          ),
        },
        {
          id: "finalites",
          title: "Finalités",
          body: (
            <ul>
              <li>Exécuter les commandes, livraisons et paiements ;</li>
              <li>Vérifier les vendeurs professionnels et assurer la traçabilité des produits ;</li>
              <li>Répondre aux demandes de conseil, de devis et aux réclamations ;</li>
              <li>Respecter nos obligations légales, notamment de lutte contre le blanchiment de capitaux ;</li>
              <li>Vous envoyer, avec votre accord, des alertes de cours.</li>
            </ul>
          ),
        },
        {
          id: "acces",
          title: "Qui accède à vos données ?",
          body: (
            <p>
              Seules les personnes autorisées y accèdent : le vendeur concerné par votre commande (nom, téléphone et adresse de livraison), le transporteur chargé de la livraison, et les membres habilités de l&apos;équipe Burkina Or. Les pièces justificatives des professionnels sont stockées dans un espace privé, accessible uniquement à leur titulaire et à l&apos;équipe conformité.
            </p>
          ),
        },
        {
          id: "conservation",
          title: "Durées de conservation",
          body: <p>Les données de commande et de transaction sont conservées 10 ans (obligations comptables et de traçabilité). Le journal d&apos;audit est conservé 10 ans et ne peut être modifié. Les comptes inactifs sont supprimés après 3 ans.</p>,
        },
        {
          id: "securite",
          title: "Sécurité",
          body: <p>Chiffrement des échanges, contrôle d&apos;accès par rôle au niveau de la base de données, double validation des opérations sensibles et journalisation infalsifiable.</p>,
        },
        {
          id: "droits",
          title: "Vos droits",
          body: <p>Vous pouvez accéder à vos données, les rectifier depuis votre espace client, demander leur suppression (sous réserve des obligations légales de conservation) ou vous opposer aux communications commerciales en écrivant à {company.email}.</p>,
        },
      ]}
    />
  );
}
