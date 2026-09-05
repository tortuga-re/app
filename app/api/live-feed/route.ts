import { NextResponse } from "next/server";
import { listLiveTvCustomerSubmissions } from "@/lib/live-tv/customer-submissions";
import { findLiveTvMediaFilePath } from "@/lib/live-tv/media-storage";
import { isSubmissionInCurrentEvening } from "@/lib/live-tv/evening-window";
import { getLiveGameTeamsCount } from "@/lib/server/live-game-teams";
import { getAppStateJson } from "@/lib/server/app-state";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const [rawSubmissions, rawGreetings] = await Promise.all([
      listLiveTvCustomerSubmissions().catch(() => []),
      getAppStateJson<any[]>("live_tv_customer_greetings", []).catch(() => []),
    ]);

    const now = new Date();
    // Calcolo giorno e orario Roma (Europe/Rome)
    const romeTimeFormatter = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = romeTimeFormatter.formatToParts(now);
    const weekdayPart = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "";
    const hourPart = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minutePart = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

    // Determina il giorno effettivo della serata in ora solare/legale Roma
    const targetDate = new Date(now.getTime());
    if (hourPart < 2) {
      targetDate.setTime(targetDate.getTime() - 12 * 3600 * 1000);
    }

    const targetDayFormatter = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      weekday: "long",
    });
    const targetWeekday = targetDayFormatter.format(targetDate).toLowerCase();

    let eventName = "Perla Nera 2x1";
    let eventLabel = "Questa sera: ";
    const isOffDay = targetWeekday.includes("lun") || targetWeekday.includes("mar");

    if (isOffDay) {
      eventLabel = "Prossima serata: ";
      eventName = "Perla Nera 2x1";
    } else if (targetWeekday.includes("mer")) {
      eventLabel = "Questa sera: ";
      eventName = "Perla Nera 2x1";
    } else if (targetWeekday.includes("gio")) {
      eventLabel = "Questa sera: ";
      eventName = "The Social Game";
    } else if (targetWeekday.includes("ven")) {
      eventLabel = "Questa sera: ";
      eventName = "Kanta Quiz";
    } else if (targetWeekday.includes("sab")) {
      eventLabel = "Questa sera: ";
      eventName = "Notte del Capitano";
    } else if (targetWeekday.includes("dom")) {
      eventLabel = "Questa sera: ";
      eventName = "Il Cervellone";
    }

    // Diretta attiva dalle 19:30 alle 02:00 ora italiana (nei giorni di serata)
    const isLive = !isOffDay && ((hourPart > 19 || (hourPart === 19 && minutePart >= 30)) || hourPart < 2);

    // Normalizza mediaUrl delle foto rendendole assolute e filtra per finestra serata attiva (reset alle 19:30)
    const BASE_APP_URL = "https://app.tortugabay.it";
    const imageSubmissions = rawSubmissions.filter(
      (sub) => sub.kind === "image" && sub.mediaUrl && isSubmissionInCurrentEvening(sub.createdAt, now),
    );

    const photos: Array<{
      id: string;
      mediaUrl: string;
      uploaderName: string;
      createdAt: string;
      likesCount: number;
    }> = [];

    for (const sub of imageSubmissions) {
      const fileName = sub.fileName || sub.mediaUrl.split("/").pop();
      if (fileName) {
        const filePath = await findLiveTvMediaFilePath("image", fileName);
        if (filePath) {
          let fullUrl = sub.mediaUrl;
          if (fullUrl.startsWith("/")) {
            fullUrl = `${BASE_APP_URL}${fullUrl}`;
          }
          photos.push({
            id: sub.id,
            mediaUrl: fullUrl,
            uploaderName: sub.uploaderName || "Ospite al tavolo",
            createdAt: sub.createdAt,
            likesCount: sub.likesCount ?? 0,
          });
        }
      }
      if (photos.length >= 30) break;
    }

    const activeGreetings = rawGreetings.filter((g) => isSubmissionInCurrentEvening(g.createdAt, now));

    const greetings = activeGreetings.slice(0, 30).map((g) => ({
      id: g.id,
      nickname: g.nickname || "Ciurma al Tavolo",
      tableNumber: g.tableNumber || "",
      messageType: g.messageType || "brindisi",
      customMessage: g.customMessage || null,
      createdAt: g.createdAt,
    }));

    // Conteggio dinamico squadre che hanno aperto i giochi live stasera
    const teamsCount = await getLiveGameTeamsCount(now);

    return NextResponse.json(
      {
        success: true,
        isLive,
        eventLabel,
        eventName,
        teamsCount,
        stats: {
          photosCount: photos.length,
          greetingsCount: greetings.length,
          teamsCount,
        },
        photos,
        greetings,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    console.error("[LiveFeedAPI] Errore recupero live feed:", error);
    return NextResponse.json(
      { error: "Impossibile recuperare il feed live." },
      { status: 500, headers: corsHeaders },
    );
  }
}
