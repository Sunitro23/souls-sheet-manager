export type CampaignAccess = { id: string; token: string; name: string };
export function readCampaignAccess(
  storage: Pick<Storage, "getItem">,
): CampaignAccess[] {
  const read = (key: string) => {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const stored = read("cendres-campaigns"),
    legacy = read("cendres-gm");
  const entries = [
    ...(Array.isArray(stored) ? stored : []),
    ...(legacy ? [legacy] : []),
  ];
  const unique = new Map<string, CampaignAccess>();
  for (const item of entries)
    if (
      typeof item?.id === "string" &&
      typeof item?.token === "string" &&
      item.token &&
      !unique.has(item.id)
    )
      unique.set(item.id, {
        id: item.id,
        token: item.token,
        name: typeof item.name === "string" ? item.name : "Campagne",
      });
  return [...unique.values()];
}
export function rememberCampaignAccess(
  storage: Pick<Storage, "getItem" | "setItem">,
  access: CampaignAccess,
) {
  const entries = [
    ...readCampaignAccess(storage).filter((a) => a.id !== access.id),
    access,
  ];
  storage.setItem("cendres-campaigns", JSON.stringify(entries));
  storage.setItem("cendres-active-campaign", access.id);
  storage.setItem("cendres-gm", JSON.stringify(access));
  return entries;
}
