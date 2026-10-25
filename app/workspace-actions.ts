"use server";
import { cookies, headers } from "next/headers";
import { executeWorkspace } from "../lib/workspace-service";
export async function workspaceAction(data: Record<string, unknown>, embedded = false) {
  const h = await headers(), origin = h.get("origin");
  if (!origin || new URL(origin).host !== h.get("host")) return { error: "Origine non autorisée." };
  const body = JSON.stringify(data);
  if (body.length > 2000000) return { error: "Données trop volumineuses." };
  const jar = await cookies(), name = embedded ? "cendres_owlbear_session" : "cendres_session";
  const token = jar.get(name)?.value ?? "";
  const requestHeaders = new Headers({ "Content-Type": "application/json", origin, cookie: `cendres_session=${token}` });
  const ip = h.get("cf-connecting-ip"); if (ip) requestHeaders.set("cf-connecting-ip", ip);
  const response = await executeWorkspace(new Request(`${origin}/workspace`, { method: "POST", headers: requestHeaders, body }));
  const cookie = response.headers.get("set-cookie");
  if (cookie) {
    const value = /^cendres_session=([^;]*)/.exec(cookie)?.[1] ?? "";
    const maxAge = Number(/Max-Age=(\d+)/.exec(cookie)?.[1] ?? 0);
    const secure = true;
    jar.set(name, value, { httpOnly: true, secure, sameSite: embedded && secure ? "none" : "lax", partitioned: embedded && secure, path: "/", maxAge });
  }
  const result: any = await response.json();
  return response.ok ? result : {...result, status: response.status};
}
