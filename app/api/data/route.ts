import { learnTechnique, learnPersonalSkill } from "../../../lib/combat";
import { getDb } from "../../../db";
import { characters, campaigns } from "../../../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
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
    if (op === "campaignInfo") {
      const [campaign] = await db
        .select({ id: campaigns.id, name: campaigns.name })
        .from(campaigns)
        .where(eq(campaigns.id, id || ""));
      if (!campaign) throw Error("Campagne introuvable.");
      return Response.json(campaign);
    }
    if (op === "create") {
      if (!body.campaignId)
        throw Error("Choisissez une campagne avant de créer un personnage.");
      const token = secret();
      const c = createCharacter({
        name: body.name,
        level: body.level,
        stats: body.stats,
        magic: body.magic,
      });
      let admin = false;
      let campaignInfo: { id: string; name: string } | null = null;
      if (body.campaignId) {
        const [target] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, body.campaignId));
        if (!target) throw Error("Campagne introuvable.");
        if (body.gmToken) {
          admin = target.tokenHash === (await hash(body.gmToken));
          if (!admin)
            return Response.json(
              { error: "Accès administrateur invalide pour cette campagne." },
              { status: 403 },
            );
        }
        c.campaignId = target.id;
        c.reviewStatus = admin ? "approved" : "pending";
        campaignInfo = { id: target.id, name: target.name };
      }
      await db.insert(characters).values({
        id: c.id,
        campaignId: c.campaignId,
        tokenHash: await hash(token),
        data: JSON.stringify(c),
        revision: 0,
      });
      return Response.json({
        character: c,
        token,
        permissions: { isOwner: true, canValidate: admin },
        campaign: campaignInfo,
      });
    }
    if (op === "campaignCreate") {
      if (typeof body.name !== "string" || !body.name.trim())
        throw Error("Nom de campagne requis.");
      const id = crypto.randomUUID(),
        token = secret(),
        tokenHash = await hash(token),
        name = body.name.trim().slice(0, 100);
      let character: Character | null = null;
      if (body.characterId) {
        const [row] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, body.characterId));
        if (!row || row.tokenHash !== (await hash(body.characterToken || "")))
          return Response.json(
            { error: "Vous devez posséder le personnage pour le rattacher." },
            { status: 403 },
          );
        if (row.campaignId)
          throw Error("Ce personnage appartient déjà à une campagne.");
        if (body.characterRevision !== row.revision)
          return Response.json(
            {
              error:
                "La fiche a changé. Actualisez-la avant de créer la campagne.",
            },
            { status: 409 },
          );
        character = normalizeStored(JSON.parse(row.data));
        character.campaignId = id;
        character.reviewStatus = "approved";
        character.revision++;
        const guard = and(
          eq(characters.id, row.id),
          eq(characters.revision, row.revision),
          isNull(characters.campaignId),
        );
        const result = await db.batch([
          db
            .insert(campaigns)
            .select(
              db
                .select({
                  id: sql<string>`${id}`.as("id"),
                  tokenHash: sql<string>`${tokenHash}`.as("tokenHash"),
                  name: sql<string>`${name}`.as("name"),
                })
                .from(characters)
                .where(guard),
            )
            .returning({ id: campaigns.id }),
          db
            .update(characters)
            .set({
              campaignId: id,
              data: JSON.stringify(character),
              revision: character.revision,
            })
            .where(guard)
            .returning({ id: characters.id }),
        ]);
        if (!result[0].length || !result[1].length)
          return Response.json(
            {
              error:
                "La fiche a changé. Actualisez-la avant de créer la campagne.",
            },
            { status: 409 },
          );
      } else await db.insert(campaigns).values({ id, tokenHash, name });
      return Response.json({
        id,
        token,
        name,
        character,
        permissions: character ? { isOwner: true, canValidate: true } : null,
      });
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
    const isOwner = row.tokenHash === (await hash(token || ""));
    if (!isOwner && !gm)
      return Response.json(
        { error: "Le lien secret est nécessaire pour accéder à cette fiche." },
        { status: 403 },
      );
    if (op === "load") {
      const [campaignInfo] = old.campaignId
        ? await db
            .select({ id: campaigns.id, name: campaigns.name })
            .from(campaigns)
            .where(eq(campaigns.id, old.campaignId))
        : [];
      return Response.json({
        character: old,
        permissions: { isOwner, canValidate: gm },
        campaign: campaignInfo ?? null,
      });
    }
    if (op === "join") {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, body.campaignId || ""));
      if (!campaign) throw Error("Campagne introuvable.");
      if (old.campaignId)
        throw Error("Ce personnage appartient déjà à une campagne.");
      old.campaignId = campaign.id;
      const targetAdmin =
        !!body.gmToken && campaign.tokenHash === (await hash(body.gmToken));
      old.reviewStatus = targetAdmin ? "approved" : "pending";
      old.revision++;
      const joined = await db
        .update(characters)
        .set({
          campaignId: campaign.id,
          data: JSON.stringify(old),
          revision: old.revision,
        })
        .where(
          and(eq(characters.id, id), eq(characters.revision, row.revision)),
        )
        .returning({ id: characters.id });
      if (!joined.length)
        return Response.json(
          { error: "La fiche a changé. Actualisez-la." },
          { status: 409 },
        );
      return Response.json({
        character: old,
        permissions: { isOwner, canValidate: targetAdmin },
        campaign: { id: campaign.id, name: campaign.name },
      });
    }
    if (op === "learnTechnique" || op === "learnSkill") {
      if (body.revision !== old.revision)
        return Response.json(
          {
            error:
              "La fiche a changé. Rechargez-la avant d’apprendre une technique.",
          },
          { status: 409 },
        );
      const updated =
        op === "learnSkill"
          ? learnPersonalSkill(old, body.skillId)
          : learnTechnique(old, body.weaponTypeId, body.techniqueId);
      updated.revision = old.revision + 1;
      const result = await db
        .update(characters)
        .set({ data: JSON.stringify(updated), revision: updated.revision })
        .where(
          and(eq(characters.id, id), eq(characters.revision, row.revision)),
        )
        .returning({ id: characters.id });
      if (!result.length)
        return Response.json(
          { error: "Apprentissage simultané. Rechargez la fiche." },
          { status: 409 },
        );
      return Response.json({ character: updated });
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
