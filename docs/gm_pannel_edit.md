# Cahier des charges — Refonte de la navigation GM de Cendres

**Projet :** Cendres — Gestionnaire de personnages JDR  
**Module :** Administration GM / Gestion de campagne  
**Type :** Refonte de la navigation, de l'organisation et de l'ergonomie  
**Priorité :** Haute  
**Utilisation principale :** Préparation des séances  
**Priorité fonctionnelle :** Création et modification du contenu  
**Navigation retenue :** Barre latérale hiérarchisée et dépliable

---

## 1. Objectif général

Je souhaite réorganiser intégralement la navigation du panneau GM afin d'obtenir une interface d'administration plus intuitive, rapide et cohérente.

Le panneau actuel possède de nombreuses fonctionnalités intéressantes, mais son organisation devient complexe.

Plusieurs rubriques donnent accès aux mêmes données, certaines actions nécessitent trop de navigation et les différents systèmes de gestion ne sont pas toujours organisés de manière évidente.

**Je ne souhaite supprimer aucune fonctionnalité existante.**

L'objectif est de conserver la richesse du panneau GM, mais de rendre son utilisation beaucoup plus agréable.

### Priorités

1. Faciliter la création et la modification des objets, sorts, compétences et catégories.
2. Réduire le nombre de clics nécessaires aux actions courantes.
3. Regrouper les fonctionnalités selon leur utilité réelle.
4. Supprimer les doublons de navigation inutiles.
5. Améliorer la recherche globale et les raccourcis.
6. Conserver une architecture évolutive.
7. Harmoniser visuellement l'administration avec le reste de Cendres.

Le panneau doit être pensé avant tout comme **un atelier de création et de préparation pour le maître du jeu**, et non comme un simple panneau technique.

---

## 2. Nouvelle architecture de navigation

Je souhaite remplacer la navigation actuelle par une barre latérale fixe, hiérarchisée, dont les groupes peuvent être dépliés ou repliés.

### Arborescence cible

**TABLEAU DE BORD**
- Vue d'ensemble

**CRÉATION & CONTENU**
- Objets et armes
- Sorts et magie
- Compétences et voies
- Races et classes
- Catégories et écoles

**CAMPAGNE**
- Personnages
- Joueurs

**CONFIGURATION**
- Informations générales
- Règles et progression
- Apparence

**DONNÉES & ADMINISTRATION**
- Import / Export
- Archives
- Historique
- Paramètres avancés

Cette arborescence définit les points d'entrée principaux. Certaines entrées peuvent ouvrir différentes vues d'un même module afin d'éviter de dupliquer les composants et les données.

### Organisation

Le groupe « Création & Contenu » doit être placé en évidence, car il correspond à l'utilisation principale du panneau.

La barre latérale doit permettre de comprendre immédiatement où se trouve une fonctionnalité.

Les intitulés doivent être courts, précis et cohérents.

Éviter les groupes composés principalement de liens qui redirigent vers d'autres groupes.

---

## 3. Comportement de la barre latérale

### Sur ordinateur

La navigation doit être persistante sur la gauche de l'écran.

Elle contient :

- Le nom de la campagne active.
- Un bouton de retour à l'accueil.
- Un accès rapide à la recherche globale.
- Les rubriques principales.
- Les favoris.
- Une commande de réduction de la barre.

### Barre dépliée

Afficher les icônes et les intitulés complets.

Les groupes possédant plusieurs sous-rubriques doivent pouvoir être ouverts et refermés.

L'ouverture d'un groupe ne doit pas obligatoirement refermer les autres.

### Barre réduite

Afficher uniquement les icônes des grandes rubriques.

Au survol ou au focus, afficher une infobulle indiquant leur nom.

Les sous-rubriques peuvent apparaître dans un menu contextuel.

### États visuels

Prévoir :

