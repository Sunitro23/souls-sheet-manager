# Cendres V2 — bilan de la refonte progressive

## Diagnostic initial

React 19 / TypeScript, Vinext sur Vite, Cloudflare Workers et D1, Drizzle. Le dossier `components/ui` contient la bibliothèque shadcn du projet, mais l’interface active emploie du CSS personnalisé, Lucide et des dialogues HTML natifs. Les routes Campagnes, Personnages, DM et Validations partagent `app/page.tsx`. Le backend vérifie les sessions, l’appartenance à la campagne, le rôle MJ, la propriété des personnages et les révisions de sauvegarde.

La présentation était concentrée dans un long composant, avec des styles successifs et un graphe plafonné à environ 430 px. Lint de départ : 61 erreurs et 10 avertissements.

## Sprint 1 — Fondations

- Palette sémantique sombre, typographies Inter et Cinzel, textes secondaires agrandis, contrôles et focus harmonisés, lien d’évitement et réduction des animations.
- Dialogue réutilisable : focus natif, Échap, restauration du focus, message d’erreur, blocage des champs pendant une opération.
- Fichiers : `app/globals.css`, `app/v2.css`, `app/layout.tsx`, `components/modal.tsx`, intégration dans `app/page.tsx`.
- Décision : conserver les composants fonctionnels ; introduire une couche de présentation V2 identifiée au lieu de reconstruire le site.
- Vérification : TypeScript réussi. Contrastes des six couleurs principales sur les trois surfaces : minimum 4,89:1 après correction du rouge PV. Ceci ne constitue pas un audit WCAG complet.

## Sprint 2 — Arbre interactif

- Grand canevas, déplacement par pointeur, zoom molette/pincement, boutons ±, recentrage, adaptation ; plage 50–200 %.
- Tabulation pour les compétences ; flèches, +/−, Début et 0 pour naviguer dans le graphe. Un nœud hors cadre est ramené à l’écran lorsqu’il reçoit le focus.
- Sélection et connexions directes mises en évidence. Acquise / disponible / verrouillée distinguées par texte et icônes.
- Panneau de détails desktop (environ 27 % de largeur), dialogue bas mobile. Conditions tirées du modèle actuel, nœuds verrouillés consultables.
- Fichiers : `components/skill-tree.tsx`, `components/skill-details.tsx`, `lib/graph-view.ts`, `lib/skill-state.ts`, `tests/graph-view.test.mjs`, `app/page.tsx`, `app/v2.css`.
- Décision : garder `layoutTree` et les identifiants/dépendances réels ; pas de React Flow ni nouvelle dépendance.
- Vérification : 22 tests ciblés réussis sur géométrie, ancrage de zoom, progression et races. Concordance UI/règles de déblocage et absence de mutation contrôlées. Gestes réels non testés en navigateur.

## Sprint 3 — Fiche et inventaire

- Ressources avec chiffres, jauges colorées, saisie bornée et contrôles ± accessibles.
- État de sauvegarde : modifications en attente, enregistrement, confirmation réelle et erreur. En cas d’erreur, la page conserve les changements. Les objets modifiés demandent confirmation avant fermeture sans sauvegarde.
- Équipement autour du portrait conservé. Consultation au clic, état sélectionné, action explicite de retrait dans les détails et d’équipement depuis le sac. Les demandes passent par la sauvegarde serveur existante.
- Techniques et zones toujours repliées dans le sac. Grimoire vide avec invitation et ajout explicite.
- Fichiers : `components/resource-meter.tsx`, `components/equipment-loadout.tsx`, `components/inventory-panel.tsx`, `app/page.tsx`, `app/v2.css`.
- Décision : après confirmation de sauvegarde, actualiser le personnage en mémoire depuis la réponse serveur au lieu de relire toute la campagne. Aucun changement d’API ou de règle.
- Vérifications : TypeScript réussi ; test de rendu statique des contrôles, de l’équipement et du contenu replié réussi. Aucun test de panne réseau dans un navigateur n’a été effectué.

## Sprint 4 — Navigation et responsive

- Cartes personnages compactes, portrait, nom, race et niveau ; création explicite et actions secondaires regroupées.
- Mobile à onglets (notes conservées), tablette dédiée, deux colonnes intermédiaires, trois colonnes sur grand écran.
- Fichiers : `components/character-roster.tsx`, `app/page.tsx`, `app/v2.css`.
- Décision : conserver le breakpoint fonctionnel desktop de 1100 px, compte tenu de la largeur nécessaire aux panneaux ; mise en page grand écran dès 1440 px.
- Vérifications : calculs de cadrage aux largeurs 375, 768, 1280 et 1920 px réussis. Ce sont des tests géométriques, pas des captures ni une validation visuelle du responsive.

## Sprint 5 — MJ et finalisation

- Vue synthétique des personnages de campagne : ressources PV/FP/END, joueur, accès à la fiche. Sélecteur de personnage pour le MJ, avec protection des modifications non enregistrées.
- Le même composant de cartes est réutilisé dans la liste et la vue MJ, à partir des données déjà autorisées par le backend.
- Fichiers : `components/character-roster.tsx`, `app/page.tsx`, `tests/ui-render.test.mjs`, `docs/UX_V2.md`.
- Vérifications : 55 tests réussis, y compris règles métier, droits des routes, limites d’équipement, géométrie, états de progression, rendu statique et non-mutation des données d’exemple. TypeScript réussi.
- Lint global exécuté : 58 erreurs et 7 avertissements restants, contre 61 et 10 au départ. Erreurs restantes principalement liées aux types `any` de l’existant. Lint des nouveaux composants/helpers : aucune erreur ; avertissement d’optimisation des portraits natifs.
- La compilation de production est une étape obligatoire avant la publication ; son résultat est communiqué avec la livraison.

## Préservation et limites

- Aucune modification de `lib/rules.ts`, `lib/progression.ts`, `lib/creation.ts`, `lib/combat.ts`, `lib/races.ts`, des API, du schéma ou des migrations.
- Aucun changement des coûts, prérequis, défenses, classes, limites de caractéristiques, inventaire ou permissions. Aucune écriture de données de test dans la base de production.
- Aucun remplacement ou génération de portrait. Aucune nouvelle dépendance installée.
- Navigateur de test indisponible dans cet environnement : pas de captures 375/768/1280/1920, ni de validation manuelle clavier/souris/tactile, ni d’audit WCAG complet. Les tests statiques ne remplacent pas ces vérifications.
- Lint global encore non conforme pour les raisons détaillées ci-dessus. La compatibilité des données est préservée ; aucune nouvelle migration n’est requise.
