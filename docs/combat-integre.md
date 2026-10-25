# Combat intégré à Owlbear — cadrage validé

## Première étape validée

- Le GM crée le combat sans lui donner de nom. Les participants et leurs joueurs sont détectés à partir des tokens associés aux fiches de la campagne et présents sur la carte ; aucune sélection manuelle n’est demandée.
- Cette étape couvre la sélection, l’initiative et l’enchaînement des tours. La consommation des ressources viendra ensuite.
- L’extension utilisée est Dice officiel d’Owlbear Rodeo.
- Le GM ouvre la collecte des initiatives. Chaque joueur lance un d20 sans bonus ; l’application ajoute le modificateur de DEX.
- Les jets de chaque joueur Owlbear sont attribués par ordre alphabétique des noms de ses participants, sans sélection avant chaque lancer. Les participants ayant déjà une initiative sont ignorés. Les joueurs peuvent lancer en parallèle ; le GM suit cette même règle pour ses ennemis.
- Le premier nouveau d20 public valide est retenu. La saisie manuelle reste disponible en secours ; toute correction ou tout jet refait donne lieu à une saisie manuelle, sans nouvelle capture automatique.
- L’ordre est décroissant selon `1d20 + modificateur de DEX`, puis selon la DEX brute. Une égalité complète est départagée aléatoirement une seule fois ; cet ordre est conservé pendant le combat.
- Le GM vérifie les initiatives puis démarre le combat. Chaque joueur peut terminer son propre tour ; le GM peut faire avancer le tour de n’importe quel participant.
- Une fermeture ou déconnexion conserve le combat, ses initiatives et le tour courant. Seul le GM peut terminer le combat.
- Le GM peut ajouter un participant pendant le combat. Celui-ci est classé selon son initiative, mais ne peut jouer qu’à partir du round suivant.
- Une salle Owlbear possède au maximum un combat actif.
- Tous les joueurs voient les participants, leurs initiatives, l’ordre des tours et le round courant, y compris pour les ennemis.
- Le GM peut retirer un participant à tout moment. Si son tour est actif, le combat passe au suivant ; les autres conservent leur ordre. Atteindre 0 PV ne retire pas automatiquement un participant.
- Les commandes de combat sont disponibles uniquement lorsque l’application est connectée à une salle Owlbear. Les fiches restent utilisables hors combat.
- Aucun retour au tour précédent n’est prévu.

## Étape ultérieure validée

Les joueurs déclareront leurs actions dans l’application, qui déduira leurs coûts en END et FP. Les déplacements sur la carte et les dégâts resteront résolus manuellement.

## Faisabilité à valider en salle

Le [code public de Dice](https://github.com/owlbear-rodeo/dice/blob/ccc32beceee0888c0a48129fbb23f4a636c710ee/src/plugin/DiceRollSync.tsx) publie les jets publics dans les métadonnées du joueur Owlbear. Il ne fournit pas directement le personnage concerné ni l’intention « initiative ». La lecture repose sur un format interne. L’utilisateur a confirmé la réception en salle d’un jet du GM : « Sun - GM : 19 ».

Le cadrage ci-dessus a été confirmé par l’utilisateur. Le premier travail technique porte sur la capture des jets de Dice officiel, avec la saisie manuelle comme solution de secours pour le futur combat.

## Vérification de la réception

Le panneau temporaire « Vérifier la réception des initiatives Dice » a permis de valider la connexion côté GM. Il a depuis été retiré de l’interface courante. Le protocole utilisé était le suivant :

1. Ouvrir le panneau, cliquer « Écouter les nouveaux d20 » et attendre « Écoute prête ».
2. Lancer un d20 public sans bonus depuis Dice, côté GM puis côté joueur : le nom du joueur et la valeur doivent apparaître une seule fois.
3. Vérifier qu’un ancien jet, un jet masqué, plusieurs dés ou un bonus ne sont pas capturés.
4. Arrêter puis relancer l’écoute : les jets précédents ne doivent pas réapparaître.

Les tests automatisés couvrent la lecture des résultats, les doublons, les anciens jets, les arrivées de joueurs et les abonnements locaux/distants. L’utilisateur a confirmé la réception en salle des jets du GM et des autres joueurs, y compris sans compte Cendres.

## Création et association des participants

Dans Actions → Combat, les tokens associés présents sur la carte fournissent automatiquement les participants, leurs fiches et leurs joueurs Owlbear. Les tokens sans association et ceux d’autres campagnes sont ignorés ; plusieurs tokens d’une même fiche ne créent qu’un participant. Les fiches sans joueur associé au token sont contrôlées par le GM.

Aucun nom de combat ni formulaire d’ajout ou d’attribution n’est demandé. La liste se met à jour avec la carte pendant la préparation ; elle est relue avec les fiches enregistrées au lancement des initiatives. La préparation est partagée et conservée dans la salle. L’annulation et les corrections manuelles restent accessibles dans des menus repliés. Le panneau de test Dice n’est plus affiché dans l’interface courante.

La détection et la création sans nom sont couvertes par les tests automatisés ; le parcours réel reste à vérifier dans Owlbear.

## Collecte des initiatives

Le GM ouvre la collecte après avoir enregistré les participants. Une seule fenêtre GM écoute les jets pour ce combat. Après le message « Écoute prête », les d20 publics sans bonus sont attribués par ordre alphabétique aux participants sans initiative de leur lanceur. Le modificateur de DEX est ajouté automatiquement. Les participants ayant déjà une valeur sont ignorés ; le GM saisit manuellement tout résultat refait ou corrigé.

Les résultats sont enregistrés au fil de l’eau. L’écoute reste active lorsque le GM consulte un autre onglet de la fiche. Après fermeture ou changement de fenêtre, « Reprendre l’écoute ici » conserve les résultats et démarre une nouvelle écoute des jets à venir. Les jets lancés pendant l’absence d’écoute doivent être saisis manuellement.

Une fois toutes les valeurs reçues, le GM valide l’ordre : total décroissant, DEX brute décroissante, puis départage aléatoire persistant pour les égalités complètes. Il peut rouvrir la correction des initiatives sans refaire ce départage. La collecte et la persistance sont testées automatiquement ; le parcours reste à vérifier en salle. Le démarrage du combat et le suivi des tours restent à implémenter.