- Rubrique active clairement identifiable.
- Accent doré discret.
- Indicateur du groupe actuellement ouvert.
- Survol subtil.
- Focus clavier visible.
- Transitions courtes.

### Persistance

Conserver les préférences par compte et par campagne :

- État réduit ou déplié de la barre.
- Groupes ouverts.
- Favoris.
- Densité d'affichage.
- Dernière rubrique consultée.

Ne pas utiliser cette persistance pour contourner une confirmation de modifications non enregistrées.

---

## 4. Tableau de bord — Vue d'ensemble

Conserver le tableau de bord personnalisable existant.

Il doit devenir la véritable page d'entrée de la préparation de campagne.

### Informations affichées

- Nom et couverture de la campagne.
- Description.
- Nombre de joueurs.
- Nombre de personnages.
- Nombre de compétences.
- Modifications récentes.
- Accès rapides.

Conserver le comportement actuel des indicateurs, notamment le comptage des compétences non archivées, y compris les brouillons.

### Accès rapides

Mettre davantage en valeur les actions de création.

Proposer :

- Créer un objet.
- Créer un sort.
- Créer une compétence.
- Ajouter une catégorie.
- Ajouter un joueur.
- Ouvrir les personnages.
- Modifier les règles.

Ces commandes doivent ouvrir directement la bonne rubrique et, si nécessaire, le formulaire correspondant.

Éviter les raccourcis qui ouvrent une page nécessitant encore plusieurs clics.

### Personnalisation

Conserver la possibilité de :

- Masquer ou afficher les blocs.
- Modifier leur ordre.
- Mémoriser la disposition.

Il n'est pas nécessaire de refaire entièrement le tableau de bord : il faut surtout améliorer ses accès rapides et son intégration à la nouvelle navigation.

---

## 5. Création & Contenu — Objets et armes

Cette rubrique doit devenir l'entrée principale pour gérer les objets de la campagne.

### Présentation

Afficher directement la bibliothèque des objets, plutôt qu'un choix initial entre catalogue et bibliothèque.

Conserver :

- Recherche par nom.
- Filtres de catégorie.
- Contenus actifs et archives.
- Création.
- Modification.
- Duplication.
- Aperçu côté joueur.
- Archivage et restauration.

### Organisation recommandée

**Barre supérieure**
- Titre « Objets et armes ».
- Bouton « Créer un objet ».
- Raccourci « Gérer les catégories d'armes et d'objets ».

**Barre de recherche et filtres**
- Recherche.
- Catégorie.
- Personnage propriétaire.
- État : actif ou archivé.

**Liste**
- Nom.
- Type.
- Personnage propriétaire.
- Statistiques principales.
- Actions.

Le filtre par propriétaire serait une amélioration à ajouter : actuellement, le choix du personnage destinataire sert à la création et ne filtre pas la bibliothèque.

Il faut donc bien distinguer ces deux contrôles.

### Éditeur d'objet

Conserver tous les types existants :

- Arme
- Armure
- Bouclier
- Talisman
- Consommable
- Catalyseur / instrument
- Objet

Conserver leurs champs spécifiques, bonus, effets, cendres de guerre, zones et propriétés.

### Navigation dans l'éditeur

Pour les formulaires longs, prévoir une navigation interne claire :

1. Informations générales.
2. Statistiques et équipement.
3. Bonus.
4. Effets et propriétés.
5. Cendre de guerre, si applicable.

Ne pas afficher inutilement les sections non pertinentes pour le type d'objet.

### Gestion des données

Important : la bibliothèque actuelle regroupe les objets appartenant aux personnages. Elle n'est pas un catalogue indépendant d'objets génériques.

Il faut conserver cette logique pour cette refonte.

Ne pas introduire de bibliothèque globale de modèles sans demande spécifique.

---

## 6. Création & Contenu — Sorts et magie

Cette rubrique doit reprendre la même organisation que « Objets et armes ».

### Présentation

