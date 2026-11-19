# Panneau GM — arborescence et guide des commandes

Ce document décrit le panneau **Gestion GM / Administration de campagne** tel qu’il est implémenté dans l’état local du projet au 8 novembre 2026. Il couvre ses rubriques, formulaires, boutons, filtres et aperçus.

Le périmètre comprend uniquement le panneau GM. Lorsqu’un bouton ouvre une fiche de personnage ou revient à l’accueil, sa destination est indiquée ; les écrans extérieurs au panneau ne sont pas détaillés. Le panneau Owlbear, le compte utilisateur et les interfaces de jeu sont hors périmètre.

## 1. Arborescence

```text
Gestion GM — Administration de la campagne active
│
├── Commandes communes
│   ├── Menu Administration, favoris et fil d’Ariane
│   ├── Densité d’affichage
│   ├── Recherche globale
│   └── Voir comme un joueur
│       ├── Choix du personnage
│       ├── Fiche
│       ├── Inventaire
│       ├── Grimoire
│       └── Compétences → choix de la famille
│
├── Général
│   ├── Vue d’ensemble
│   │   ├── Personnaliser le tableau de bord
│   │   ├── Indicateurs
│   │   ├── Accès rapides
│   │   └── Modifications récentes
│   ├── Joueurs
│   │   ├── Ajout par pseudo
│   │   └── Liste, recherche, tri et retrait
│   └── Personnages
│       ├── Liste active, filtres et colonnes
│       └── Archives des personnages → restauration
│
├── Contenu
│   ├── Armes et objets
│   │   ├── Catégories et écoles → catalogue Armes / Objets
│   │   │   └── Éditeur de catégorie → icône d’arme, si applicable
│   │   └── Bibliothèque de contenus
│   │       ├── Contenus actifs / Archives
│   │       └── Création, modification, duplication et aperçu
│   │           ├── Informations générales et statistiques
│   │           ├── Équipement et bonus
│   │           ├── Effets et propriétés
│   │           └── Cendre de guerre, pour une arme ou un bouclier
│   ├── Magie et sorts
│   │   ├── Catégories et écoles → catalogue Écoles de magie
│   │   ├── Bibliothèque de contenus
│   │   │   ├── Sorts actifs / Archives
│   │   │   └── Éditeur de sort → préparation, effets et zone
│   │   └── Voies et spécialisations → rubrique Compétences
│   ├── Compétences
│   │   ├── Voies et cartes / Vue en tableau
│   │   ├── Filtres et aperçu des contenus publiés
│   │   ├── Publication ou archivage de la sélection
│   │   └── Éditeur de compétence → identité, effets et prérequis
│   └── Races et classes
│       └── Catalogue Races / Classes → traits et faiblesses
│
└── Configuration
    ├── Règles
    │   ├── Général
    │   ├── Progression
    │   ├── Armes → Armes et objets
    │   ├── Magie → Magie et sorts
    │   ├── Création → Races et classes
    │   ├── Apparence → rubrique Apparence
    │   ├── Données → rubrique Données
    │   └── Avancé → paramètres sensibles et archivage de campagne
    ├── Apparence
    │   ├── Palettes et couleurs
    │   ├── Styles de magie et d’armes
    │   └── Aperçu du thème
    ├── Catégories
    │   └── Catalogue commun des six types de catégories
    └── Données
        ├── Export JSON
        ├── Accès aux archives des personnages
        ├── Import d’un préréglage
        ├── Historique des changements
        └── Restauration de l’apparence et de la description
```

Les onze rubriques du menu sont des vues du même panneau. Les formulaires et aperçus ci-dessus sont des états internes à ces vues. L’entrée dédiée au panneau est `/dm` ; le bouton **Gestion GM** permet également d’y accéder depuis la campagne.

## 2. Accès et commandes communes

Le panneau concerne la campagne active. Son accès est accordé au GM de cette campagne ainsi qu’aux comptes administrateurs.

| Commande | Fonctionnement |
| --- | --- |
| **Accueil** | Quitte la gestion GM et revient à l’accueil de la campagne. Ce bouton appartient au bandeau entourant le panneau. |
| **☰ Administration** | Ouvre ou referme le menu latéral lorsque la présentation affiche ce bouton. |
| Bouton d’une rubrique | Affiche la rubrique choisie. Le menu indique la rubrique courante et le nom de la campagne. |
| **☆ / ★** à côté d’une rubrique | Ajoute ou retire cette rubrique des favoris. Les favoris apparaissent en tête du menu et ouvrent les mêmes pages. |
| **Administration**, dans le fil d’Ariane | Revient à **Vue d’ensemble**. Le reste du fil indique le groupe et la rubrique courante. |
| **Densité d’affichage** | Choisit **Confortable** ou **Compacte**. |
| **Recherche globale** | Recherche dans les noms des compétences, catégories et personnages, ainsi que dans les objets, sorts et compétences personnelles détenus par les personnages. La recherche ignore la casse et affiche jusqu’à 40 résultats. |
| Résultat de recherche | Ouvre la rubrique correspondante et renseigne sa recherche locale. Pour un objet ou un sort, ouvre la bibliothèque de contenus. Le résultat mène à la liste concernée, sans ouvrir directement son formulaire. Les autres filtres peuvent encore limiter la liste. |
| **Voir comme un joueur** | Ouvre l’aperçu détaillé en section 15, à partir des données enregistrées. Si une édition est en cours, demande confirmation avant de l’abandonner pour cet aperçu. |

La page courante, les favoris, la densité, la disposition du tableau de bord et les colonnes des personnages sont mémorisés dans le navigateur, par compte et par campagne. Les recherches des catalogues et bibliothèques, ainsi que plusieurs filtres et la vue des compétences, sont également mémorisés. Cette mémorisation ne sauvegarde pas les formulaires en cours.

### Enregistrement et messages

