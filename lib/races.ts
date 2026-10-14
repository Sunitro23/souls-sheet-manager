export const racialCatalog = [
  {
    "id": "giant",
    "name": "Giant",
    "stats": [
      "CON",
      "FOR"
    ],
    "trait": "Enraciné : vous êtes indéplaçable.",
    "weakness": "Faible aux dégâts de feu."
  },
  {
    "id": "godlike",
    "name": "Godlike",
    "stats": [
      "SAG",
      "CHA"
    ],
    "trait": "Invulnérable aux dégâts radiants.",
    "weakness": "Faible aux dégâts de ténèbres."
  },
  {
    "id": "gyrm",
    "name": "Gyrm",
    "stats": [
      "INT",
      "CHA"
    ],
    "trait": "Invulnérable aux dégâts magiques.",
    "weakness": "Faible aux dégâts de foudre."
  },
  {
    "id": "demon",
    "name": "Demon",
    "stats": [
      "SAG",
      "FOR"
    ],
    "trait": "Invulnérable aux dégâts de feu.",
    "weakness": "Faible aux dégâts magiques."
  },
  {
    "id": "human",
    "name": "Human",
    "stats": [
      "DEX",
      "INT"
    ],
    "trait": "Invulnérable aux dégâts de ténèbres.",
    "weakness": "Faible aux dégâts radiants."
  },
  {
    "id": "demi-human",
    "name": "Demi-Human",
    "stats": [
      "DEX",
      "CON"
    ],
    "trait": "Instinct bestial : vous ressentez le danger.",
    "weakness": "Peu apprécié socialement."
  }
] as const;
export const racialNames=racialCatalog.map(r=>r.name);