Afficher directement la bibliothèque des sorts.

Conserver :

- Création d'un sort.
- Recherche.
- Filtres par école magique.
- Sélection du personnage destinataire.
- Modification.
- Duplication.
- Aperçu côté joueur.
- Archivage et restauration.

Ajouter un filtre distinct par personnage propriétaire.

### Raccourcis contextuels

Prévoir :

- « Gérer les écoles de magie » : ouvre Catégories et écoles avec le type correspondant déjà sélectionné.
- « Gérer les voies magiques » : ouvre Compétences et voies avec la famille Magie présélectionnée.

Éviter les redirections nécessitant une nouvelle sélection manuelle.

### Formulaire

Conserver les champs existants :

- Nom.
- Famille magique.
- Description.
- Dégâts.
- Rang.
- Coûts FP et END.
- Connu / Mémorisé.
- Effets.
- Cible et portée.
- Origine et zone d'effet.
- Affectation des alliés.

Garder la possibilité d'utiliser à la fois des données structurées et des descriptions libres.

### Cohérence avec les objets

Les bibliothèques Objets et Sorts doivent réutiliser les mêmes composants :

- Tableaux.
- Champs de recherche.
- Filtres.
- Boutons.
- Aperçus.
- États vides.
- Retours de sauvegarde.

Seuls les champs et les règles métier doivent différer.

---

## 7. Création & Contenu — Compétences et voies

Cette rubrique est particulièrement importante pour la préparation de Cendres.

Elle doit permettre de construire et gérer rapidement les arbres de progression.

### Vues à conserver

**Vue en tableau**

Destinée à la gestion de nombreuses compétences.

Conserver :
- Recherche.
- Filtre par famille.
- Filtre par voie.
- Filtre de publication.
- Niveau minimum.
- Coût.
- Édition directe du niveau et du coût.
- Sélection multiple.
- Publication et archivage groupés.
- Duplication.

**Vue arbres et cartes**

Destinée à visualiser la structure des voies et leurs prérequis.

Conserver la progression en branches, les rangs et les relations entre compétences.

### Organisation

En haut de page :

- Choix de la famille.
- Choix de la voie.
- Recherche.
- Bascule Tableau / Arbres.
- Bouton « Créer une compétence ».
- Bouton de sauvegarde.

### Amélioration de navigation

Lorsqu'une famille est sélectionnée, afficher uniquement les voies correspondantes.

Le changement de famille doit réinitialiser uniquement les filtres devenus incompatibles, comme le filtre de voie.

Les filtres de niveau et de coût doivent conserver leur fonctionnement actuel par valeur exacte, avec des libellés explicites.

### Panneau de consultation

Un clic sur une compétence dans la vue des arbres pourrait ouvrir un panneau latéral présentant :

- Nom.
- Famille.
- Voie.
- Nature.
- Niveau.
- Coût.
- Description.
- Prérequis.
- Publication.
- Actions.

Ce panneau doit reprendre le style de ceux déjà présents dans l'interface joueur.

Pour modifier une compétence complexe, ouvrir un formulaire d'édition suffisamment large.

Ne pas imposer tous les champs de l'éditeur dans un panneau trop étroit.

### Gestion des modifications

Conserver :

- Application locale des changements.
- Sauvegarde finale de l'arbre.
- Vérification des prérequis.
- Refus des dépendances circulaires.
- États brouillon, publié et archivé.

L'aperçu des cartes publiées ne doit pas être confondu avec l'aperçu réel d'un personnage.

---

## 8. Création & Contenu — Races et classes

Cette rubrique doit conserver la gestion des races et des classes, tout en évitant de dupliquer le catalogue.

### Navigation

Afficher deux onglets :

- Races.
- Classes.

Ces onglets doivent utiliser l'éditeur de catégories existant, avec le type correspondant présélectionné.

### Fonctionnalités conservées

