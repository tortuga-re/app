import { NextResponse } from "next/server";
import { getProfileData } from "@/lib/cooperto/service";
import { getBirthdayInsight } from "@/lib/customer-profile";
import { listPushSubscriptions } from "@/lib/push/subscription-store";
import { sendPushNotification } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/**
 * Endpoint per l'invio automatico delle notifiche push di compleanno:
 * 1. 14 giorni prima del compleanno ("Tra 2 settimane è il tuo compleanno! Cena offerta dalla Ciurma, scopri di più.")
 * 2. Il giorno stesso del compleanno ("Buon Compleanno, Pirata! 🎂🏴‍☠️ Tanti auguri da tutta la Ciurma del Tortuga! Festeggia con noi a bordo!")
 * 
 * Da richiamare ogni mattina (es. alle 10:00) tramite Cron Job.
 * Esempio: /api/cron/birthday-push?secret=IL_TUO_SEGRETO
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  const cronSecret = process.env.CRON_SECRET || "tortuga-cron-fallback-secret-2026";
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Non autorizzato. Segreto mancante o errato." }, { status: 401 });
  }

  try {
    const subscriptions = await listPushSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({ message: "Nessuna sottoscrizione push trovata." });
    }

    // Raggruppa per email univoca
    const emailToSubs = new Map<string, typeof subscriptions>();
    for (const sub of subscriptions) {
      if (sub.email) {
        const normalized = sub.email.trim().toLowerCase();
        const list = emailToSubs.get(normalized) || [];
        list.push(sub);
        emailToSubs.set(normalized, list);
      }
    }

    let sent14d = 0;
    let sentToday = 0;
    const currentYear = new Date().getFullYear();

    for (const [email, userSubs] of emailToSubs.entries()) {
      try {
        const profile = await getProfileData("email", email);
        const birthDate = profile.contact?.DataDiNascita;
        if (!birthDate) continue;

        const insight = getBirthdayInsight(birthDate, 14);
        if (!insight) continue;

        // 14 giorni prima del compleanno
        if (insight.daysUntil === 14) {
          const res = await sendPushNotification({
            title: "Tra 2 settimane è il tuo compleanno!",
            body: "Cena offerta dalla Ciurma, scopri di più.",
            url: "https://app.tortugabay.it",
            tag: `birthday-14d-${currentYear}`,
            email,
          });
          if (res.sent > 0) sent14d++;
        }

        // Il giorno stesso del compleanno
        if (insight.isToday) {
          const res = await sendPushNotification({
            title: "Buon Compleanno, Pirata! 🎂🏴‍☠️",
            body: "Tanti auguri da tutta la Ciurma del Tortuga! Festeggia con noi a bordo!",
            url: "https://app.tortugabay.it",
            tag: `birthday-today-${currentYear}`,
            email,
          });
          if (res.sent > 0) sentToday++;
        }
      } catch (err) {
        console.warn(`[BirthdayPush] Errore verifica profilo per ${email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processedEmails: emailToSubs.size,
      sent14DaysBefore: sent14d,
      sentToday: sentToday,
    });
  } catch (error) {
    console.error("[BirthdayPush] Errore esecuzione cron compleanni:", error);
    return NextResponse.json(
      { error: "Errore durante l'invio delle notifiche di compleanno." },
      { status: 500 },
    );
  }
}