Le panneau affiche **Modifications non enregistrées** lorsqu’une édition a été signalée. Un changement de rubrique peut demander **Quitter cette rubrique sans enregistrer ?**. Les changements de sous-onglet concernés demandent également confirmation lorsqu’une édition est en cours.

| Éléments modifiés | Comment les enregistrer |
| --- | --- |
| Catégorie, école, race ou classe | **Appliquer** dans le formulaire, puis **Enregistrer ce catalogue**. |
| Compétence | **Appliquer** dans le formulaire, puis **Enregistrer les compétences**. Les modifications directement réalisées dans le tableau ou par sélection nécessitent aussi cet enregistrement final. |
| Objet ou sort | **Créer l’objet**, **Créer le sort** ou **Enregistrer les modifications** enregistre directement dans le personnage concerné. |
| Informations générales, progression, apparence | Utiliser le bouton d’enregistrement propre à la page. |
| Préférences d’affichage | Mémorisées automatiquement dans le navigateur. |

**Appliquer** ferme un formulaire et reporte son contenu dans l’édition locale du catalogue ou de l’arbre. Ce bouton seul ne partage pas les changements avec les joueurs.

Les enregistrements réussis affichent **Modifications enregistrées.** Les erreurs s’affichent dans le panneau ; un conflit avec une modification réalisée ailleurs peut demander de recharger. Les principales commandes d’enregistrement sont désactivées pendant leur traitement.

## 3. Général → Vue d’ensemble

Cette page présente l’image de couverture, le nom et la description de la campagne, puis trois blocs personnalisables.

### Personnaliser le tableau de bord

Le volet **Personnaliser le tableau de bord** contient une ligne par bloc : **Indicateurs**, **Accès rapides**, **Modifications récentes**.

| Commande | Effet |
| --- | --- |
| Case à cocher du bloc | Affiche ou masque ce bloc. |
| **↑** | Monte le bloc d’une position ; indisponible pour le premier. |
| **↓** | Descend le bloc d’une position ; indisponible pour le dernier. |

### Indicateurs

Chaque indicateur est cliquable et ouvre la rubrique correspondante :

| Indicateur | Ce qui est compté |
| --- | --- |
| **Joueurs** | Membres présents dans la liste de la campagne. |
| **Personnages** | Personnages actifs chargés dans la campagne. |
| **Compétences** | Compétences non archivées, y compris les brouillons. |

### Accès rapides

| Bouton | Destination |
| --- | --- |
| **Créer une compétence** | Ouvre directement un formulaire de nouvelle compétence. |
| **Ajouter un joueur** | Ouvre **Joueurs**, avec son formulaire d’ajout. |
| **Modifier les règles** | Ouvre **Règles**. |
| **Ajouter une catégorie** | Ouvre directement un formulaire dans **Catégories**. |
| **Personnaliser le thème** | Ouvre **Apparence**. |

### Modifications récentes

Affiche les huit événements les plus récents de l’historique disponible, du plus récent au plus ancien. Chaque ligne précise l’action, l’auteur, la date et l’heure. Un texte d’attente apparaît si l’historique est vide.

## 4. Général → Joueurs

Cette page gère les membres de la campagne et donne accès aux personnages qui leur sont attribués.

| Champ ou commande | Détail |
| --- | --- |
| **Pseudo du joueur** | Pseudo d’un compte existant, obligatoire pour l’ajout. |
| **Ajouter un joueur** | Ajoute ce compte à la campagne. Si le pseudo n’existe pas, le panneau indique que le joueur doit d’abord créer son compte. |
| **Rechercher un joueur** | Filtre les pseudos sans tenir compte de la casse. |
| **Tri des joueurs** | **Pseudo A → Z**, **Pseudo Z → A**, ou **Nombre de personnages**, du plus grand au plus petit nombre. |
| Nom d’un personnage | Ouvre sa fiche, hors du panneau GM. |
| **Retirer** | Demande confirmation puis retire le membre de la campagne. Ses personnages sont conservés. Le bouton est désactivé sur la ligne du compte connecté ; le GM propriétaire ne peut pas être retiré. |

Le tableau comprend **Pseudo**, **Personnages** et **Actions**. La colonne Personnages affiche le nombre de personnages du membre et un bouton pour chacun. La page affiche un message d’aide lorsqu’aucun joueur n’est présent.

## 5. Général → Personnages

Cette page permet de retrouver les personnages actifs et de restaurer les personnages supprimés.

### Personnages actifs

| Commande | Détail |
| --- | --- |
| **Rechercher un personnage** | Filtre le nom sans tenir compte de la casse. |
| **Joueur** | **Tous les joueurs** ou un propriétaire présent parmi les personnages. Un propriétaire qui n’est plus membre peut apparaître sous **Ancien membre**. |
| **Classe** | **Toutes les classes** ou une classe renseignée sur un personnage. |
| **Race** | **Toutes les races** ou une race renseignée sur un personnage. |
| **Colonnes du tableau** | Déplie les cases **Classe**, **Race**, **Niveau**, **Joueur** pour afficher ou masquer ces colonnes. |
| **Ouvrir la fiche** | Ouvre le personnage choisi, hors du panneau GM. |
| **Archives des personnages** | Charge les personnages supprimés et remplace la liste active par la liste d’archives. |

Les filtres se combinent. Le tableau garde toujours les colonnes **Personnage** et **Actions** ; le portrait est affiché lorsqu’il existe. Le niveau, les caractéristiques et les ressources se modifient depuis la fiche : cette page ne contient pas leur éditeur ni de bouton de création de personnage.

### Archives des personnages

Chaque ligne affiche le nom et **Restaurer**. Ce bouton remet le personnage dans la liste active et le retire de la liste des archives affichée. **Personnages actifs** revient à la liste principale. Un message indique si les archives sont vides.

## 6. Fonctionnement commun des catalogues

Le même éditeur de catalogue est utilisé dans quatre rubriques, avec des types différents :

