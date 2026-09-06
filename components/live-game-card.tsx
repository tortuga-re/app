"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Wifi, ChevronRight, Sparkles, Copy, Check } from "lucide-react";
import { liveGames, type LiveGameId, type LiveGameState } from "@/lib/live-game";
import { useDemoScenario } from "@/components/demo-scenario-provider";

export function LiveGameCard({ activeGameProp, alwaysShow = false }: { activeGameProp?: LiveGameId | null; alwaysShow?: boolean }) {
  const { scenario } = useDemoScenario();
  const [liveGame, setLiveGame] = useState<LiveGameState | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const wifiSsid = "Tortuga";
  const wifiPassword = "PERLANERA";

  const handleCopyPassword = () => {
    void navigator.clipboard.writeText(wifiPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  useEffect(() => {
    if (activeGameProp !== undefined) return;

    const fetchLiveGame = async () => {
      try {
        const res = await fetch("/api/live-game");
        if (res.ok) {
          const data = await res.json();
          setLiveGame(data.game ?? null);
        }
      } catch (err) {
        console.error("Errore lettura gioco live:", err);
      }
    };

    void fetchLiveGame();
  }, [activeGameProp]);

  const activeGame = scenario.enabled
    ? scenario.demoLiveGame === "none"
      ? null
      : scenario.demoLiveGame
    : activeGameProp !== undefined
    ? activeGameProp
    : liveGame?.active_game ?? null;

  if (!activeGame) {
    if (!alwaysShow) return null;

    return (
      <section className="loyalty-summary my-4 space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between border-b border-[rgba(40,35,28,.12)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[rgba(165,43,43,.2)] flex items-center justify-center text-[var(--accent-strong)] shrink-0">
              <Gamepad2 size={20} />
            </div>
            <div>
              <p className="minimal-eyebrow">Sfida in Sala</p>
              <h2 className="tonight-section-title">Bottiglia Omaggio al Tavolo</h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider shrink-0">
            IN ATTESA DEL GIOCO
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Partecipa ai giochi live (Cervellone / Kantaquiz) non appena il Capitano darà il via in sala! Connettiti subito alla rete Wi-Fi del locale per farti trovare pronto.
        </p>

        {/* Box Wi-Fi Inline */}
        <div className="p-3.5 rounded-2xl bg-[#f3ecdf] border border-[rgba(40,35,28,.14)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#fffdf8] border border-[rgba(40,35,28,.12)] flex items-center justify-center text-[var(--accent-strong)] shrink-0">
              <Wifi size={16} />
            </div>
            <div className="min-w-0 text-left">
              <span className="block text-[10px] text-[var(--text-muted)] uppercase font-bold">Wi-Fi del Locale</span>
              <span className="block text-xs font-extrabold text-[var(--text)] truncate">
                Rete: <span className="font-mono text-[var(--accent-strong)]">{wifiSsid}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPassword}
            title="Copia Password Wi-Fi"
            className="px-2.5 py-1.5 rounded-xl bg-[#fffdf8] hover:bg-white border border-[rgba(40,35,28,.16)] flex items-center gap-1.5 text-xs font-mono font-extrabold text-[var(--accent-strong)] active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
          >
            {copiedPassword ? (
              <Check size={14} className="text-green-600 shrink-0 animate-in zoom-in-50 duration-200" />
            ) : (
              <Copy size={14} className="text-[var(--accent-strong)] shrink-0" />
            )}
            <span>{wifiPassword}</span>
          </button>
        </div>
      </section>
    );
  }

  const gameDefinition = activeGame && liveGames[activeGame] 
    ? liveGames[activeGame] 
    : { label: "Gioco Live", url: "https://drwhy.tortugabay.it" };

  const handleOpenGame = () => {
    try {
      let deviceId = typeof window !== "undefined" ? localStorage.getItem("tortuga_app_device_id") : null;
      if (!deviceId && typeof window !== "undefined") {
        deviceId = `app_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        localStorage.setItem("tortuga_app_device_id", deviceId);
      }
      void fetch("/api/live-game/team-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, gameId: activeGame }),
        keepalive: true,
      });
    } catch (err) {
      console.warn("Impossibile registrare click squadra:", err);
    }
  };

  return (
    <>
      <section className="loyalty-summary my-4 space-y-4 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(40,35,28,.12)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[rgba(165,43,43,.2)] flex items-center justify-center text-[var(--accent-strong)] shrink-0">
              <Gamepad2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a52b2b] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#a52b2b]" />
                </span>
                <p className="minimal-eyebrow">Gioco in Corso in Sala</p>
              </div>
              <h2 className="tonight-section-title">{gameDefinition.label}</h2>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-red-100 border border-red-300 text-red-800 font-extrabold text-[10px] uppercase tracking-wider shrink-0">
            LIVE NOW
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Partecipa al gioco direttamente dal tuo tavolo! Segui i 2 passaggi:
        </p>

        {/* Action Step Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Step 1: Wi-Fi Credentials Inline */}
          <div className="p-3.5 rounded-2xl bg-[#f3ecdf] border border-[rgba(40,35,28,.14)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#fffdf8] border border-[rgba(40,35,28,.12)] flex items-center justify-center text-[var(--accent-strong)] shrink-0">
                <Wifi size={16} />
              </div>
              <div className="min-w-0 text-left">
                <span className="block text-[10px] text-[var(--text-muted)] uppercase font-bold">Passaggio 1 • Wi-Fi</span>
                <span className="block text-xs font-extrabold text-[var(--text)] truncate">
                  Rete: <span className="font-mono text-[var(--accent-strong)]">{wifiSsid}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyPassword}
              title="Copia Password Wi-Fi"
              className="px-2.5 py-1.5 rounded-xl bg-[#fffdf8] hover:bg-white border border-[rgba(40,35,28,.16)] flex items-center gap-1.5 text-xs font-mono font-extrabold text-[var(--accent-strong)] active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              {copiedPassword ? (
                <Check size={14} className="text-green-600 shrink-0 animate-in zoom-in-50 duration-200" />
              ) : (
                <Copy size={14} className="text-[var(--accent-strong)] shrink-0" />
              )}
              <span>{wifiPassword}</span>
            </button>
          </div>

          {/* Step 2: Open Game in Native Mobile Browser */}
          <a
            href={gameDefinition.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenGame}
            className="minimal-primary p-3.5 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.98] transition-all no-underline text-white"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles size={16} className="shrink-0" />
              <div className="min-w-0 text-left">
                <span className="block text-[10px] text-white/80 uppercase font-bold">Passaggio 2</span>
                <span className="block text-xs font-bold truncate">
                  Entra nel Gioco
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </section>
    </>
  );
}
