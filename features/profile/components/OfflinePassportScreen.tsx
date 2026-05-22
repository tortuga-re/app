"use client";

import { useEffect, useState } from "react";
import type { OfflinePassportData } from "@/lib/offline-passport";
import { loadOfflinePassport } from "@/lib/offline-passport";
import { WifiOff, Anchor } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import QRCodeLib from "qrcode";

interface OfflinePassportScreenProps {
  /** dati già caricati, oppure null se si carica dal localStorage */
  data?: OfflinePassportData | null;
}

export function OfflinePassportScreen({ data: propData }: OfflinePassportScreenProps) {
  const [passport] = useState<OfflinePassportData | null>(() => propData ?? loadOfflinePassport());
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Genera il QR code SVG come data-url (tutto in locale, senza rete)
  useEffect(() => {
    if (!passport?.contactCode) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (QRCodeLib as any).toDataURL(passport.contactCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [passport?.contactCode]);

  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-center">
      {/* Offline badge */}
      <div className="mb-8 flex items-center gap-2 rounded-full border border-[rgba(216,176,106,0.2)] bg-[rgba(216,176,106,0.07)] px-4 py-2">
        <WifiOff size={14} className="text-[var(--accent-strong)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent-strong)]">
          Modalità Offline
        </span>
      </div>

      {passport ? (
        <>
          {/* QR Code */}
          {qrDataUrl ? (
            <div className="mb-6 overflow-hidden rounded-3xl border-4 border-[var(--accent-strong)] bg-white p-3 shadow-[0_0_40px_rgba(216,176,106,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Passaporto Offline" className="h-56 w-56 object-contain" />
            </div>
          ) : (
            <div className="mb-6 flex h-64 w-64 items-center justify-center rounded-3xl border-2 border-white/10 bg-white/5">
              <Anchor size={48} className="text-[var(--accent-strong)] opacity-50" />
            </div>
          )}

          <h2 className="text-2xl font-black text-white">{passport.profileName}</h2>
          <p className="mt-1 text-sm text-white/50">{passport.email}</p>

          <div className="mt-4 flex items-center gap-2 rounded-full border border-[rgba(216,176,106,0.18)] bg-white/5 px-4 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
              {passport.loyaltyLabel}
            </span>
            <span className="text-xs text-white/40">·</span>
            <span className="text-xs text-white/60">{passport.loyaltyPoints} punti</span>
          </div>

          <p className="mt-8 max-w-xs text-xs text-white/30 leading-5">
            Mostra questo QR allo staff Tortuga per registrare la tua visita o verificare la tua card fedeltà.
          </p>
        </>
      ) : (
        /* Nessun dato salvato in locale */
        <>
          <Anchor size={56} className="mb-6 text-white/20" />
          <h2 className="text-xl font-black text-white">Nessun passaporto disponibile</h2>
          <p className="mt-3 max-w-xs text-sm text-white/40 leading-6">
            Accedi almeno una volta con la connessione attiva per abilitare la modalità offline.
          </p>
        </>
      )}
    </section>
  );
}


