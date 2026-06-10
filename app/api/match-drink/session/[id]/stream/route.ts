import { NextRequest, NextResponse } from "next/server";
import { streamManager } from "@/lib/match-drink/stream-manager";
import { MatchDrinkSession } from "@/lib/match-drink/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const sendState = (session: MatchDrinkSession | null) => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ session })}\n\n`);
        } catch {
          // Stream could be closed
        }
      };

      // Iscriviti agli aggiornamenti globali
      const unsubscribe = streamManager.subscribe(id, (session) => {
        sendState(session);
      });

      // Heartbeat per evitare timeout di Hostinger/Nginx
      const heartbeat = setInterval(() => {
        try { controller.enqueue(": heartbeat\n\n"); } catch {}
      }, 15000);

      // Pulisci quando il client si disconnette
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
