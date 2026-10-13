# Carnet

App de l'agence pour suivre acquéreurs, prospects vendeurs, mandats, pige (pôle Vente)
et candidats / biens à louer (pôle Location), avec envoi de messages types (SMS, WhatsApp, email).

## Pages

**Pôle Vente**
- **Acquéreurs** : ce qu'ils cherchent (budget, type, pièces, quartiers), situation, biens demandés, suivi.
- **Vendeurs** : prospects vendeurs, estimation, date de relance, « Stop pub ». Bouton « Créer le mandat ».
- **Mandats** : biens en portefeuille, acquéreurs correspondants, « Présenter ce bien ».
- **Pige** : annonces de particuliers repérées à la main, suivi des appels.

**Pôle Location**
- **Candidats** : loyer max, critères, dossier (situation, revenus, garant), biens demandés.
- **Biens** : logements à louer, loyer, candidats correspondants.

**Messages** : modèles par pôle, envoi « tous d'un coup » (email en copie cachée) ou un par un.

## Serveur (Supabase)

- `supabase/schema.sql` : tables, rôles et règles de sécurité. À lancer une fois dans
  Supabase → SQL Editor. Peut être relancé sans risque.
- Chaque agent a un compte. Un nouveau compte ne voit rien tant qu'un responsable
  ne lui a pas donné un pôle (Réglages → Équipe).
- Vente et Location sont séparés dans la base. Les responsables voient les deux.
- Un agent ne peut pas supprimer la fiche d'un collègue.
- Hors connexion, les modifications attendent sur le téléphone et partent au retour du réseau.
- La clé « publishable » dans `index.html` est publique par nature. La clé secrète
  (`sb_secret_…`) ne doit jamais apparaître dans ce dépôt.

## Fichiers

- `index.html` : toute l'app
- `manifest.webmanifest`, `icon.svg` : installation sur l'écran d'accueil
- `sw.js` : fonctionnement hors connexion
- `version.json` : numéro de version, à changer avec `APP_VERSION` à chaque mise en ligne

## Installer sur le téléphone

- iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».
- Android (Chrome) : menu ⋮ → « Installer l'application ».

## Données personnelles

Les fiches contiennent des données de clients. Ne jamais déposer d'export ou de
fichier d'import dans ce dépôt public (le dossier `prive/` est exclu de git).