| Rubrique | Types proposés |
| --- | --- |
| **Armes et objets → Catégories et écoles** | Armes, Objets. |
| **Magie et sorts → Catégories et écoles** | Écoles de magie. |
| **Races et classes** | Races, Classes. |
| **Catégories** | Armes, Écoles de magie, Objets, Familles de compétences, Races, Classes. |

Ces vues modifient le même catalogue de campagne.

### Liste et boutons

| Commande | Effet |
| --- | --- |
| **Ajouter une catégorie** | Ouvre un formulaire vide ; le premier type autorisé dans la rubrique est présélectionné. |
| **Enregistrer ce catalogue** | Sauvegarde les changements déjà appliqués. Désactivé tant qu’un formulaire de catégorie est ouvert. Une confirmation rappelle que les nouveaux choix de création seront appliqués aux joueurs et les références existantes conservées. |
| **Archives** / **Voir les catégories actives** | Bascule entre catégories archivées et actives. |
| **Rechercher une catégorie** | Filtre les noms sans tenir compte de la casse. |
| **Configurer** | Ouvre une catégorie existante. |
| **Dupliquer** | Ouvre une copie avec un nouvel identifiant et le suffixe **(copie)**. La copie n’est pas archivée ; elle doit être appliquée puis enregistrée. |

La liste est triée par **Ordre** croissant. Ses colonnes sont **Catégorie**, **Type**, **Ordre**, **Associations**, **Disponibilité**, **Actions**. L’icône et la couleur accompagnent le nom. **Associations** compte les références trouvées dans les personnages, leurs contenus et les compétences. **Disponibilité** affiche **Disponible** ou **Masquée** selon le réglage de création.

### Formulaire de catégorie

| Champ | Options et comportement |
| --- | --- |
| **Nom** | Obligatoire, 100 caractères maximum. Personnalise le nom visible. |
| **Type** | Choix parmi les types autorisés par la rubrique. Verrouillé pour une catégorie déjà présente dans le catalogue. |
| **Icône** | Pour les catégories autres que les armes : **✦**, **⚔**, **☀**, **☾**, **♜**, **❖**, **✧**, **❀**. Les armes utilisent le sélecteur décrit ci-dessous. |
| **Couleur** | Sélecteur de couleur associé à la catégorie. |
| **Ordre** | Entier de 0 à 10 000, utilisé pour le classement. |
| **Catégorie parente** | **Aucune** ou une autre catégorie du même type. Les relations circulaires sont refusées à l’enregistrement. |
| **Référence mécanique** | Pour une arme, une école de magie ou une famille de compétences : choisit la référence de règles à laquelle le nom visible correspond. Verrouillée lorsque la catégorie existe déjà. Pour une nouvelle race, classe ou catégorie d’objet, la référence est initialement dérivée du nom. |
| **Famille de compétences** | Pour les armes uniquement : **Correspondance par défaut**, **Lames**, **Armes longues**, **Armes d’impact**, **Armes de tir**. |
| **Style de l’école** | Pour la magie uniquement : **Style global**, **Runique**, **Mystique**, **Sacré**, **Occulte**, **Épuré**. |
| **Description** | Texte de 3 000 caractères maximum. |
| **Traits** et **Faiblesses** | Pour les races et classes uniquement : deux textes de 3 000 caractères maximum chacun. |
| **Disponible à la création** | Autorise la catégorie parmi les nouveaux choix concernés. |
| **Archivée** | Archive la catégorie et décoche automatiquement sa disponibilité à la création. Décocher l’archive ne réactive pas automatiquement la disponibilité. |

Un aperçu affiche l’icône, le nom, la description et le statut **Disponible** ou **Indisponible à la création**.

**Appliquer** reporte la catégorie dans l’édition locale et ferme le formulaire. **Annuler** demande confirmation et abandonne l’édition de ce formulaire. Les changements d’autres catégories déjà appliqués restent en attente de **Enregistrer ce catalogue**.

L’archivage conserve les objets et acquis existants. Le catalogue propose l’archivage, sans bouton de suppression définitive. Pour réutiliser une catégorie archivée : ouvrir les archives, la configurer, décocher **Archivée**, régler sa disponibilité, appliquer puis enregistrer.

### Références mécaniques disponibles

| Type | Options |
| --- | --- |
| Armes | Sceaux, Bâtons, Dagues, Arcs courts, Épées courtes, Fouets, Griffes, Épées, Arcs, Haches, Fléaux, Lances, Marteaux, Arbalètes, Hallebardes, Greatswords, Great Spears, Greataxes, Great Hammers, Greatbows, Great Staves, Faux, Ballistes, Colossal Weapons. |
| Écoles de magie | Miracles, Sorts, Pyromancies, Malédictions, Mélodies. |
| Familles de compétences | Lames, Armes longues, Armes d’impact, Armes de tir, Classe, Race, Personnel, Magie. |

### Sélecteur d’icône d’arme

| Commande | Détail |
| --- | --- |
| **Icône d’arme · importer depuis mon PC** | Sélectionne une image PNG, WebP ou JPG, jusqu’à 5 Mo. Un carré de 256 × 256 px est recommandé. L’image est adaptée à un carré sans déformation ni recadrage ; sa transparence est conservée. |
| Aperçu de l’icône | Affiche le résultat retenu. Un message signale la préparation, la réussite ou une erreur. |
| **Retirer l’icône importée** | Visible lorsqu’une image importée est utilisée. La retire de l’édition et revient au choix automatique. |
| **Ou choisir une icône intégrée** | **Automatique selon le type d’arme**, ou **Épée**, **Dague**, **Espadon**, **Hache**, **Marteau**, **Lance**, **Hallebarde**, **Faux**, **Arc**, **Arbalète**, **Fouet**, **Griffes**, **Bâton**, **Sceau**, **Cloche**. Une option **Icône importée** représente l’image courante, le cas échéant. |

