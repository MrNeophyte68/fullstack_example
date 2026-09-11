# Validation logicielle

## Stratégie

Les calculs de carte partagés sont testés séparément. Les tests du serveur traversent ensuite les contrôleurs HTTP, cas d’utilisation, agrégats et adaptateurs, une vraie instance MongoDB éphémère et Socket.IO. Les tests Angular couvrent l'historique d'édition, les règles d'objets, les filtres, les confirmations et le rendu de vues.

## Cas couverts

- Création tout-eau, lignes alternées, voisinage symétrique, rayons de 1/7/19/37 tuiles.
- Carte malformée, coordonnées dupliquées, objets sur terrain interdit.
- Quatre départs, présence de ville, réseau routier des villes.
- Dijkstra pondéré : destination inaccessible, routes sur l'eau, détour plus long mais plus rapide.
- Ligne hexagonale continue et remplissage connexe.
- Historique : un glisser = une action, annulation bloquée pendant l'action, redo invalidé par une nouvelle action.
- Redimensionnement : aperçu réversible et conservation des tuiles lors d'un aller-retour du curseur.
- Réinitialisation annulable, bordure extérieure au seau, retrait automatique des objets interdits.
- Comptes : mot de passe faible, doublon insensible à la casse, mauvais mot de passe, connexion simultanée refusée.
- Cartes : persistance, confidentialité, noms uniques, concurrence d'édition, droits du propriétaire et duplication.
- Sessions : carte invalide refusée, NIP incorrect, configuration réservée à l'hôte, clavardage synchronisé et longueur maximale.
- Déplacement annoncé aux clients, annulation au prochain centre, sortie de l'hôte sans fermeture et reprise préservant configuration/messages.
- Administration : accès protégé, suppression et révocation du compte.
- Client : filtres de cartes, confirmation avant suppression/déconnexion, vérification de mot de passe avant requête.
- DOM Angular : équipe affichée, accès invité à la gestion ouvrant une modale de connexion.

## Contrôles manuels de remise

Vérifier sur Chrome et Firefox : placement et retrait de chaque objet; glisser rapide; zoom sous le pointeur et aux bords; export PNG avec zoom/pan; clavier et focus des modales; dimension 15 et 45; disposition à différentes tailles d'écran. Avec quatre clients, vérifier les couleurs, le trajet continu, les changements de vitesse, les arrivées/sorties, la suppression d'une carte active, la révocation par l'administrateur, le rafraîchissement et la fermeture d'onglet.

Les cas manuels ne sont pas présentés comme exécutés par les tests jsdom. Docker Compose doit être vérifié sur une machine disposant de Docker avant publication.


## Tests de la refonte DDD

- Domaine `HexMap` : sauvegarde des brouillons, confidentialité, propriété, snapshots indépendants et tuiles malformées.
- Cas d’utilisation de cartes avec repository et bus factices : verrous, déconnexion, duplication sans verrou et retrait d’accès public.
- Domaine `TestRoom` : place réservée à l’hôte, départs distincts, annulation après le segment courant, changement de vitesse au prochain segment et arrivées obsolètes après reprise.
- Identity avec ports factices : validation avant persistance, connexion exclusive, grâce de reconnexion, expiration administrateur et nettoyage des cartes.
- Application cliente sans Angular : jeton périmé, connexion réussie, transmission des credentials au port, révocation et indisponibilité temps réel.
- `npm run architecture` : dépendances dirigées vers le cœur et interdiction des effets de bord directs dans les modèles et cas d’utilisation.

Total actuel : **31 tests serveur + 45 tests client = 76 tests**. Les 45 tests client ont été exécutés après la migration du routeur; les résultats serveur proviennent de la refonte DDD précédente. Les tests d’intégration utilisent toujours MongoDB réel et Socket.IO. Les doublures des tests de cas d’utilisation ne remplacent pas cette validation des adaptateurs.


## Vérifications RxJS

Les 29 tests client ont été exécutés après l’intégration RxJS. Les 31 tests serveur étaient déjà passés lors de la refonte DDD; cette évolution Angular ne modifie pas le backend.

- `angular-http.adapter.spec.ts` : Observable froid, en-têtes et corps HTTP, pont Promise, fin d’abonnement, annulation, erreurs de validation et réseau.
- `socket-connection.spec.ts` : désabonnement individuel, nettoyage de tous les écouteurs, abonnement tardif après fermeture, accusé de réception unique, interruption d’une commande et transport indisponible.
- `app.component.spec.ts` : recherche conservant seulement le dernier texte après 200 ms, mise à jour de la durée, arrêt du timer sans session et destruction de l’injecteur.
- `atlas-client.spec.ts` : aucune reconnexion après destruction, même si une restauration de profil se termine plus tard.

Les tests HTTP utilisent `provideHttpClientTesting()` et `HttpTestingController`, sans requêtes vers un serveur réel. Les tests SocketConnection utilisent un transport factice pour vérifier précisément l’ajout et le retrait des écouteurs. Les tests d’intégration serveur existants couvrent les événements réels.

## Vérifications Angular Router

Les 45 tests client passent dans 6 suites, dont 16 tests de routage avec `RouterTestingHarness`. Ils couvrent l’authentification restaurée, les liens directs protégés, l’administration, la restauration de session, le verrou du brouillon, les confirmations annulées ou remplacées, les erreurs de sortie, les transitions éditeur/test, les sorties des invités et l’historique Précédent/Suivant. Les tests utilisent les routes et composants réels avec des services réseau factices; le rendu du canvas est neutralisé. Voir `ANGULAR-ROUTER.md`.