- Création.
- Modification.
- Duplication.
- Archivage.
- Restauration.
- Icônes et couleurs.
- Ordre d'affichage.
- Catégorie parente.
- Description.
- Traits et faiblesses.
- Disponibilité à la création.

### Liens contextuels

Depuis une race ou une classe, proposer un accès direct aux compétences correspondantes.

Exemple : « Voir les compétences de cette race ».

La modification des compétences doit rester dans le module Compétences et voies.

Ne pas créer un second éditeur de compétences dans cette rubrique.

---

## 9. Création & Contenu — Catégories et écoles

Je souhaite centraliser la gestion des catégories.

### Organisation

Une seule rubrique permettant de gérer les six types existants :

- Armes.
- Objets.
- Écoles de magie.
- Familles de compétences.
- Races.
- Classes.

### Navigation

Afficher un sélecteur de type ou des onglets.

Chaque type affiche les catégories correspondantes.

Conserver :

- Création.
- Recherche.
- Tri par ordre.
- Modification.
- Duplication.
- Aperçu.
- Archivage.
- Restauration.
- Associations.
- Disponibilité à la création.

### Édition

Conserver les champs existants et leurs contraintes :

- Nom.
- Type.
- Icône.
- Couleur.
- Ordre.
- Parent.
- Référence mécanique.
- Description.
- Paramètres spécifiques.
- Disponibilité.
- Archivage.

### Règle importante

Les autres rubriques peuvent ouvrir cette page avec un filtre présélectionné, mais ne doivent pas créer leur propre copie du catalogue.

Les références mécaniques doivent continuer à respecter les restrictions existantes, notamment les champs verrouillés sur les catégories déjà créées.

---

## 10. Campagne — Personnages

Conserver la gestion des personnages actifs et archivés.

### Liste principale

Afficher :

- Portrait.
- Nom.
- Joueur propriétaire.
- Race.
- Classe.
- Niveau.
- Actions.

Conserver les filtres combinables par joueur, race et classe.

Conserver également la personnalisation des colonnes visibles.

### Actions

- Ouvrir la fiche.
- Voir comme un joueur.
- Accéder aux archives.
- Restaurer un personnage.

Les modifications de caractéristiques et ressources continuent de s'effectuer depuis les fiches, conformément au fonctionnement existant.

Ne pas créer un éditeur concurrent dans le panneau GM.

---

## 11. Campagne — Joueurs

Conserver les fonctionnalités actuelles :

- Ajouter un joueur par pseudo.
- Rechercher un joueur.
- Trier les joueurs.
- Consulter leurs personnages.
- Ouvrir une fiche.
- Retirer un joueur de la campagne.

Préserver les validations existantes :

- Le compte doit exister pour être ajouté.
- Le GM propriétaire ne peut pas être retiré.
- Le compte connecté ne peut pas se retirer par cette commande.
- Le retrait d'un joueur ne supprime pas ses personnages.

Améliorer les liens entre Joueurs et Personnages afin de pouvoir passer rapidement de l'un à l'autre.

---

## 12. Configuration

### Informations générales

Cette page rassemble :

- Nom de la campagne.
- Image de couverture.
- Description.

Elle remplace l'accès actuellement situé dans Règles → Général.

### Règles et progression

Réunir les véritables paramètres de règles :

- Points gagnés par niveau.
- Paramètres de progression.
- Informations techniques sur la version des règles.

Conserver les validations protégeant les compétences déjà acquises et les points dépensés.

Les rubriques Armes, Magie et Création ne doivent plus être présentées comme des sous-pages de règles si elles ne sont que des liens vers les catalogues.

Elles peuvent apparaître comme des raccourcis contextuels.

### Apparence

Conserver :

- Palettes de couleurs.
- Couleurs personnalisées.
- Styles magiques.
- Styles d'armes.
- Aperçu du thème.
- Enregistrement.
- Restauration des valeurs par défaut.
- Validation du contraste.

