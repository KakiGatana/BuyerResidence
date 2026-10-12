# Carnet Acquéreurs

Petite app pour suivre ses acquéreurs et leur envoyer des messages types (SMS, WhatsApp, email).
Aucun serveur : les données restent dans le navigateur de l'appareil.

## Fichiers

- `index.html` : toute l'app
- `manifest.webmanifest`, `icon.svg` : installation sur l'écran d'accueil
- `sw.js` : fonctionnement hors connexion

## Mise en ligne sur GitHub Pages

1. Créer un dépôt sur GitHub et y déposer ces 4 fichiers.
2. Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. L'app est en ligne après une minute à l'adresse `https://<pseudo>.github.io/<depot>/`.

## Installer sur le téléphone

- iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».
- Android (Chrome) : menu ⋮ → « Installer l'application ».

## Important

- Les données sont stockées **uniquement sur l'appareil**. Faire régulièrement
  Réglages → Exporter, et garder le fichier en lieu sûr (il contient des données personnelles).
- Le même fichier sert à transférer les données sur un autre appareil (Réglages → Importer).
