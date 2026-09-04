import { NextResponse } from "next/server";
import { listLiveTvCustomerSubmissions } from "@/lib/live-tv/customer-submissions";
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

    let eventName = "Serata Pirata Tortuga";
    if (weekdayPart.includes("mer")) eventName = "Perla Nera 2x1";
    else if (weekdayPart.includes("gio")) eventName = "The Social Game";
    else if (weekdayPart.includes("ven")) eventName = "Kanta Quiz";
    else if (weekdayPart.includes("sab")) eventName = "Notte del Capitano";
    else if (weekdayPart.includes("dom")) eventName = "Il Cervellone";

    // Locale attivo di norma da mercoledì a domenica, orario cena (o domenica pranzo)
    const isDayOpen = !weekdayPart.includes("lun") && !weekdayPart.includes("mar");
    const isLive = isDayOpen && (hourPart >= 19 || hourPart < 2 || (weekdayPart.includes("dom") && hourPart >= 12 && hourPart <= 15));

    // Normalizza mediaUrl delle foto rendendole assolute
    const BASE_APP_URL = "https://app.tortugabay.it";
    const photos = rawSubmissions
      .filter((sub) => sub.kind === "image" && sub.mediaUrl)
      .slice(0, 30)
      .map((sub) => {
        let fullUrl = sub.mediaUrl;
        if (fullUrl.startsWith("/")) {
          fullUrl = `${BASE_APP_URL}${fullUrl}`;
        }
        return {
          id: sub.id,
          mediaUrl: fullUrl,
          uploaderName: sub.uploaderName || "Ospite al tavolo",
          createdAt: sub.createdAt,
        };
      });

    const greetings = rawGreetings.slice(0, 30).map((g) => ({
      id: g.id,
      nickname: g.nickname || "Ciurma al Tavolo",
      tableNumber: g.tableNumber || "",
      messageType: g.messageType || "brindisi",
      customMessage: g.customMessage || null,
      createdAt: g.createdAt,
    }));

    // In attesa dell'integrazione di Kantaquiz e Cervellone
    const teamsCount = 0;

    return NextResponse.json(
      {
        success: true,
        isLive,
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