La nouvelle navigation GM doit conserver l'identité artistique de Cendres tout en respectant les paramètres de thème de la campagne.

---

## 13. Données et administration

Regrouper les opérations administratives moins fréquentes dans une zone clairement identifiée.

### Import / Export

Conserver :

- Export JSON de la campagne.
- Import de préréglages d'apparence et de catégories.

Clarifier explicitement les limites des opérations actuelles :

- L'export ne contient pas les modifications de formulaire non enregistrées.
- Il ne contient pas les personnages archivés.
- L'import existant ne restaure pas intégralement une campagne : il concerne l'apparence et les catégories.

Il ne faut pas présenter cet import comme une restauration complète.

### Archives

Centraliser les raccourcis vers :

- Personnages archivés.
- Objets archivés.
- Sorts archivés.
- Compétences archivées.
- Catégories archivées.

Cette page peut être un point d'accès, sans créer un second système de stockage ou d'édition.

### Historique

Conserver l'historique des changements disponible, avec :

- Action.
- Auteur.
- Date.
- Heure.

Ne pas le présenter comme un journal exhaustif de chaque interaction.

### Paramètres avancés

Regrouper les actions sensibles, notamment l'archivage de campagne.

Conserver la confirmation par saisie exacte du nom de la campagne.

Ces opérations doivent être visuellement séparées des actions courantes.

---

## 14. Recherche globale améliorée

Je souhaite une recherche globale réellement utile pendant la préparation.

### Accès

- Champ de recherche dans le panneau GM.
- Raccourci clavier Ctrl + K sur ordinateur.
- Accès conservé lorsque la barre latérale est réduite.

### Périmètre

Permettre de rechercher :

- Rubriques administratives.
- Actions de création.
- Personnages.
- Joueurs.
- Objets.
- Sorts.
- Compétences.
- Voies.
- Catégories.

La recherche actuelle couvre déjà une partie de ces éléments. Les joueurs, les destinations administratives et les actions rapides seraient des extensions à prévoir.

### Affichage des résultats

Regrouper les résultats par type.

Pour chaque résultat, afficher un contexte :

- Nom.
- Type.
- Campagne.
- Personnage propriétaire, si applicable.
- Famille ou catégorie pertinente.

Exemple :

« Son Crispant — Sort — Avesdios »

### Comportement au clic

Un résultat doit mener directement à l'élément concerné.

Il ne doit pas simplement ouvrir une liste dans laquelle l'utilisateur doit rechercher à nouveau le contenu.

Si un filtre enregistré masque l'élément, l'application doit adapter les filtres nécessaires et expliquer ce changement.

### Cas particuliers

- Aucun résultat : message explicite.
- Beaucoup de résultats : regroupement et possibilité d'en afficher davantage.
- Contenu archivé : état clairement signalé.
- Modification non enregistrée : confirmation avant navigation.

Le résultat doit toujours appartenir à la campagne active.

---

## 15. Favoris et raccourcis

### Favoris

Conserver le système existant.

Permettre d'épingler les rubriques fréquentes dans une zone en haut de la barre latérale.

Les favoris doivent ouvrir les mêmes modules que la navigation principale.

Ils ne doivent pas créer de pages parallèles.

### Actions rapides

Ajouter une commande globale « Créer » permettant d'accéder rapidement à :

- Nouvel objet.
- Nouveau sort.
- Nouvelle compétence.
- Nouvelle catégorie.

Éventuellement, proposer l'ajout d'un joueur et l'accès à la création de personnage lorsque ces actions sont autorisées.

### Retour au contexte

Lorsqu'un GM passe d'un module à un autre puis revient, restaurer autant que possible :

- La rubrique précédente.
- Le filtre actif.
- La recherche locale.
- L'élément sélectionné.
- La position de défilement.

Cela est particulièrement important lorsqu'on prépare plusieurs contenus liés.