L’import prépare l’image dans le formulaire. Il faut encore **Appliquer**, puis **Enregistrer ce catalogue** pour partager l’icône avec les joueurs. Les commandes concernées sont bloquées pendant la préparation de l’image.

## 7. Contenu → Armes et objets

Deux boutons choisissent le contenu de la page : **Catégories et écoles** ouvre le catalogue Armes / Objets décrit en section 6 ; **Bibliothèque de contenus** affiche les objets des personnages. Un changement de vue avec une édition en cours demande confirmation.

### Bibliothèque de contenus : commandes communes aux objets et aux sorts

La bibliothèque regroupe les contenus de tous les personnages de la campagne. Chaque création est rattachée à un personnage.

| Commande | Effet |
| --- | --- |
| **Personnage destinataire** | Choisit le personnage qui recevra la prochaine création. Ce choix ne filtre pas la liste et est verrouillé pendant une édition. |
| **Créer un objet** / **Créer un sort** | Ouvre une nouvelle entrée pour le destinataire sélectionné. Indisponible sans personnage ou pendant une autre édition. |
| **Archives** / **Contenus actifs** | Affiche les contenus archivés ou actifs. |
| **Rechercher un contenu** | Filtre les noms sans tenir compte de la casse. |
| **Catégorie du contenu** | **Toutes les catégories** ou une catégorie du catalogue concerné. |
| **Modifier** | Ouvre le contenu et sélectionne automatiquement son personnage propriétaire. |
| **Dupliquer** | Ouvre une copie pour le même personnage, avec un nouvel identifiant et le suffixe **(copie)**. La copie est non archivée, non équipée et non mémorisée. |

Le tableau affiche **Nom**, **Catégorie**, **Personnage** et **Actions**. Sans personnage, un message demande d’en créer un depuis l’accueil de campagne.

Pendant une édition :

| Commande | Effet |
| --- | --- |
| **Prévisualiser côté joueur** | Bascule entre le formulaire et le détail du contenu en cours d’édition. Un second clic revient au formulaire. Cet aperçu peut donc montrer des changements non enregistrés. |
| **Annuler** | Demande confirmation puis ferme le formulaire sans enregistrer l’édition. |
| **Créer l’objet** / **Créer le sort** | Enregistre la nouvelle entrée dans le personnage. |
| **Enregistrer les modifications** | Enregistre les modifications d’une entrée existante. |
| **Archiver** / **Restaurer** | Disponible sur une entrée existante. Demande confirmation puis enregistre immédiatement le changement d’état avec les données du formulaire. L’objet est déséquipé et le sort démémorisé lors de cette opération, y compris à la restauration. |

### Éditeur d’objet

**Type d’objet** propose sept boutons : **Arme**, **Armure**, **Bouclier**, **Talisman**, **Consommable**, **Catalyseur / instrument**, **Objet**. Le type détermine les champs affichés. Changer de type réinitialise plusieurs valeurs propres à l’équipement, notamment les dégâts, les bonus, la cendre de guerre et l’état équipé.

| Partie | Champs et options |
| --- | --- |
| **Informations générales** | **Nom** obligatoire et **Description**. |
| **Catégorie d’arme** | Pour une arme : catégories d’armes disponibles et non archivées, triées selon leur ordre. Une ancienne catégorie peut rester affichée avec **(conservée)**. |
| **Catégorie d’objet** | Pour les autres objets, lorsque le catalogue contient des choix : **Sans catégorie** ou une catégorie disponible. Une catégorie existante devenue indisponible peut être conservée. |
| **Catalyseur / instrument** | **Personnalisé**, **Baguette · 1 pds**, **Sceau · 1 pds**, **Bâton de catalyse · 2 pds**, **Flûte · 1 pds**, **Luth · 2 pds**, **Lyre · 2 pds**, **Tambour · 3 pds**. Choisir un modèle renseigne son poids. |
| **Classe d’armure** | Pour une armure : **Aucune**, **Légère**, **Moyenne**, **Lourde**, **Très lourde**. |
| **Poids du bouclier** | Pour un bouclier : entier de 1 à 4. |
| **Poids** | Pour un consommable, un catalyseur/instrument ou un objet : entier de 0 à 100. |
| **Dégâts** | Pour une arme ou un bouclier : texte, par exemple `1d8`. |
| Poids selon le barème | Information calculée pour les armes, armures et talismans. |
| **Équiper maintenant** | Enregistre l’objet comme équipé lorsque la case est cochée, sous réserve de validation de l’équipement du personnage. |

### Bonus d’équipement

Le volet facultatif **Bonus d’équipement** est disponible pour les objets. Il s’ouvre automatiquement lorsque des bonus non nuls existent.

| Commande | Effet |
| --- | --- |
| **Ajouter un bonus** | Choix parmi **HP**, **END**, **FP**, **FOR**, **DEX**, **CON**, **INT**, **SAG**, **CHA** qui ne sont pas déjà affichés. |
| **Ajouter** | Ajoute le bonus choisi avec une valeur initiale de 1. Indisponible sans sélection. |
| Valeur d’un bonus | Entier de 0 à 100. |
| **Retirer** | Retire le bonus de la ligne correspondante. |

Ces bonus sont actifs lorsque l’objet est équipé. Le formulaire rappelle le plafond de caractéristiques de 28 du mode standard.

### Effets et propriétés

Le volet facultatif **Effets et propriétés** contient **Effets de l’objet**, un texte de 3 000 caractères maximum pour les propriétés, conditions et effets particuliers.

### Cendre de guerre

Ce volet facultatif apparaît pour les armes et boucliers.

