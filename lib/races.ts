export const racialCatalog = [
  {
    "name": "Clan du Lion",
    "paths": [
      {
        "name": "Crinière noble",
        "primary": "FOR",
        "secondary": "DEX"
      },
      {
        "name": "Fauve de guerre",
        "primary": "DEX",
        "secondary": "CON"
      }
    ]
  },
  {
    "name": "Corviens",
    "paths": [
      {
        "name": "Confesseur de Velka",
        "primary": "CHA",
        "secondary": "SAG"
      },
      {
        "name": "Rapace des Cimes",
        "primary": "DEX",
        "secondary": "SAG"
      }
    ]
  },
  {
    "name": "Demi-Humains",
    "paths": [
      {
        "name": "Chimère férale",
        "primary": "DEX",
        "secondary": "FOR"
      },
      {
        "name": "Chimère éveillée",
        "primary": "INT",
        "secondary": "CHA"
      }
    ]
  },
  {
    "name": "Dieux",
    "paths": [
      {
        "name": "Dieu occulte",
        "primary": "SAG",
        "secondary": "INT"
      },
      {
        "name": "Dieu solaire",
        "primary": "CHA",
        "secondary": "SAG"
      }
    ]
  },
  {
    "name": "Dragons",
    "paths": [
      {
        "name": "Dragon ancestral",
        "primary": "FOR",
        "secondary": "CON"
      },
      {
        "name": "Dragon cristallin",
        "primary": "INT",
        "secondary": "SAG"
      }
    ]
  },
  {
    "name": "Démons",
    "paths": [
      {
        "name": "Démon de Feu",
        "primary": "CON",
        "secondary": "SAG"
      },
      {
        "name": "Démon de Pierre",
        "primary": "FOR",
        "secondary": "DEX"
      }
    ]
  },
  {
    "name": "Enfant des Ténèbres",
    "paths": [
      {
        "name": "Enfant de la Mort",
        "primary": "CON",
        "secondary": "SAG"
      },
      {
        "name": "Enfant des Abysses",
        "primary": "FOR",
        "secondary": "CON"
      }
    ]
  },
  {
    "name": "Gyrm",
    "paths": [
      {
        "name": "Gardien du Roc",
        "primary": "CON",
        "secondary": "FOR"
      },
      {
        "name": "Maître des Forges",
        "primary": "INT",
        "secondary": "FOR"
      }
    ]
  },
  {
    "name": "Géants",
    "paths": [
      {
        "name": "Géant asservi",
        "primary": "FOR",
        "secondary": "DEX"
      },
      {
        "name": "Géant-arbre",
        "primary": "FOR",
        "secondary": "CON"
      }
    ]
  },
  {
    "name": "Hommes-champignons",
    "paths": [
      {
        "name": "Fongique ancestral",
        "primary": "FOR",
        "secondary": "CON"
      },
      {
        "name": "Mycélien sporifère",
        "primary": "SAG",
        "secondary": "CHA"
      }
    ]
  },
  {
    "name": "Hommes-Serpents",
    "paths": [
      {
        "name": "Serpent quadribrachial",
        "primary": "FOR",
        "secondary": "DEX"
      },
      {
        "name": "Serpent-oracle",
        "primary": "INT",
        "secondary": "SAG"
      }
    ]
  },
  {
    "name": "Humains",
    "paths": [
      {
        "name": "Mort-Vivant Élu",
        "primary": "SAG",
        "secondary": "CHA"
      },
      {
        "name": "Porteur de la Malédiction",
        "primary": "CON",
        "secondary": "SAG"
      }
    ]
  }
] as const;
export const racialNames=racialCatalog.map(r=>r.name);
