export type NamedEntity = { id: string; name: string };
export type Technique = { name: string; pattern: [number, number][]; end?: number; mana?: number };
export type Spell = Technique & { id: string; origin: "self" | "target"; range: number };
export type Weapon = NamedEntity & { techniques: Technique[] };
export type TechniquesResponse = { characterId: string; name: string; weapons: Weapon[] };
export type TokenLink = { tokenId: string; characterId: string; characterName: string; playerId?: string | null; playerName?: string };
export type Viewer = { id: string; role: "GM" | "PLAYER" };
export type Point = { x: number; y: number };
