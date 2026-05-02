"use client";

import { useEffect, useState } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { storageKeys } from "@/lib/config";

export function SurveyTeaserCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkSurvey = async () => {
      if (typeof window === "undefined") return;

      const lastVisitAtStr = localStorage.getItem(storageKeys.lastVisitAt);
      if (!lastVisitAtStr) return;

      const lastVisitAt = parseInt(lastVisitAtStr, 10);
      if (isNaN(lastVisitAt)) return;

      const visitDate = new Date(lastVisitAt);
      
      // La scheda compare alle 9:45 del giorno dopo la visita
      const appearanceDate = new Date(visitDate);
      appearanceDate.setDate(appearanceDate.getDate() + 1);
      appearanceDate.setHours(9, 45, 0, 0);

      const now = new Date();
      // La scheda scompare 48 ore dopo la sua apparizione
      const disappearanceDate = new Date(appearanceDate.getTime() + 48 * 60 * 60 * 1000);

      if (now >= appearanceDate && now < disappearanceDate) {
        setShow(true);

        // Verifica se inviare la notifica push
        const pushSentAtStr = localStorage.getItem(storageKeys.surveyPushSentAt);
        const pushSentAt = pushSentAtStr ? parseInt(pushSentAtStr, 10) : 0;

        // Inviamo la push solo se non è stata già inviata per questa specifica apparizione
        if (pushSentAt < appearanceDate.getTime()) {
          try {
            await fetch("/api/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Com'è andata al Tortuga?",
                body: "Facci sapere la tua esperienza con un mini sondaggio e ricevi un omaggio!",
                url: "/?survey=true",
              }),
            });
            localStorage.setItem(storageKeys.surveyPushSentAt, Date.now().toString());
          } catch (err) {
            console.error("[Survey Card] Errore invio push:", err);
          }
        }
      } else {
        setShow(false);
      }
    };

    void checkSurvey();
    
    // Ricontrolla ogni minuto se siamo nel range di visibilità
    const interval = setInterval(() => void checkSurvey(), 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <div className="panel rounded-[2rem] p-5 border-2 border-[var(--accent-strong)]/30 bg-[var(--accent-strong)]/5 animate-in fade-in slide-in-from-top-4 duration-1000 overflow-hidden">
      <div className="space-y-2">
        <p className="eyebrow text-[var(--accent-strong)]">Esperienza Tortuga</p>
        <h2 className="text-xl font-semibold leading-tight text-white">
          com&apos;è andata al Tortuga?
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Facci sapere la tua esperienza con un mini sondaggio, al termine ti invieremo un omaggio per il tempo che ci hai dedicato.
        </p>
      </div>

      <a
        href="https://cprt.it/731fa?utm_source=sondaggio&utm_medium=soddisfazione&utm_campaign=smartphone"
        target="_blank"
        rel="noreferrer"
        className="button-primary mt-5 flex min-h-14 w-full items-center justify-center px-5 text-sm font-bold"
        onClick={() => triggerHaptic()}
      >
        Compila il sondaggio
      </a>
    </div>
  );
}
