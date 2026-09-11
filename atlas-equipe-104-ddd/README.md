# Atlas — Éditeur de cartes hexagonales

Projet LOG2995, automne 2026, **Équipe 104** : Akhan Mehmet Sozen, Fadi Mousa, Majid Khauly, Talat Fallouh, Ismail Bissoular, Jazia Benhadjeba.

Application Angular 22 + NestJS 11 + MongoDB. Interface en français, code en anglais. Cette copie est issue du projet de base fourni; le serveur Express et les exemples de démonstration ont été remplacés par l'application NestJS.

## Démarrage avec Docker

Prérequis : Docker Engine avec Docker Compose.

1. Copier `.env.example` vers `.env` et remplacer `ADMIN_PASSWORD` par un mot de passe personnel.
2. Depuis ce dossier, exécuter `docker compose up --build`.
3. Ouvrir http://localhost:8080 et créer un compte.
4. L'administration se trouve à http://localhost:8080/#/admin et utilise le mot de passe défini dans `.env`.

MongoDB utilise un volume persistant. `docker compose down` conserve les données. La base et l'API sont accessibles seulement sur le réseau interne de Compose; Nginx relaie les requêtes HTTP et Socket.IO.

## Démarrage local sans Docker

Prérequis : Node.js 24.15 ou plus récent dans la branche 24, npm et MongoDB 8.x démarré localement (ou une URI MongoDB Atlas).

Dans `server-nestjs` :

```sh
npm ci
cp .env.example .env
# Modifier ADMIN_PASSWORD et, au besoin, MONGODB_URI dans .env.
npm start
```

Dans un second terminal, dans `client` :

```sh
npm ci
npm start
```

Ouvrir http://localhost:4200. Le proxy Angular relaie `/api` et `/socket.io` vers le port 3000. `npm run start:dev` côté serveur active le redémarrage automatique. `npm run build` puis `npm run start:prod` lance le serveur compilé.

## Parcours rapide

1. Créer un compte, puis une nouvelle carte. La carte initiale est entièrement composée d'eau.
2. Choisir Prairie, puis Seau pour créer une surface traversable.
3. Ajouter exactement quatre départs et au moins une ville. Relier les villes entre elles par des routes si plusieurs villes existent.
4. Enregistrer avec un nom unique et choisir la visibilité.
5. Lancer un test solo, public ou protégé. Dans une autre fenêtre/onglet, rejoindre la session comme visiteur ou avec un autre compte.
6. Survoler une destination pour voir le chemin le plus rapide, puis cliquer pour se déplacer. Utiliser `Q` pour s'arrêter au prochain centre de tuile et `T` pour écrire un message.

Un compte ne peut avoir qu'une connexion active. Le jeton reste dans le stockage propre à l'onglet et survit au rafraîchissement. Le serveur accorde 2,5 secondes pour la reconnexion lors d'un rafraîchissement; une fermeture définitive libère ensuite les verrous et ferme les sessions hébergées.

## Raccourcis

| Action | Raccourci |
|---|---|
| Eau, prairie, montagne, forêt, désert | 1, 2, 3, 4, 5 |
| Pinceau, seau, inspecteur | M, S, I |
| Route, ville, départ | R, V, P |
| Bordure / ligne de route | Shift + clic avec l'outil |
| Retirer un objet | Shift + clic droit |
| Déplacer la carte | Glisser avec le bouton droit |
| Zoom | Molette, =, - |
| Annuler / refaire | Ctrl+Z / Ctrl+Y (Cmd également accepté) |
| Annuler un trajet au prochain centre | Q |
| Clavardage / envoyer / annuler | T / Entrée / Échap |

## Validation

Dans chacun des dossiers `client` et `server-nestjs` : `npm run architecture`, `npm run lint` et `npm run build`.

- Client : `npm test -- --watch=false` (Vitest + jsdom; pas de navigateur externe requis).
- Serveur : `npm test -- --runInBand` (Jest, MongoDB temporaire réel et clients Socket.IO).
- Le premier test serveur peut télécharger le binaire MongoDB. La base de test est isolée de la base de développement.

