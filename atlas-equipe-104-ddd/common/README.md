# Noyau métier partagé

`domain/` contient les modèles, la géométrie, la validation, Dijkstra et l’agrégat MapEditor, sans framework ni accès réseau. `contracts/` expose les formes JSON partagées. `models.ts` et `hex.ts` sont des points d’entrée compatibles pour la présentation. Voir `../ARCHITECTURE.md`.

Les imports internes sont relatifs. `tsconfig.json` permet à l’éditeur d’analyser ce dossier indépendamment. Les alias `@common/*` sont réservés aux applications consommatrices et sont configurés dans leurs tsconfig respectifs.
