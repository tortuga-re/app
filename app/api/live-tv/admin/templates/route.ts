import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { getLiveTvState, replacePlaylist } from "@/lib/live-tv/store";
import { deleteLiveTvTemplate, listLiveTvTemplates, saveLiveTvTemplate } from "@/lib/live-tv/templates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) return adminRequest.response;
  return NextResponse.json({ templates: await listLiveTvTemplates() });
}

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) return adminRequest.response;

  try {
    const body = await readLiveTvAdminBody<{ action?: string; name?: string; id?: string }>(request);
    if (body.action === "save") {
      const state = await getLiveTvState();
      const template = await saveLiveTvTemplate(body.name ?? "", state.playlist);
      return NextResponse.json({ success: true, template, templates: await listLiveTvTemplates() });
    }
    if (body.action === "apply") {
      const template = (await listLiveTvTemplates()).find((entry) => entry.id === body.id);
      if (!template) throw new Error("Scaletta non trovata.");
      await replacePlaylist(template.items);
      return NextResponse.json({ success: true, state: await getLiveTvState(), templates: await listLiveTvTemplates() });
    }
    if (body.action === "delete") {
      await deleteLiveTvTemplate(body.id ?? "");
      return NextResponse.json({ success: true, templates: await listLiveTvTemplates() });
    }
    throw new Error("Azione template non valida.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Operazione non riuscita." }, { status: 400 });
  }
}