| Champ ou commande | Détail |
| --- | --- |
| **Associer une cendre de guerre** | Active les champs de la cendre ; décocher retire son association dans le formulaire. |
| **Nom de la cendre** | Obligatoire. Accepte un nom libre et propose les suggestions listées ci-dessous. |
| **Coût FP** | Entier de 1 à 100, à définir. |
| **Dégâts propres (facultatifs)** | Expression de dégâts, par exemple `2d6`. |
| **Type de dégâts / affinité** | Texte libre : feu, magie, ténèbres, etc. |
| **Effet spécial** | Description du déplacement, de la posture, de la projection ou d’un autre effet. |
| **Portée (cases)** | Entier de 0 à 1 000. |
| **Origine de la zone** | **Porteur** ou **Cible**. |
| Grille **Zone d’effet** | 9 × 9 cases. Chaque bouton ajoute ou retire une case affectée autour de l’origine centrale **◎**. Le titre affiche le nombre de cases sélectionnées. |
| **Effacer la zone** | Désélectionne toutes les cases. |
| **Affecte aussi les alliés** | Active les effets sur les alliés dans la zone. |

Suggestions de nom : **Ambres**, **En garde**, **Quickstep**, **Brise-garde**, **Entaille tournoyante**, **Stamp Uppercut**, **En dure**, **Lion Claws**, **Charge**, **Dégainer**, **Enchaînement de taille**, **Empalement**, **Cri de guerre**, **Tir lointain**, **Tir perçant**, **Pluie de flèches**, **Barrage**, **Lancer d’arme**, **Cendre personnalisée**. Le nom choisi ne remplit pas automatiquement un coût ni un effet prédéfini.

## 8. Contenu → Magie et sorts

| Bouton de navigation | Destination |
| --- | --- |
| **Catégories et écoles** | Catalogue des écoles de magie, avec leur référence mécanique, leur présentation et leur disponibilité. Voir section 6. |
| **Bibliothèque de contenus** | Sorts de tous les personnages ; les commandes de bibliothèque sont décrites en section 7. |
| **Voies et spécialisations** | Ouvre la rubrique **Compétences**. Il faut y sélectionner la famille souhaitée, notamment **Magie** ; ce raccourci ne présélectionne pas une spécialisation. |

### Éditeur de sort

Le formulaire est directement configuré pour un sort ; il ne présente pas le sélecteur de type d’objet.

| Partie ou champ | Détail |
| --- | --- |
| **Nom** | Obligatoire. |
| **Famille magique** | École disponible et non archivée du catalogue. Les références sont **Miracles**, **Sorts**, **Pyromancies**, **Malédictions**, **Mélodies**, avec leurs éventuels noms personnalisés. Une ancienne école peut être conservée. |
| **Description** | Présentation du sort. |
| **Dégâts** | Expression de dégâts, par exemple `1d8`. |
| **Rang** | **0 · Inné**, **1 · Basique**, **2 · Intermédiaire**, **3 · Avancé**, **4 · Légendaire**. Le coût de mémoire affiché correspond au rang. |
| **Coût en focus (FP)** | Entier de 0 à 100. |
| **Coût en endurance (END)** | Entier de 0 à 100. |
| **Connu** | Indique que le personnage connaît le sort. Décocher désactive aussi son état mémorisé. |
| **Mémorisé** | Indique que le sort est préparé. La case est indisponible si **Connu** est décoché. L’enregistrement reste soumis aux règles du personnage. |
| **Effets du sort** | Dans **Effets et propriétés**, ouvert pour les sorts : texte de 3 000 caractères maximum. |
| **Cible** | Texte décrivant la cible. |
| **Portée (cases)** | Entier de 0 à 1 000. |
| **Origine de la zone** | Dans **Zone du sort** : **Lanceur** ou **Cible à distance**. |
| Grille **Zone du sort** | 9 × 9 boutons. Un clic ajoute ou retire une case affectée, autour de l’origine **◎**. |
| **Effacer la zone** | Vide la sélection de cases. |
| **Affecte aussi les alliés** | Autorise les effets de zone sur les alliés. |

Les commandes d’aperçu, d’annulation, de création, d’enregistrement, d’archivage et de restauration fonctionnent comme celles de la bibliothèque d’objets. L’aperçu affiche notamment le rang, la mémoire, les coûts, la portée, les effets et la zone renseignée.

## 9. Contenu → Compétences

Cette page édite l’arbre de progression de la campagne : compétences, familles, voies, coûts, conditions de déblocage et états de publication.

### Barre de commandes

| Bouton | Effet |
| --- | --- |
| **Créer une compétence** | Ouvre un formulaire dans la famille actuellement sélectionnée. La nouvelle compétence démarre en brouillon, avec la nature **Compétence RP**, un coût de 1 point et un niveau minimum de 1. Le raccourci de la vue d’ensemble initialise la famille **Lames**. |
| **Vue en tableau** / **Voies et cartes** | Bascule entre tableau de gestion et présentation des arbres en cartes. |
| **Prévisualiser côté joueur** | Masque les brouillons et archives dans la liste courante. Cette commande conserve la vue administrative et ses possibilités d’édition ; elle permet de vérifier les cartes publiées de l’arbre en cours d’édition. |
| **Enregistrer les compétences** | Sauvegarde l’arbre avec toutes les modifications appliquées ou réalisées dans le tableau. Indisponible lorsqu’un formulaire de compétence est ouvert. |

### Filtres

| Filtre | Options et comportement |
| --- | --- |
| **Rechercher une compétence** | Recherche par nom, sans tenir compte de la casse. |
| **Famille** | **Lames**, **Armes longues**, **Armes d’impact**, **Armes de tir**, **Classe**, **Race**, **Personnel**, **Magie**. La vue montre une famille à la fois. Changer de famille réinitialise le filtre de voie. |
| **Voie** | **Toutes les voies** ou une voie présente dans la famille. Selon la compétence, la voie correspond à la spécialisation magique, la voie de classe, la voie raciale ou l’arme ; à défaut, elle est nommée **Commun**. |
| **Publication** | **Tous les états**, **Publiées**, **Brouillons**, **Archives**. Les deux premiers états spécifiques excluent les archives. |
| **Niveau** | Filtre sur un niveau minimum exactement égal au nombre saisi. Vide : tous les niveaux. |
| **Coût** | Filtre sur un coût en points exactement égal au nombre saisi. Vide : tous les coûts. |

