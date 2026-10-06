import { getDb } from "../../../db";
import { characters, campaigns } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import {
  createCharacter,
  validate,
  normalizeStored,
  type Character,
} from "../../../lib/rules";
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const secret = () => crypto.randomUUID() + crypto.randomUUID();
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length")) > 2000000)
      return Response.json(
        { error: "Données trop volumineuses." },
        { status: 413 },
      );
    const body = (await req.json()) as Record<string, any>;
    const db = getDb();
    const { op, id, token } = body;
    if (op === "create") {
      const token = secret();
      const c = createCharacter({
        name: body.name,
        level: body.level,
        stats: body.stats,
        magic: body.magic,
      });
      await db.insert(characters).values({
        id: c.id,
        tokenHash: await hash(token),
        data: JSON.stringify(c),
        revision: 0,
      });
      return Response.json({ character: c, token });
    }
    if (op === "campaignCreate") {
      if (!body.name?.trim()) throw Error("Nom de campagne requis.");
      const id = crypto.randomUUID(),
        token = secret();
      await db.insert(campaigns).values({
        id,
        name: body.name.slice(0, 100),
        tokenHash: await hash(token),
      });
      return Response.json({ id, token, name: body.name });
    }
    if (op === "campaign") {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id));
      if (!campaign || campaign.tokenHash !== (await hash(token || "")))
        return Response.json({ error: "Accès GM invalide." }, { status: 403 });
      const rows = await db
        .select()
        .from(characters)
        .where(eq(characters.campaignId, id));
      return Response.json({
        name: campaign.name,
        characters: rows.map((r) => normalizeStored(JSON.parse(r.data))),
      });
    }
    const [row] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id || ""));
    if (!row)
      return Response.json(
        { error: "Personnage introuvable." },
        { status: 404 },
      );
    const old: Character = normalizeStored(JSON.parse(row.data));
    let gm = false;
    if (old.campaignId && body.gmToken) {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, old.campaignId));
      gm = !!campaign && campaign.tokenHash === (await hash(body.gmToken));
    }
    if (row.tokenHash !== (await hash(token || "")) && !gm)
      return Response.json(
        { error: "Le lien secret est nécessaire pour accéder à cette fiche." },
        { status: 403 },
      );
    if (op === "load") return Response.json({ character: old });
    if (op === "join") {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, body.campaignId || ""));
      if (!campaign) throw Error("Campagne introuvable.");
      if (old.campaignId)
        throw Error("Ce personnage appartient déjà à une campagne.");
      old.campaignId = campaign.id;
      old.reviewStatus = "pending";
      old.revision++;
      await db
        .update(characters)
        .set({
          campaignId: campaign.id,
          data: JSON.stringify(old),
          revision: old.revision,
        })
        .where(
          and(eq(characters.id, id), eq(characters.revision, row.revision)),
        );
      return Response.json({ character: old });
    }
    if (op === "reviewCharacter") {
      if (!gm)
        return Response.json({ error: "Accès DM requis." }, { status: 403 });
      if (!["approved", "rejected"].includes(body.status))
        throw Error("Validation invalide.");
      if (body.revision !== old.revision)
        return Response.json(
          { error: "La fiche a changé. Actualisez avant de valider." },
          { status: 409 },
        );
      old.reviewStatus = body.status;
      old.revision++;
      const updated = await db
        .update(characters)
        .set({ data: JSON.stringify(old), revision: old.revision })
        .where(
          and(eq(characters.id, id), eq(characters.revision, row.revision)),
        )
        .returning({ id: characters.id });
      if (!updated.length)
        return Response.json(
          { error: "Modification simultanée. Actualisez la fiche." },
          { status: 409 },
        );
      return Response.json({ character: old });
    }
    if (op === "save") {
      if (body.character.revision !== row.revision)
        return Response.json(
          {
            error:
              "La fiche a changé ailleurs. Rechargez-la avant de continuer.",
          },
          { status: 409 },
        );
      const c = validate(
        {
          ...body.character,
          id: old.id,
          campaignId: old.campaignId,
          revision: old.revision + 1,
        },
        old,
        gm,
      );
      if (
        c.portrait &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.portrait)
      )
        throw Error("Portrait invalide.");
      const result = await db
        .update(characters)
        .set({ data: JSON.stringify(c), revision: c.revision })
        .where(
          and(eq(characters.id, id), eq(characters.revision, row.revision)),
        )
        .returning({ id: characters.id });
      if (!result.length)
        return Response.json(
          { error: "Modification simultanée. Rechargez la fiche." },
          { status: 409 },
        );
      return Response.json({ character: c });
    }
    throw Error("Commande inconnue.");
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Erreur serveur." },
      { status: 400 },
    );
  }
}