---

## 16. Navigation contextuelle et liens directs

Chaque contenu doit pouvoir renvoyer vers les éléments auxquels il est lié.

Exemples :

**Depuis un objet**
- Ouvrir son personnage propriétaire.
- Gérer sa catégorie.
- Prévisualiser son rendu joueur.

**Depuis un sort**
- Ouvrir son école magique.
- Ouvrir les voies magiques.
- Ouvrir son personnage propriétaire.

**Depuis une compétence**
- Ouvrir sa voie.
- Consulter ses prérequis.
- Accéder aux catégories correspondantes.

**Depuis un personnage**
- Consulter sa fiche.
- Voir ses objets.
- Voir ses sorts.
- Prévisualiser ses compétences.

### URLs

Dans la mesure du possible, prévoir des URLs ou paramètres d'URL permettant d'ouvrir directement :

- Une rubrique.
- Une sous-vue.
- Un élément sélectionné.
- Un filtre pertinent.

Les boutons Précédent et Suivant du navigateur doivent fonctionner correctement.

Conserver le point d'entrée `/dm` et les autorisations GM / administrateur existantes.

---

## 17. Gestion des enregistrements

C'est un point important de l'expérience utilisateur.

Le panneau actuel utilise plusieurs mécanismes de sauvegarde qu'il faut conserver sans les rendre ambigus.

### Catalogues et compétences

Les modifications sont d'abord appliquées localement, puis enregistrées.

Je souhaite rendre cette distinction explicite.

Par exemple :

- « Appliquer au brouillon » : met à jour l'édition locale.
- « Enregistrer les changements » : sauvegarde les données.
- « Modifications non enregistrées » : indicateur visible.

### Objets et sorts

Conserver leur fonctionnement d'enregistrement direct dans les données du personnage concerné.

### Préférences d'affichage

Conserver leur sauvegarde automatique locale.

### Protections

Lorsqu'un utilisateur tente de quitter une édition :

- Détecter les modifications non enregistrées.
- Demander confirmation si nécessaire.
- Permettre de rester sur la page.
- Ne pas perdre silencieusement des modifications.

Les actions de sauvegarde doivent afficher un état de traitement, une confirmation ou une erreur claire.

Ne pas introduire de sauvegarde automatique des formulaires métier sans revoir explicitement leur fonctionnement.

---

## 18. Voir comme un joueur

Conserver cette fonctionnalité et la rendre plus facile d'accès.

### Emplacement

Ajouter une commande accessible depuis l'en-tête du panneau GM.

### Comportement

- Sélectionner un personnage.
- Afficher sa fiche enregistrée.
- Consulter son inventaire.
- Consulter son grimoire.
- Consulter ses compétences.
- Changer de famille de compétences.

Conserver le mode lecture seule.

### Améliorations

Mémoriser le personnage sélectionné pendant la session d'aperçu.

Lorsqu'on revient à l'administration, retrouver la page, les filtres et la sélection précédents.

### Distinction importante

Conserver la différence entre :

**Prévisualiser côté joueur :** aperçu d'un contenu, éventuellement en cours d'édition.

**Voir comme un joueur :** aperçu des données enregistrées du personnage, sans action de jeu.

Ces commandes ne doivent pas être confondues.

---

## 19. Direction artistique et cohérence visuelle

La navigation GM doit rester cohérente avec la nouvelle interface Cendres.

### Style

- Fond sombre.
- Or vieilli.
- Typographie raffinée.
- Bordures fines.
- Séparateurs discrets.
- Icônes cohérentes.
- États de sélection homogènes.

### Différence avec l'interface joueur

L'administration n'a pas besoin d'être aussi décorative que la fiche de personnage.

Elle doit privilégier :

- La lisibilité.
- La densité d'informations.
- La rapidité de navigation.
- La clarté des formulaires.

Conserver l'élégance dark fantasy sans transformer chaque réglage en grande carte décorative.

