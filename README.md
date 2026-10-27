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

- `index.html` : la page (sans JavaScript intégré, pour la règle de sécurité CSP)
- `app.js` : toute l'app
- `theme.js` : thème clair/sombre et protection contre l'affichage dans une autre page
- `fonts/` : police Fraunces hébergée sur le site (licence SIL Open Font License)
- `manifest.webmanifest`, `icon.svg` : installation sur l'écran d'accueil
- `sw.js` : fonctionnement hors connexion
- `version.json` : numéro de version, à changer avec `APP_VERSION` à chaque mise en ligne

## Sécurité

**Serveur (`supabase/schema.sql`)**
- Inscription uniquement avec le lien d'invitation d'un responsable (Réglages → Équipe) : email invité + code secret de 64 caractères tiré par le serveur, valable 7 jours et une seule fois. Le compte reçoit directement son pôle et son rôle.
- Règles ligne par ligne : chaque pôle ne lit que ses fiches ; les visiteurs non connectés n'ont accès à rien.
- Auteur, dates, identifiant et type de fiche fixés par le serveur ; un agent ne peut ni changer de pôle, ni supprimer la fiche d'un collègue.
- Contrôles sur les données : identifiant simple, type connu, 32 Ko maximum par fiche.
- Limite de 600 écritures par agent et par tranche de 10 minutes (un compte piraté ne peut pas remplir la base).
- Historique de chaque modification (60 jours) et corbeille (30 jours), restaurables par un responsable ; purge automatique (RGPD).
- Fonctions de sécurité dans un schéma privé, non exposé par l'API ; API GraphQL retirée.

**Application**
- Toute donnée venue du serveur ou d'un fichier est nettoyée avant affichage (types, identifiants, liens http(s) uniquement) puis échappée.
- Règle CSP : seuls les fichiers du site et la bibliothèque Supabase s'exécutent ; les données ne partent que vers le serveur de l'agence.
- Bibliothèque Supabase figée et vérifiée par empreinte (SRI) ; aucune ressource chargée chez Google.
- Déconnexion ou compte désactivé : les fiches gardées sur le téléphone sont effacées.

**À chaque mise en ligne** : ne jamais ajouter de `<script>` dans `index.html` (la CSP le bloquerait) ; si la version de supabase-js change, recalculer l'empreinte `integrity`.

## Installer sur le téléphone

- iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».
- Android (Chrome) : menu ⋮ → « Installer l'application ».

## Données personnelles

Les fiches contiennent des données de clients. Ne jamais déposer d'export ou de
fichier d'import dans ce dépôt public (le dossier `prive/` est exclu de git).
