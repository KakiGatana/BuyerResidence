# Carnet

Petite app pour l'agent immobilier : acquéreurs, prospects vendeurs, mandats et pige,
avec envoi de messages types (SMS, WhatsApp, email).
Aucun serveur : les données restent dans le navigateur de l'appareil.

## Pages

- **Acquéreurs** : ce qu'ils cherchent (budget, type, pièces, quartiers), situation, suivi.
- **Vendeurs** : prospects vendeurs, estimation, date de relance, « Stop pub ». Bouton « Créer le mandat ».
- **Mandats** : biens en portefeuille. Chaque fiche liste les acquéreurs qui correspondent
  et permet de leur présenter le bien en un appui.
- **Pige** : annonces de particuliers repérées à la main (lien, prix, téléphone), suivi des appels.
  Bouton « En faire un prospect vendeur ».
- **Messages** : modèles, et envoi en 3 étapes (destinataires → message → envoi un par un).

## Fichiers

- `index.html` : toute l'app
- `manifest.webmanifest`, `icon.svg` : installation sur l'écran d'accueil
- `sw.js` : fonctionnement hors connexion

## Mise en ligne sur GitHub Pages

1. Déposer ces fichiers dans un dépôt GitHub.
2. Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.

## Installer sur le téléphone

- iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».
- Android (Chrome) : menu ⋮ → « Installer l'application ».

## Important

- Les données sont stockées **uniquement sur l'appareil**. Faire régulièrement
  Réglages → Exporter, et garder le fichier en lieu sûr (il contient des données personnelles).
- Le même fichier sert à transférer les données sur un autre appareil (Réglages → Importer).