### Composants partagés

Réutiliser les éléments existants lorsque c'est pertinent :

- Boutons.
- Champs.
- Onglets.
- Panneaux latéraux.
- Messages de confirmation.
- Listes.
- Filtres.
- Indicateurs d'état.

Les composants métier peuvent rester distincts.

---

## 20. Responsive, accessibilité et performances

### Ordinateur

C'est le support prioritaire.

La barre latérale doit exploiter raisonnablement l'espace, sans réduire excessivement les formulaires.

Les tableaux doivent pouvoir afficher une quantité importante de contenu.

### Mobile

Conserver une utilisation fonctionnelle :

- Barre latérale sous forme de menu.
- Navigation accessible.
- Panneaux adaptés à la largeur.
- Formulaires sans débordement horizontal.

### Accessibilité

Prévoir :

- Navigation clavier.
- Focus visible.
- Libellés explicites.
- Contrastes suffisants.
- Taille de texte lisible.
- États non identifiés uniquement par la couleur.

### Performances

Éviter les dépendances lourdes pour les animations.

Les listes importantes doivent rester fluides.

Ne pas recharger inutilement toutes les données de campagne à chaque changement de rubrique.

---

## 21. Contraintes techniques

La refonte doit principalement concerner l'architecture frontend et la navigation.

### À préserver impérativement

- Permissions GM / administrateur.
- Données de campagne.
- Personnages et joueurs.
- Objets et sorts.
- Compétences et prérequis.
- Catalogues communs.
- Archives.
- Historique.
- Publication et brouillons.
- Règles de validation.
- Mécanismes d'enregistrement.
- Préférences existantes, lorsque compatibles.

### Architecture

Réutiliser les composants déjà présents dans le projet.

Les principaux fichiers identifiés dans la documentation comprennent notamment :

- `components/admin/console.tsx`
- `components/admin/catalog.tsx`
- `components/admin/library.tsx`
- `components/admin/skills.tsx`
- `components/admin/appearance.tsx`
- `components/admin/player-preview.tsx`

Ces chemins servent de points de repère, pas d'obligation de restructuration.

### Recommandations

- Centraliser la définition des rubriques dans une configuration de navigation.
- Associer chaque rubrique à une destination stable.
- Réutiliser les composants de catalogue et de bibliothèque.
- Séparer logique de navigation, affichage et logique métier.
- Éviter les duplications de formulaires.
- Préserver les identifiants et références existants.
- Maintenir la compatibilité des données.

---

## 22. Parcours utilisateur à optimiser

### Scénario A — Créer un sort

1. Ouvrir le panneau GM.
2. Choisir « Sorts et magie ».
3. Cliquer sur « Créer un sort ».
4. Sélectionner le personnage destinataire.
5. Renseigner les caractéristiques.
6. Prévisualiser.
7. Enregistrer.

Le GM ne doit pas passer par plusieurs pages intermédiaires.

### Scénario B — Modifier une compétence

1. Ouvrir « Compétences et voies ».
2. Sélectionner la famille.
3. Rechercher la compétence.
4. Ouvrir son éditeur.
5. Modifier et appliquer.
6. Enregistrer les changements.

La présence de modifications locales non enregistrées doit rester visible.

### Scénario C — Modifier une école de magie

1. Ouvrir « Sorts et magie ».
2. Cliquer sur « Gérer les écoles ».
3. Arriver directement dans les catégories de type Écoles de magie.
4. Modifier l'école.
5. Appliquer puis enregistrer.

### Scénario D — Vérifier une compétence côté joueur

1. Ouvrir la compétence.
2. Accéder à « Voir comme un joueur ».
3. Sélectionner le personnage.
4. Vérifier les conditions et les acquis.
5. Revenir exactement à la compétence consultée.

### Scénario E — Retrouver un contenu

