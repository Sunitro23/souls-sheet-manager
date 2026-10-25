import OBR, { isImage, type Image } from "@owlbear-rodeo/sdk";
import { cellFromCenter } from "../core/projection";
import { sharedLink } from "../core/links";

export async function characterTokens(characterId: string): Promise<Image[]> {
  if (!await OBR.scene.isReady()) return [];
  const items = await OBR.scene.items.getItems();
  return items.filter((item): item is Image => isImage(item) && item.layer === "CHARACTER" && sharedLink(item)?.characterId === characterId);
}

export async function characterToken(characterId: string, choice = ""): Promise<Image> {
  const tokens = await characterTokens(characterId);
  const token = tokens.length === 1 ? tokens[0] : tokens.find(item => item.id === choice);
  if (!token) throw Error(tokens.length ? "Choisissez le token à utiliser." : "Aucun token associé à ce personnage dans la scène.");
  return token;
}

export async function selectedToken(): Promise<Image | undefined> {
  if (!await OBR.scene.isReady()) return undefined;
  const selection = await OBR.player.getSelection();
  if (!selection || selection.length !== 1) return undefined;
  const [item] = await OBR.scene.items.getItems(selection);
  return item && isImage(item) && item.layer === "CHARACTER" ? item : undefined;
}

export async function tokenOrigin(tokenId: string) {
  if (!await OBR.scene.isReady()) throw new Error("Ouvrez une scène Owlbear Rodeo.");
  const [dpi, type, items] = await Promise.all([
    OBR.scene.grid.getDpi(), OBR.scene.grid.getType(), OBR.scene.items.getItems([tokenId]),
  ]);
  if (type !== "SQUARE") throw new Error("Grille non prise en charge : choisissez une grille carrée.");
  if (!items[0] || !isImage(items[0]) || items[0].layer !== "CHARACTER") {
    throw new Error("Le token associé n’est plus disponible.");
  }
  // Le SDK calcule les limites réelles, en tenant compte de l’ancrage et des transformations.
  // Ne pas interpréter item.position comme le coin supérieur gauche de l’image.
  const bounds = await OBR.scene.items.getItemBounds([tokenId]);
  const center = await OBR.scene.grid.snapPosition(bounds.center, 1, false, true);
  return { origin: cellFromCenter(center, dpi), dpi, rotation: items[0].rotation };
}
