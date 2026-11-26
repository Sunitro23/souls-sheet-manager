import OBR, { isImage, type Image } from "@owlbear-rodeo/sdk";
import { attackRotation } from '../core/projection';
import { validSize } from "../core/footprint";
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

function geometry(item: Image, center: { x: number; y: number }, dpi: number) {
  const width = Math.max(1, Math.round(item.image.width * Math.abs(item.scale.x) / item.grid.dpi));
  const height = Math.max(1, Math.round(item.image.height * Math.abs(item.scale.y) / item.grid.dpi));
  if (!validSize({ width, height })) throw Error('Dimensions du pion invalides.');
  const origin = { x: Math.round(center.x / dpi - width / 2), y: Math.round(center.y / dpi - height / 2) };
  return { origin, width, height, dpi, rotation: item.rotation, attackRotation: attackRotation(item.rotation) };
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
  return geometry(items[0], bounds.center, dpi);
}

export async function centerCombatTokens(tokenIds: string[]) {
  if (!await OBR.scene.isReady()) throw Error('Ouvrez une scène Owlbear Rodeo.');
  const [dpi, type, items] = await Promise.all([OBR.scene.grid.getDpi(), OBR.scene.grid.getType(), OBR.scene.items.getItems(tokenIds)]);
  if (type !== 'SQUARE') throw Error('Grille non prise en charge : choisissez une grille carrée.');
  if (tokenIds.some(id=>!items.some(item=>item.id===id&&isImage(item)&&item.layer==='CHARACTER'))) throw Error('Un pion du combat manque sur la carte.');
  const offsets = new Map(await Promise.all(tokenIds.map(async id=>{
    const {center} = await OBR.scene.items.getItemBounds([id]);
    const {origin: cell, width, height} = geometry(items.find(item => item.id === id) as Image, center, dpi);
    return [id,{x:(cell.x+width/2)*dpi-center.x,y:(cell.y+height/2)*dpi-center.y}] as const;
  })));
  await OBR.scene.items.updateItems(tokenIds, drafts=>{
    for(const item of drafts){const offset=offsets.get(item.id)!;item.position={x:item.position.x+offset.x,y:item.position.y+offset.y};}
  });
}