Voir `TESTS.md` pour les cas couverts et `REQUIREMENTS.md` pour la correspondance avec les sprints. Les tests automatiques ne remplacent pas une vérification visuelle et ergonomique dans plusieurs navigateurs.

## Architecture DDD et hexagonale

Le projet est un monolithe modulaire. Les contextes métier sont **Identity**, **Map Authoring** et **Test Sessions**. Angular, NestJS et MongoDB restent les technologies utilisées.

- `server-nestjs/app/identity/` : politiques de compte, cas d’utilisation de connexion/administration, contrôleurs et adaptateurs de comptes/hachage.
- `server-nestjs/app/map-authoring/` : agrégat `HexMap`, cas d’utilisation de cartes, port de repository et adaptateur MongoDB.
- `server-nestjs/app/test-sessions/` : agrégat `TestRoom`, orchestration des sessions, port temps réel et adaptateur Socket.IO.
- Chaque contexte serveur sépare `domain/`, `application/` et `infrastructure/`.
- `server-nestjs/app/shared/` : ports de temps, identifiants, événements et stockage; adaptateurs techniques correspondants.
- `client/src/app/application/` : cas d’utilisation clients typés et ports HTTP, temps réel et stockage, sans Angular.
- `client/src/app/presentation/` : présentateurs Angular composés, état réactif et adaptation de l’éditeur; aucune hiérarchie d’héritage des actions.
- `client/src/app/infrastructure/` : adaptateurs HttpClient/RxJS, Socket.IO/RxJS et stockage du navigateur.
- `client/src/app/pages/` et `components/` : vues, formulaires, canvas, caméra et export PNG.
- `common/domain/` : noyau métier partagé, agrégat d’édition `MapEditor`, validation, types et algorithmes hexagonaux.
- `common/contracts/` : points d’entrée des snapshots JSON échangés, réutilisant les formes du domaine.
- Les fichiers `composition.providers.ts` assemblent les ports et les adaptateurs. Les modèles et cas d’utilisation sont construits sans décorateurs de framework.

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour les dépendances, responsabilités, exemples de flux et règles d’extension. Exécuter `npm run architecture` dans `client` ou `server-nestjs` pour vérifier les frontières des deux applications; ce contrôle est également intégré à GitLab CI.

Les comptes et cartes sont persistants. Les connexions, verrous et sessions de test restent en mémoire et se terminent au redémarrage du serveur. Ce déploiement utilise une seule instance NestJS; plusieurs instances nécessiteraient un stockage partagé des sessions/verrous et un adaptateur Socket.IO.

## Angular et RxJS

Le client utilise maintenant les Observables d’Angular `HttpClient`, des événements Socket.IO convertis en flux RxJS et `toSignal()` pour la recherche temporisée et le compte à rebours des déplacements. Les ports applicatifs conservent leurs Promises; `firstValueFrom()` adapte les requêtes à cette interface sans introduire Angular ou RxJS dans le domaine.

Voir [ANGULAR-RXJS.md](ANGULAR-RXJS.md) pour les fichiers à lire, les opérateurs, les abonnements et les tests. Les commandes restent les mêmes; RxJS et Angular HTTP étaient déjà disponibles dans les dépendances installées.

## Angular Router

Les six pages utilisent Angular Router avec `routerLink`, `routerLinkActive`, `router-outlet` et `loadComponent`. Les guards de `client/src/app/presentation/routing/` contrôlent l’accès et la sortie de l’éditeur ou d’un test. Les confirmations sont des Observables; l’état de navigation utilise `toSignal()`. Les URLs `/#/...` sont conservées grâce à `withHashLocation()`.

Voir [ANGULAR-ROUTER.md](ANGULAR-ROUTER.md) pour le parcours du code, les frontières DDD et les tests de navigation.

## Remise

La configuration Docker est fournie, mais aucune publication distante n'est effectuée. Les numéros de sprint, tags Git, issues, merge requests et revues humaines doivent correspondre à l'historique réel de l'équipe. Ils ne sont pas inventés automatiquement.