Les filtres se combinent. L’aperçu côté joueur ajoute l’exclusion des brouillons et archives ; un filtre incompatible peut donc produire une liste vide.

### Voies et cartes

Les compétences sont organisées en branches avec un titre, une indication de progression, des rangs lorsque les déblocages sont liés et des marqueurs d’état. Chaque carte est un bouton qui ouvre son éditeur, y compris dans l’aperçu des cartes publiées de cette page.

Les marqueurs de cette vue administrative ne représentent pas les acquis d’un joueur déterminé. Pour vérifier l’accès réel d’un personnage à partir de ses acquis, utiliser **Voir comme un joueur**.

### Vue en tableau et actions groupées

Le tableau contient **Sélection**, **Nom**, **Voie / portée**, **Niveau**, **Coût**, **Publication**, **Actions**.

| Commande | Effet |
| --- | --- |
| Case de sélection d’une ligne | Ajoute ou retire la compétence de la sélection groupée. |
| Champ **Niveau** dans la ligne | Modifie directement le niveau minimum, de 1 à 1 000. |
| Champ **Coût** dans la ligne | Modifie directement le coût, de 0 à 100 points. |
| **Modifier** | Ouvre le formulaire complet de la compétence. |
| **Dupliquer** | Ouvre une copie avec un nouvel identifiant, le suffixe **(copie)**, en brouillon et non archivée. |
| **Publier la sélection** | Apparaît lorsqu’au moins une compétence est sélectionnée. Après confirmation, rend les compétences sélectionnées publiées et non archivées dans l’édition locale. |
| **Archiver la sélection** | Après confirmation, archive les compétences sélectionnées et les place aussi en brouillon dans l’édition locale. |

Les deux actions groupées vident ensuite la sélection. Le nombre de compétences sélectionnées est affiché. Elles nécessitent encore **Enregistrer les compétences**, comme les changements de niveau ou de coût réalisés dans le tableau.

### Formulaire : identité et progression

| Champ | Options et comportement |
| --- | --- |
| **Nom** | Obligatoire, 100 caractères maximum. |
| **Nature** | **Technique d’arme**, **Compétence d’arme**, **Bonus de caractéristique**, **Bonus de ressource / dégâts**, **Compétence RP**. Changer de nature réinitialise certaines données associées, notamment la caractéristique de bonus et sa valeur. |
| **Famille** | Les huit familles listées dans les filtres. Changer de famille efface les prérequis et réinitialise les champs de portée devenus incompatibles. |
| **Coût en points** | Entier de 0 à 100. |
| **Niveau minimum** | Entier de 1 à 1 000. |
| **Classe** | Pour la famille **Classe** : nom de classe saisi librement, obligatoire. Changer cette valeur efface les prérequis sélectionnés. |
| **Voie de classe (facultatif)** | Pour **Classe** : texte de 100 caractères maximum. |
| **Race** | Pour la famille **Race** : nom de race saisi librement, obligatoire. Changer cette valeur efface les prérequis sélectionnés. |
| **Voie (facultatif)** | Pour **Race** : texte de 100 caractères maximum. |
| **Spécialisation (facultatif)** | Pour **Magie** : texte de 100 caractères maximum. |
| **Personnage** | Pour **Personnel** : choix obligatoire d’un personnage de la campagne. Changer le destinataire efface les prérequis sélectionnés. |
| **Caractéristique**, pour un bonus de caractéristique | **FOR**, **DEX**, **CON**, **INT**, **SAG**, **CHA**. |
| **Caractéristique**, pour un bonus de ressource / dégâts | **HP**, **END**, **FP**, **Dégâts Miracles**, **Dégâts Sorts**, **Dégâts Pyromancies**, **Dégâts Malédictions**, **Dégâts Mélodies**. |
| **Bonus** | Pour les deux natures de bonus : valeur de 1 à 10 dans ce formulaire. |

Les natures **Technique d’arme** et **Compétence d’arme** ne font pas apparaître de grille de zone ni de champs de coûts FP/END distincts dans cet éditeur. Les effets et coûts d’utilisation se décrivent dans le champ de texte prévu à cet effet.

### Formulaire : effets et publication

| Champ | Détail |
| --- | --- |
| **Ordre d’affichage** | Entier de 0 à 10 000. |
| **Description, effets et coûts d’utilisation** | Texte de 3 000 caractères maximum. |
| **Déblocage disponible** | Cochée : compétence publiée, sous réserve qu’elle ne soit pas archivée. Décochée : brouillon. Le changement doit encore être appliqué puis enregistré. |

### Formulaire : prérequis

**Prérequis (n)** indique le nombre de déblocages nécessaires. La liste **Déblocages nécessaires** propose des cases à cocher pour les autres compétences de la même famille, avec la même classe, race et éventuelle attribution personnelle. Chaque ligne affiche le nom et une indication de voie ou de famille.

La compétence ne peut pas se demander elle-même en prérequis. La validation refuse notamment les boucles et les compétences publiées qui dépendent d’un prérequis en brouillon ou archivé. L’erreur est affichée sans appliquer le formulaire.

### Formulaire : boutons

| Bouton | Effet |
| --- | --- |
| **Appliquer** | Valide le projet d’arbre, reporte la compétence dans l’édition locale et ferme le formulaire. Il faut ensuite **Enregistrer les compétences**. |
| **Archiver** | Pour une compétence existante : coche l’état archivé et la remet en brouillon dans le formulaire. Il faut ensuite appliquer et enregistrer. |
| **Restaurer** | Pour une compétence archivée : retire son état archivé. Son état brouillon est conservé ; régler **Déblocage disponible** selon la publication souhaitée, puis appliquer et enregistrer. |
| **Dupliquer** | Transforme l’édition courante en nouvelle copie en brouillon, non archivée, avec le suffixe **(copie)**. |
| **Annuler** | Demande confirmation puis ferme l’éditeur sans appliquer cette édition. Les changements déjà appliqués à l’arbre restent en attente d’enregistrement. |

