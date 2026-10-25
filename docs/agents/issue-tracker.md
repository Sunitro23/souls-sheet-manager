# Issue tracker: GitHub

Les tâches et spécifications sont des issues GitHub dans `Sunitro23/souls-sheet-manager`. Utiliser `gh` depuis ce dépôt ; hors du dépôt, préciser `--repo Sunitro23/souls-sheet-manager`.

## Opérations

- Créer : `gh issue create --title "..." --body-file <fichier.md>`.
- Lire : `gh issue view <numéro> --json number,title,body,labels,comments`.
- Lister : `gh issue list --state open --json number,title,body,labels` ; filtrer avec `--label` si nécessaire.
- Commenter : `gh issue comment <numéro> --body-file <fichier.md>`.
- Qualifier : `gh issue edit <numéro> --add-label "..."` ou `--remove-label "..."`.
- Fermer : `gh issue close <numéro> --comment "..."`.

Écrire les textes multilignes dans un fichier temporaire et utiliser `--body-file`.
« Publier dans le suivi des tâches » signifie créer une issue ; « récupérer le ticket pertinent » signifie lire l’issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Relations entre tickets

Privilégier les sous-issues et dépendances natives lorsque les outils disponibles les prennent en charge. Sinon, ajouter `Part of #<parent>` et `Blocked by: #<numéro>` au début du ticket enfant, et une liste de tâches dans le parent. Un ticket est débloqué lorsque tous ses bloqueurs sont fermés.

Pour `/wayfinder`, la carte est une issue `wayfinder:map` ; ses enfants portent `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` ou `wayfinder:task`. Choisir le premier enfant ouvert, non assigné et sans bloqueur ouvert ; l’assigner avec `gh issue edit <numéro> --add-assignee @me`. À résolution, commenter, fermer et ajouter un lien avec le résultat dans les décisions de la carte.
