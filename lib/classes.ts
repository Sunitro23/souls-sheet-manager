import type {Node} from './progression.ts';

export const classCatalog = [
  {
    "id": "paladin",
    "name": "Paladin",
    "stats": [
      "SAG",
      "CON"
    ],
    "abilities": [
      {
        "name": "Bonne réputation",
        "description": "Votre bonne réputation vous permet d’obtenir des informations et de l’aide."
      },
      {
        "name": "Duel imposé",
        "description": "Vous pouvez forcer un ennemi à vous affronter en duel."
      },
      {
        "name": "Fléau du mal",
        "description": "Vous infligez deux fois plus de dégâts aux ennemis maléfiques."
      }
    ]
  },
  {
    "id": "warrior",
    "name": "Warrior",
    "stats": [
      "FOR",
      "CON"
    ],
    "abilities": [
      {
        "name": "Intimidation",
        "description": "Vous utilisez la FOR pour vos jets d’intimidation."
      },
      {
        "name": "Lutte",
        "description": "Vous pouvez agripper un ennemi."
      },
      {
        "name": "Berserker",
        "description": "En mode berserker, les dégâts que vous infligez et recevez sont doublés."
      }
    ]
  },
  {
    "id": "rogue",
    "name": "Rogue",
    "stats": [
      "DEX",
      "CHA"
    ],
    "abilities": [
      {
        "name": "Attaque sournoise",
        "description": "Vos attaques furtives infligent deux fois plus de dégâts."
      },
      {
        "name": "Pickpocket",
        "description": "Vous pouvez tenter de faire les poches de n’importe qui."
      },
      {
        "name": "Disparition",
        "description": "Vous devenez invisible lorsque vos PV atteignent 0."
      }
    ]
  },
  {
    "id": "mage",
    "name": "Mage",
    "stats": [
      "INT",
      "SAG"
    ],
    "abilities": [
      {
        "name": "Connaissances",
        "description": "Vous pouvez lancer un dé de connaissances pour obtenir des informations."
      },
      {
        "name": "Sweetspot",
        "description": "Si la cible est touchée à la portée maximale, les dégâts sont augmentés."
      },
      {
        "name": "Création de sorts",
        "description": "Vous pouvez créer des sorts à l’aide de grimoires rares."
      }
    ]
  },
  {
    "id": "bard",
    "name": "Bard",
    "stats": [
      "DEX",
      "CHA"
    ],
    "abilities": [
      {
        "name": "Détection des mensonges",
        "description": "Vous détectez les mensonges."
      },
      {
        "name": "Célébrité",
        "description": "Votre célébrité facilite votre admission dans les sphères privées."
      },
      {
        "name": "Mélodie passive",
        "description": "Vous pouvez choisir une mélodie passive en combat."
      }
    ]
  },
  {
    "id": "craftsman",
    "name": "Craftsman",
    "stats": [
      "INT",
      "FOR"
    ],
    "abilities": [
      {
        "name": "Cendres de guerre",
        "description": "Vous pouvez changer la cendre de guerre (« ash of war ») d’une arme."
      },
      {
        "name": "Amélioration des armes",
        "description": "Vous pouvez améliorer les armes."
      },
      {
        "name": "Artisanat légendaire",
        "description": "Vous pouvez fabriquer des armes et des armures légendaires."
      }
    ]
  }
] as const;

export function classNodes():Node[]{return classCatalog.flatMap(c=>{
 const base={family:'Classe' as const,className:c.name,race:'',weapon:'',cost:1,level:1,requires:[]};
 return [
  ...c.stats.map(stat=>({...base,id:`class:v9:${c.id}:stat:${stat}`,kind:'stat' as const,name:`+1 ${stat}`,description:`+1 ${stat}.`,stat,amount:1})),
  ...c.abilities.map((a,i)=>({...base,...a,id:`class:v9:${c.id}:ability:${i}`,kind:'competence' as const,stat:'',amount:0}))
 ];
});}
