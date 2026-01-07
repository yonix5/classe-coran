# Réservations Site

Un système de réservation simple avec Node.js et Express.

## Sécurité

- **Headers de sécurité** : Utilise Helmet pour des headers sécurisés.
- **Validation des entrées** : Sanitisation basique des noms et validation des types.
- **Variables d'environnement** : Mot de passe admin stocké dans `.env`.
- **HTTPS recommandé** : Utilisez un reverse proxy comme Nginx avec SSL en production.

## Installation

1. Clonez le dépôt.
2. Installez les dépendances : `npm install`
3. Créez un fichier `.env` avec `ADMIN_PASSWORD=votre_mot_de_passe`
4. Lancez le serveur : `npm start`

Le serveur tournera sur le port défini par `process.env.PORT` ou 3000 par défaut.

## Accès

- Page principale : `/`
- Page admin : `/admin.html`

## Déploiement

Pour déployer sur un serveur Node.js :

1. Téléchargez les fichiers sur votre serveur.
2. Installez les dépendances : `npm install`
3. Configurez les variables d'environnement.
4. Lancez avec `npm start` ou `node server.js`

Assurez-vous que le port est ouvert et que le serveur est configuré pour écouter sur l'adresse appropriée.
Utilisez HTTPS en production pour la sécurité.