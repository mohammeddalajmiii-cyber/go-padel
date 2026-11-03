import type { NextRequest } from "next/server";
import { getSettings, updateSettings, type Settings } from "@/lib/settings";
import { admin, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return admin(req, async () => json(await getSettings()));
}

export function PUT(req: NextRequest) {
  return admin(req, async () => {
    const error = await updateSettings((await readJson(req)) as Partial<Settings>);
    if (error) return json({ error: "invalid", message: error }, 400);
    return json(await getSettings());
  });
}
