# Déploiement

Le fichier `compose.yaml` lance MongoDB, NestJS et Nginx/Angular. Suivre le README pour la configuration et le lancement. Docker n'était pas disponible dans l'environnement de construction; le lancement Compose n'a pas été exécuté ici.

Pour une publication sur un serveur : fournir un domaine et un certificat HTTPS, configurer `CLIENT_ORIGIN`, définir un mot de passe administrateur privé, conserver le volume MongoDB et sauvegarder ses données. Terminer TLS via un proxy du serveur. Ne pas exposer MongoDB directement à Internet.

Routes : `/#/home`, `/#/maps`, `/#/editor`, `/#/sessions`, `/#/test`, `/#/admin`. L'API est sous `/api`, Socket.IO sous `/socket.io`. Santé : `GET /api/health`.

Aucune publication ni modification DNS n'a été réalisée par cette livraison.