## 10. Contenu → Races et classes

Cette page donne accès au catalogue filtré sur **Races** et **Classes**. Elle reprend toutes les commandes de la section 6 : recherche, archives, configuration, duplication, application et enregistrement du catalogue.

**Ajouter une catégorie** initialise une race ; le champ **Type** permet de choisir une classe pour la nouvelle entrée. Chaque race ou classe possède un nom, une icône, une couleur, un ordre, une éventuelle catégorie parente du même type, une description, des traits, des faiblesses et des réglages de disponibilité et d’archivage.

**Traits** et **Faiblesses** sont des descriptions textuelles. Les compétences et bonus de progression liés à une race ou une classe se configurent dans **Compétences**, avec la famille et la portée correspondantes. Modifier le nom visible d’une entrée existante conserve sa référence mécanique.

## 11. Configuration → Règles

Cette page rassemble trois vues de réglages internes et cinq raccourcis vers d’autres rubriques.

| Bouton | Destination ou contenu |
| --- | --- |
| **Général** | Nom, image et description de la campagne. |
| **Progression** | Points gagnés par niveau. |
| **Armes** | Ouvre **Armes et objets**. |
| **Magie** | Ouvre **Magie et sorts**. |
| **Création** | Ouvre **Races et classes**. |
| **Apparence** | Ouvre **Apparence**. |
| **Données** | Ouvre **Données**. |
| **Avancé** | Version des règles et archivage de la campagne. |

**Rechercher un domaine de paramètres** filtre les boutons ci-dessus selon leur libellé. Cette recherche ne filtre pas les champs du formulaire déjà affiché.

### Général

| Champ ou bouton | Détail |
| --- | --- |
| **Nom** | Obligatoire, 100 caractères maximum. |
| **Image de couverture (URL HTTPS)** | Adresse de l’image utilisée notamment dans la vue d’ensemble. Le champ peut rester vide. |
| **Description** | Texte de 3 000 caractères maximum, affiché dans la présentation de la campagne. |
| **Enregistrer les informations générales** | Sauvegarde les trois champs. Désactivé sans modification signalée ou pendant un traitement. |

### Progression

| Champ ou bouton | Détail |
| --- | --- |
| **Points par niveau** | Entier de 0 à 100. Valeur par défaut : **2**. Les points de progression sont gagnés à partir du niveau 2. |
| **Restaurer la valeur par défaut** | Remet le champ à 2 dans l’édition locale. Il faut encore enregistrer. |
| **Enregistrer la progression** | Demande confirmation avant de modifier les points par niveau pour les personnages existants, puis sauvegarde. Désactivé sans modification signalée ou pendant un traitement. |

Les coûts des compétences déjà acquises sont conservés. Une baisse de points est refusée si elle ne couvre plus les points déjà dépensés par des personnages.

### Avancé

Le volet **Paramètres sensibles et compatibilité** affiche la version des règles de l’arbre et rappelle la conservation des acquis antérieurs.

**Archiver la campagne** ouvre une saisie de confirmation. Il faut recopier exactement le nom de la campagne ; une annulation ou une autre valeur ne lance pas l’action. L’archivage retire la campagne des listes actives en conservant ses données. La commande prévoit ensuite un retour à la liste des campagnes.

## 12. Configuration → Apparence

Cette page personnalise les couleurs et ornements de la campagne, avec un aperçu local avant enregistrement.

### Palettes et couleurs

**Choisir une palette** propose cinq boutons : **Cendres anciennes**, **Sang et braises**, **Lune et givre**, **Racines oubliées**, **Occulte**. Un clic applique les couleurs de la palette dans l’édition locale. Les styles de magie et d’armes restent des choix distincts.

| Couleur | Rôle | Valeur par défaut |
| --- | --- | --- |
| **Accent** | Éléments mis en évidence et accent du thème. | `#c4ae83` |
| **Surfaces** | Fonds des surfaces et panneaux. | `#191c1a` |
| **Fond** | Fond général du thème. | `#111312` |
| **Séparateurs** | Lignes et séparations. | `#4b5047` |

Chaque champ utilise un sélecteur de couleur. Modifier une couleur manuellement nomme la palette courante **Personnalisée**. Les valeurs par défaut sont rappelées sous les champs.

### Styles

| Sélecteur | Options |
| --- | --- |
| **Style de magie** | **Runique** par défaut, **Mystique**, **Sacré**, **Occulte**, **Épuré**. |
| **Style des armes** | **Classique** par défaut, **Brutal**, **Runique**, **Noble**, **Minimaliste**. |

### Boutons et aperçu

| Commande | Effet |
| --- | --- |
| **Enregistrer l’apparence** | Sauvegarde le thème et le partage avec les joueurs. Cette page enregistre sans la confirmation générale utilisée par les catalogues. |
| **Restaurer le thème par défaut** | Remet localement la palette **Cendres anciennes**, la magie **Runique** et les armes **Classique**. Il faut ensuite enregistrer. |
| **Exemple de bouton** | Élément visuel de l’aperçu ; aucun traitement n’est associé au clic. |

L’aperçu montre le nom de la campagne, une carte de magie **Souffle spectral**, une carte d’arme **Lame des cendres** et le bouton d’exemple. Il réagit aux choix du formulaire. Les couleurs et styles modifient la présentation, sans changer les dégâts ni les coûts. L’enregistrement vérifie le contraste ; une palette insuffisamment contrastée est refusée avec un message invitant à choisir des surfaces sombres et un accent clair.

## 13. Configuration → Catégories

