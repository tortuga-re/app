import { NextResponse } from "next/server";
import { listVisitsForDate, updateVisitSurveyStatus, listPushSubscriptions } from "@/lib/push/subscription-store";
import { sendPushToSubscription } from "@/lib/push/send";
import { getRomeDateIsoWithOffset } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Endpoint per l'invio automatico del sondaggio post-visita.
 * Da richiamare ogni giorno alle 09:45 tramite Cron Job.
 * 
 * Esempio: /api/cron/survey-push?secret=IL_TUO_SEGRETO
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Verifica di sicurezza semplice tramite segreto in environment variable
  const cronSecret = process.env.CRON_SECRET || "tortuga-cron-fallback-secret-2026";
  
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Non autorizzato. Segreto mancante o errato." }, { status: 401 });
  }

  // La visita e il promemoria seguono il calendario del locale, non UTC.
  const dateIso = getRomeDateIsoWithOffset(-1);

  try {
    const visits = await listVisitsForDate(dateIso);
    const subscriptions = await listPushSubscriptions();

    if (visits.length === 0) {
      return NextResponse.json({ message: "Nessuna visita registrata per ieri.", date: dateIso });
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (const visit of visits) {
      // Evitiamo invii doppi se il cron viene richiamato più volte
      if (visit.surveySent) {
        skippedCount++;
        continue;
      }

      // Cerchiamo di identificare l'email dell'utente
      // In Tortuga, se non c'è un CodiceContatto reale, il contactCode stesso è l'email.
      const targetEmail = (visit.email || (visit.contactCode.includes("@") ? visit.contactCode : null))?.toLowerCase();
      
      if (!targetEmail) {
        skippedCount++;
        continue;
      }

      // Troviamo tutte le sottoscrizioni push associate a questa email
      const userSubs = subscriptions.filter(s => s.email?.toLowerCase() === targetEmail);

      if (userSubs.length === 0) {
        skippedCount++;
        continue;
      }

      let visitSentSuccess = false;
      for (const sub of userSubs) {
        const success = await sendPushToSubscription(sub, {
          title: "Com'è andata al Tortuga?",
          body: "Facci sapere la tua esperienza con un mini sondaggio e ricevi un omaggio!",
          url: "https://cprt.it/731fa?utm_source=sondaggio&utm_medium=soddisfazione&utm_campaign=smartphone",
          tag: "survey-feedback"
        });

        if (success) {
          visitSentSuccess = true;
          sentCount++;
        }
      }
      
      // Segnamo la visita come "notificata" nel database Redis
      if (visitSentSuccess) {
        await updateVisitSurveyStatus(dateIso, visit.contactCode);
      }
    }

    return NextResponse.json({
      success: true,
      date: dateIso,
      totalVisits: visits.length,
      sentPushes: sentCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error("[Cron Survey Push] Errore critico:", error);
    return NextResponse.json({ 
      error: "Errore interno durante l'elaborazione del cron.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
