# Correspondance avec les exigences

Sources : document « Éditeur de cartes à tuiles hexagonales », LOG2995 automne 2026, et classeur `LOG2995_20263_GrilleCorrection.xlsx` fournis par l'équipe.

| Groupe de critères | Implémentation |
|---|---|
| Vue initiale | Nom/logo Atlas, équipe 104 et six membres, choix centraux, comptes en haut à droite |
| Comptes | Création/connexion en modales, unicité sans casse, scrypt, profil, modification du mot de passe, suppression en cascade, connexion exclusive |
| Gestion des cartes | Liste actualisée par événements, filtres, propriétaire, visibilité, date, verrou d'édition, création, copie, suppression |
| Administration | Route `/#/admin`, mot de passe d'environnement, liste des comptes, confirmations, changement du mot de passe, révocation, suppression et réinitialisation |
| Surface d'édition | Canvas noir, cinq terrains, lignes impaires de 15 à 45, centrage, zoom au pointeur/centre et déplacement borné |
| Outils | Pinceau à rayon 1–4, remplissage/bordure, inspecteur, routes connectées et lignes, villes/départs avec restrictions |
| Panneau droit | Historique par action, taille et aperçu, réinitialisation, inventaire, sauvegarde, PNG de la vue courante, avertissement à la sortie |
| Validation des cartes | Quatre départs, ville, connexions routières et accessibilité des terrains traversables |
| Sessions | Solo/public/protégé, invités, limite de quatre, départs aléatoires, sortie/reprise de l'hôte, copie de carte indépendante |
| Déplacement | Dijkstra pondéré, aperçu, animation interpolée, compte à rebours, arrêt au prochain centre et configuration en direct |
| Clavardage | Participants/couleurs, messages système, heure et auteur, limite 200, T/Entrée/Échap |
| Validation logicielle | Tests Angular/Vitest, Jest, MongoDB et Socket.IO; stratégie et cas limites dans TESTS.md |
| Assurance qualité | Composants séparés, services, modèles partagés, constantes nommées, contrôle des droits, variables d'environnement, ESLint conservé |

## Limites à prendre en compte à la remise

- Les évaluations UX, tests manuels multi-navigateurs et vérification du déploiement ne sont pas remplacés par les tests unitaires.
- La fermeture d'onglet utilise une grâce de reconnexion de 2,5 secondes afin de préserver l'authentification lors d'un rafraîchissement.
- Le brouillon de carte est conservé par onglet pour le rafraîchissement. L'historique undo/redo et la caméra recommencent après un rechargement complet.
- Les sessions et verrous sont locaux à une instance serveur; ils ne survivent pas à son redémarrage.
- Les critères concernant tags de remise, branches, revues de merge requests et suivi GitLab nécessitent le véritable travail collaboratif de l'équipe.
