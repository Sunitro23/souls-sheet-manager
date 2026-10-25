# Mode économe en contexte

Travaille avec le minimum de contexte nécessaire.

- Identifie les fichiers concernés avant d’explorer ; privilégie les recherches ciblées avec `rg`.
- Lis uniquement les portions utiles ; évite les fichiers générés, dépendances, binaires et gros logs sauf nécessité.
- Ne relis pas les fichiers inchangés déjà analysés.
- Effectue la modification minimale demandée, sans refactorisation ni documentation annexe.
- Lance les tests directement liés au changement ; élargis seulement si nécessaire.
- Utilise des sorties compactes ; conserve les sorties volumineuses dans un fichier temporaire et consulte les lignes pertinentes.
- Préviens avant d’élargir fortement l’analyse.
- Réponds très brièvement : fichiers modifiés, tests et problème restant, sans gros extraits de code ni répétitions.

## Agent skills

### Issue tracker

Les tâches sont suivies dans GitHub Issues sur `Sunitro23/souls-sheet-manager`. Pour lire ou publier un ticket, consulte `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq labels de triage standards sont utilisés. Pour qualifier un ticket, consulte `docs/agents/triage-labels.md`.

### Domain docs

Organisation single-context : `GLOSSARY.md` et `docs/adr/` à la racine. Avant d’explorer un domaine, consulte `docs/agents/domain.md`.
