# Burkina Or

Place de marché de l'or et de la joaillerie : boutique officielle de lingotins indexés sur le cours, boutiques de bijoutiers, offres de gros et devis entre professionnels, fondeurs, livraison sécurisée, conseil, espace client et back-office d'administration.

Stack : Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · three.js (scène 3D de l'accueil).

## Démarrage

```bash
npm install
npm run db:migrate      # applique supabase/migrations/*.sql (suivi dans app_meta.migrations)
npm run db:seed-users   # crée les comptes de démonstration
npm run dev             # http://localhost:3000
```

Variables (`.env.local`, non versionné) :

| Variable | Usage |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client navigateur et serveur (RLS appliquée) |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur uniquement (création de commandes, agrégats admin) |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | script de migration (API de gestion Supabase) |
| `NEXT_PUBLIC_SITE_URL` | liens des e-mails d'authentification |
| `DEMO_PASSWORD` | mot de passe des comptes créés par `npm run db:seed-users` |
| `PAYMENT_MODE` | `sandbox` (défaut) : paiements Mobile Money / carte simulés |

Autres scripts : `npm run db:status`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Comptes de démonstration

Mot de passe commun : valeur de `DEMO_PASSWORD` dans `.env.local` (à changer avant toute mise en ligne).

| E-mail | Rôle |
| --- | --- |
| admin@burkinaor.bf | Super-administratrice (et titulaire de la boutique officielle) |
| conformite@burkinaor.bf · conseil@burkinaor.bf · finance@burkinaor.bf | Équipe (modération, conseil, finance) |
| awa.sawadogo@mail.bf | Cliente (commande BO-104873 en cours de livraison) |
| maison@ouedraogo-joaillerie.bf · contact@kanazoe.bf | Bijoutiers |
| commercial@fasometaux.bf | Comptoir (offres de gros, devis) |
| contact@wendyam-fonderie.bf | Fondeur |
| ops@fasosecur.bf | Transporteur (missions de livraison) |
| achats@sahelgold.bf | Comptoir en attente de validation KYC |

## Organisation

```
src/app/(site)/        pages publiques, /compte (client), /pro (vendeurs, transporteurs)
src/app/(checkout)/    /commande : panier → livraison → paiement → confirmation
src/app/(print)/       certificat d'analyse et facture imprimables
src/app/admin/         back-office (KYC, modération, commandes, livraisons, réclamations,
                       conseil, devis, catalogue, utilisateurs, paramètres, audit, exports CSV)
src/lib/data.ts        lectures publiques mises en cache ('use cache' + tags)
src/lib/actions/       actions serveur (public, auth, account, checkout, pro, admin)
supabase/migrations/   schéma, sécurité (RLS, triggers), stockage, données initiales
```

### Règles métier clés

- **Prix** : lingotins = cours public 24 ct × poids × pureté + façon ; cours public = cours brut × (1 + marge). Le cours est **garanti 15 min** à l'ajout au panier ; le serveur vérifie que le cours garanti correspond bien à un cours publié (un prix falsifié est rejeté).
- **Vérifié / déclaré** : seules l'équipe et la modération peuvent poser « Vérifié par Burkina Or » (trigger en base) ; toute modification par le vendeur repasse la caractéristique en « déclaré ».
- **KYC** : un vendeur n'est publié qu'après contrôle de chaque pièce (stockage privé `kyc`) et validation.
- **Livraison** : colis scellé par le vendeur, étapes saisies par le transporteur, remise uniquement contre le code à 4 chiffres du client (vérifié en base).
- **Opérations sensibles** (paramètres, remboursements) : ré-authentification par mot de passe et inscription au **journal d'audit**, non modifiable (trigger).

## Avant la mise en production

- **Paiements** : brancher un agrégateur (Orange Money, Moov, Wave, carte 3-D Secure) dans `src/lib/actions/checkout.ts` (`startMobilePayment`, `checkPayment`, `payByCard`) et passer `PAYMENT_MODE` à une autre valeur que `sandbox`.
- **Cours de l'or** : aujourd'hui saisi depuis Admin › Paramètres ; prévoir une alimentation automatique (API de cotation + taux BCEAO) qui insère dans `gold_prices`.
- **E-mails** : configurer un SMTP personnalisé dans Supabase (le service intégré est limité à quelques e-mails par heure) et ajouter l'URL de production aux redirections autorisées.
- **Photos** : les visuels sont des emplacements rayés tant qu'aucune photo n'est téléversée (espace pro ou admin).
- Faire valider les CGU/CGV, la politique de confidentialité et les obligations réglementaires (commerce de l'or, LBC-FT, transport de valeurs).