**Catégories** est la vue globale du catalogue commun détaillé en section 6. Elle réunit les six types : **Armes**, **Écoles de magie**, **Objets**, **Familles de compétences**, **Races**, **Classes**.

Elle donne notamment accès à l’édition des **Familles de compétences**, absente des catalogues spécialisés Armes, Magie et Races/classes. Une catégorie de ce type associe un nom visible à l’une des huit familles mécaniques existantes ; son ajout ne crée pas une nouvelle famille de règles.

Les boutons restent **Ajouter une catégorie**, **Enregistrer ce catalogue**, **Archives / Voir les catégories actives**, **Configurer**, **Dupliquer**, puis **Appliquer** et **Annuler** dans le formulaire.

## 14. Configuration → Données

### Sauvegarde et préréglages

| Commande | Effet |
| --- | --- |
| **Exporter la campagne (JSON)** | Télécharge `campagne-<identifiant>.json` à partir des données enregistrées chargées dans le panneau. Le document contient le marqueur `cendres-campaign-v1`, les informations de campagne, les paramètres, l’arbre, les personnages actifs chargés et l’historique. Les modifications de formulaire non enregistrées et les personnages des archives ne sont pas inclus. |
| **Accéder aux archives** | Ouvre la rubrique **Personnages**. Il faut ensuite cliquer sur **Archives des personnages** pour afficher les archives. |
| **Importer un préréglage d’apparence et de catégories** | Sélecteur de fichier JSON. Accepte au maximum 2 000 000 octets, avec le format `cendres-campaign-v1` et des paramètres de campagne. |

L’import demande confirmation pour appliquer l’apparence et fusionner les catégories, puis passe par la confirmation d’enregistrement de configuration. Il remplace l’apparence et ajoute les catégories dont l’identifiant n’existe pas déjà dans la campagne. Les catégories de même identifiant restent celles de la campagne courante.

L’import porte sur l’apparence et les catégories : il ne restaure pas les personnages, l’arbre de compétences, le nom, la description ou l’historique contenus dans un export. Les paramètres importés sont soumis aux mêmes validations que ceux saisis dans le panneau. Les erreurs de taille, de lecture ou de format s’affichent dans la page.

### Historique

**Historique des changements** affiche tous les événements conservés dans l’historique de campagne disponible, du plus récent au plus ancien. Chaque événement indique l’action, l’auteur, la date et l’heure. Cet historique comprend notamment les enregistrements des informations générales, de la configuration et de la progression ; il ne constitue pas un relevé de chaque clic ou de chaque modification de personnage. Le stockage conserve jusqu’à 500 événements.

### Restauration par défaut

**Restaurer l’apparence et la description par défaut** remet le thème par défaut et vide la description de campagne, tout en conservant le catalogue de catégories. Cette action passe par la confirmation d’enregistrement de configuration et sauvegarde directement le résultat. Elle ne change pas le nom de la campagne ni son image de couverture.

## 15. Commande commune → Voir comme un joueur

Cet écran fait partie des outils du panneau GM. Il permet de consulter la configuration enregistrée pour un personnage choisi, en lecture seule.

| Commande | Effet |
| --- | --- |
| **Retour à l’administration** | Ferme l’aperçu et revient au panneau. |
| **Personnage** | Choisit le personnage dont les contenus sont présentés. |
| **Fiche** | Affiche les valeurs de caractéristiques enregistrées du personnage. |
| **Inventaire** | Affiche les détails de tous ses objets non archivés, y compris ceux qui ne sont pas équipés. |
| **Grimoire** | Affiche les détails de tous ses sorts non archivés, y compris ceux qui ne sont pas mémorisés. |
| **Compétences** | Affiche les compétences publiées et non archivées correspondant à la famille choisie et au personnage, avec ses acquis, ses points disponibles et ses conditions d’accès. |
| **Famille à prévisualiser** | Dans Compétences : choix parmi les huit familles, avec les éventuels noms personnalisés du catalogue. |

Le bandeau du personnage présente son portrait lorsqu’il existe, son nom, sa race, sa classe et son niveau. Sans personnage disponible, un message remplace le contenu de l’aperçu.

Les détails d’objets et de sorts affichent, selon le contenu, les dégâts, le poids, les paramètres d’armure, le rang, la mémoire, les coûts, la portée, la description, les effets, les bonus, les techniques acquises, la cendre de guerre et les zones d’effet. Aucune commande d’équipement, de lancement de sort ou d’acquisition n’est proposée ici. Cliquer sur une carte de compétence dans cet aperçu ne déclenche pas de déblocage ni d’éditeur.

## 16. Repères dans le code

Les descriptions ci-dessus suivent les composants actuellement utilisés par le panneau :

| Source | Partie décrite |
| --- | --- |
| [Entrée du panneau](../app/dm/page.tsx) et [console d’administration](../components/admin/console.tsx) | Navigation, vue d’ensemble, joueurs, personnages, règles, données. |
| [Catalogue](../components/admin/catalog.tsx) et [sélecteur d’icône d’arme](../components/weapon-icon-picker.tsx) | Catégories, écoles, races, classes et icônes. |
| [Bibliothèque](../components/admin/library.tsx) et [formulaire de contenu](../components/item-form.tsx) | Objets, sorts et actions sur leur propriétaire. |
| [Bonus d’équipement](../components/item-extra-fields.tsx), [cendre de guerre](../components/ash-of-war-fields.tsx), [zone du sort](../components/spell-zone-fields.tsx) | Champs conditionnels des contenus. |
| [Éditeur de compétences](../components/admin/skills.tsx) | Arbres, filtres, publication et prérequis. |
| [Apparence](../components/admin/appearance.tsx) et [paramètres de campagne](../lib/campaign-settings.ts) | Palettes, styles et règles de catalogue. |
| [Aperçu joueur](../components/admin/player-preview.tsx) | Consultation en lecture seule depuis le panneau GM. |