1. Appuyer sur Ctrl + K.
2. Saisir le nom du contenu.
3. Sélectionner le résultat.
4. Arriver directement à l'élément correspondant.

Ce dernier parcours doit être particulièrement rapide.

---

## 23. Critères de validation

### Navigation

- [ ] Barre latérale dépliable et réductible.
- [ ] Groupes clairement hiérarchisés.
- [ ] Rubrique active identifiable.
- [ ] Favoris conservés.
- [ ] Fil d'Ariane conservé.
- [ ] Préférences mémorisées par compte et campagne.
- [ ] Retour à l'accueil fonctionnel.
- [ ] Navigation compatible avec les boutons du navigateur.

### Contenus

- [ ] Toutes les fonctionnalités d'objets sont conservées.
- [ ] Toutes les fonctionnalités de sorts sont conservées.
- [ ] Les compétences et leurs états fonctionnent.
- [ ] Les catégories utilisent un catalogue commun.
- [ ] Les races et classes restent configurables.
- [ ] Les bibliothèques conservent les associations aux personnages.
- [ ] Les archives et restaurations fonctionnent.

### Recherche

- [ ] Recherche globale accessible.
- [ ] Raccourci Ctrl + K.
- [ ] Résultats contextualisés.
- [ ] Ouverture directe des éléments.
- [ ] Gestion des filtres incompatibles.
- [ ] Recherche limitée aux données autorisées de la campagne.

### Édition

- [ ] Formulaires complets conservés.
- [ ] Sauvegarde cohérente.
- [ ] Modifications non enregistrées signalées.
- [ ] Confirmations conservées.
- [ ] Aucun changement métier involontaire.
- [ ] Aucun contenu perdu.

### Ergonomie

- [ ] Rubriques facilement identifiables.
- [ ] Raccourcis contextuels fonctionnels.
- [ ] Retour au contexte précédent.
- [ ] Style cohérent avec Cendres.
- [ ] Navigation adaptée à l'ordinateur.
- [ ] Mobile toujours fonctionnel.

---

## 24. Ordre de réalisation

### Phase 1 — Architecture

Mettre en place la nouvelle barre latérale, les groupes, les destinations et la gestion de la rubrique active.

### Phase 2 — Regroupement des modules

Réorganiser les points d'accès sans dupliquer les catalogues, éditeurs et bibliothèques.

### Phase 3 — Recherche et raccourcis

Développer les accès directs, la recherche globale améliorée et la navigation contextuelle.

### Phase 4 — Édition et sauvegarde

Clarifier les états d'édition, les confirmations et le retour au contexte précédent.

### Phase 5 — Finitions visuelles

Appliquer le design Cendres, harmoniser les composants et vérifier les différents formats d'écran.

### Phase 6 — Tests

Vérifier chaque rubrique, formulaire, filtre, sauvegarde, archive, aperçu et autorisation.

---

## 25. Résultat final attendu

Je souhaite transformer le panneau GM en un **véritable espace de travail pour préparer mes campagnes**.

Il doit permettre de créer, modifier, organiser et retrouver rapidement les contenus du jeu.

Je veux pouvoir passer naturellement d'une compétence à sa voie, d'un sort à son école magique, d'un objet à son personnage propriétaire ou d'une race à ses compétences.

La navigation doit être structurée, rapide et prévisible.

**Les trois principes fondamentaux sont :**

1. **Une barre latérale claire**, organisée autour des besoins du GM.
2. **Une gestion du contenu prioritaire**, avec des raccourcis et une recherche efficace.
3. **Une cohérence fonctionnelle et esthétique**, sans duplication ni suppression des fonctionnalités existantes.

L'objectif n'est pas de simplifier Cendres en retirant des possibilités, mais de rendre sa richesse fonctionnelle beaucoup plus accessible.

Je souhaite une véritable amélioration de l'architecture de navigation, et pas uniquement un changement de position des boutons ou de leur apparence.