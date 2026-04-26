import { NextResponse } from "next/server";

import { sendPushNotification } from "@/lib/push/send";
import type { PushSendPayload } from "@/lib/push/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme.toLowerCase() === "bearer" && token) {
    return token.trim();
  }

  return request.headers.get("x-push-admin-token")?.trim() ?? "";
};

const isAuthorized = (request: Request) => {
  const configuredToken = process.env.PUSH_ADMIN_TOKEN?.trim() ?? "";

  if (!configuredToken) {
    return false;
  }

  return getBearerToken(request) === configuredToken;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Invio push non autorizzato." },
      { status: 401 },
    );
  }

  let payload: Partial<PushSendPayload>;

  try {
    payload = (await request.json()) as Partial<PushSendPayload>;
  } catch {
    return NextResponse.json(
      { error: "Payload push non valido." },
      { status: 400 },
    );
  }

  if (!payload.title?.trim() || !payload.body?.trim()) {
    return NextResponse.json(
      { error: "Titolo e testo notifica sono obbligatori." },
      { status: 400 },
    );
  }

  try {
    const response = await sendPushNotification({
      title: payload.title.trim(),
      body: payload.body.trim(),
      url: payload.url?.trim() || "/ciurma",
      tag: payload.tag?.trim() || "tortuga-update",
      email: payload.email?.trim().toLowerCase() || undefined,
      icon: payload.icon?.trim() || undefined,
      badge: payload.badge?.trim() || undefined,
      renotify: Boolean(payload.renotify),
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invio push non disponibile.",
      },
      { status: 500 },
    );
  }
}
