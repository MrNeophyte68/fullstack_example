# Angular Router et architecture hexagonale

La navigation est désormais gérée par Angular Router. Le domaine et les cas d’utilisation restent indépendants d’Angular, de RxJS et des URLs.

## Fichiers à expliquer au professeur

| Fichier sous `client/src/app/` | Rôle |
|---|---|
| `app.routes.ts` | Déclare les six pages, leurs guards et leur chargement différé avec `loadComponent`. |
| `composition.providers.ts` | Installe `provideRouter(APP_ROUTES, withHashLocation(), …)`. |
| `app.component.html` | Affiche la page active dans `router-outlet`, avec l’en-tête et les dialogues communs. |
| `components/header-bar/header-bar.component.html` | Utilise `routerLink` pour naviguer et `routerLinkActive` pour signaler la page active. |
| `presentation/navigation-state.service.ts` | Appelle `Router.navigate()` et transforme les événements `NavigationEnd` en signal de page active avec `toSignal()`. |
| `presentation/routing/access.guards.ts` | Attend l’initialisation et vérifie les conditions d’accès aux pages. |
| `presentation/routing/exit.guards.ts` | Branche les guards `CanDeactivateFn` de l’éditeur et du test. |
| `presentation/routing/workspace-exit.service.ts` | Orchestre la confirmation de sortie, la libération du verrou et les appels de session. |
| `presentation/account.presenter.ts` | Retourne un `Observable<boolean>` pour la confirmation dans la modale existante. |
| `presentation/routing/router.spec.ts` | Vérifie les routes réelles avec `RouterTestingHarness`. |

## Navigation déclarative et programmation

`routerLink="/maps"` indique une destination dans un template. `routerLinkActive="active"` applique la classe de sélection selon la route. Les opérations nécessitant une étape préalable, comme rejoindre une session, utilisent ensuite `Router.navigate()` à travers `NavigationStateService`.

`router-outlet` instancie le composant de la route. Les pages sont chargées à la demande grâce à `loadComponent`; le composant racine ne sélectionne plus une page avec un `@switch`. Le signal `view` sert aux comportements de présentation dépendant de la page active.

La stratégie `withHashLocation()` conserve les adresses `/#/home`, `/#/maps`, `/#/editor`, `/#/sessions`, `/#/test` et `/#/admin`. Angular gère les changements d’adresse et l’historique Précédent/Suivant. Aucun gestionnaire manuel `hashchange` n’est nécessaire. Une adresse inconnue redirige vers l’accueil.

## Guards d’entrée

Le guard parent attend `StartupService.initialize()`, qui restaure une seule fois le brouillon et l’authentification. Les pages de gestion et d’édition exigent un utilisateur connecté; sinon, une modale de connexion s’ouvre sur l’accueil. Une connexion réussie conduit à la bibliothèque de cartes.

L’éditeur tente de reprendre le verrou d’une carte restaurée. Si le verrou est indisponible, il affiche le problème et retourne à la bibliothèque. L’administration demande son propre jeton. La page de test exige une session active; lors d’un rafraîchissement authentifié, elle peut attendre jusqu’à cinq secondes le snapshot Socket.IO avant de retourner à la liste des sessions.

Ces guards contrôlent le parcours de l’interface. Le serveur conserve ses vérifications d’authentification, de propriété et de droits pour chaque opération.

## Guards de sortie et Observables

Les guards de sortie s’appliquent aux liens, aux appels programmatiques et à l’historique du navigateur. Un brouillon modifié ou une session hébergée demande confirmation avant de quitter l’espace d’édition. Annuler conserve la page et le verrou. Confirmer effectue les opérations nécessaires avant d’autoriser la navigation; une erreur de nettoyage bloque la sortie et affiche un message.

La modale émet `true` ou `false` dans un Observable. Angular Router s’y abonne et gère son désabonnement. Si une autre navigation remplace une confirmation en attente, le nettoyage de l’Observable retire la modale devenue obsolète. Il n’est donc pas nécessaire d’ajouter un `.subscribe()` manuel dans le guard.

Passer de l’éditeur à son propre test conserve le brouillon et le verrou. Revenir du test à l’éditeur laisse la salle ouverte pour permettre sa reprise. Un invité qui quitte un test quitte seulement sa participation. La fermeture ou le rechargement de l’onglet reste traité séparément par `beforeunload`, car ce n’est pas une navigation Angular pouvant attendre la modale.

## Frontières DDD

Le routage appartient à la présentation et à l’assemblage Angular. Les guards orchestrent les services de présentation, qui invoquent les cas d’utilisation clients existants. Les agrégats `MapEditor`, `HexMap` et `TestRoom` ne connaissent ni Router, ni routes, ni composants. Les ports applicatifs restent des interfaces TypeScript indépendantes du framework.

## Validation

Les 16 tests de routage couvrent les liens directs, la restauration d’authentification, la connexion administrateur, les redirections, l’attente de session, les confirmations, les erreurs de déverrouillage, la conservation du brouillon, les sorties hôte/invité et Précédent/Suivant, y compris une navigation annulée. Les tests utilisent les vrais composants de route avec des services réseau factices et neutralisent le rendu du canvas. Ils vérifient la navigation, sans constituer un test visuel du navigateur.

Le client comporte désormais 45 tests dans 6 suites. Exécuter `npm test -- --watch=false`, `npm run lint`, `npm run build` et `npm run architecture` depuis `client`.
