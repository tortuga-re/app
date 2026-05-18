"use client";

import { TriangleAlert, Loader2 } from "lucide-react";
import { useState } from "react";

export function PanicButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handlePanic = async () => {
    setIsResetting(true);
    try {
      await Promise.all([
        fetch("/api/live-tv/admin/set-stage-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageMode: "live_tv" }),
        }),
        fetch("/api/live-tv/admin/reset-defaults", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      ]);
      setIsOpen(false);
    } catch (error) {
      console.error("Panic button error:", error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all ${
          isOpen
            ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]"
            : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
        }`}
      >
        <TriangleAlert size={18} className={isOpen ? "animate-pulse" : ""} />
        <span className="hidden sm:inline">PANIC</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-72 bg-[#1a1a1a] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-white/5 bg-red-500/10">
            <p className="font-black text-red-400 flex items-center gap-2">
              <TriangleAlert size={18} />
              EMERGENZA LOCALE
            </p>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-white/70">
              Premendo questo pulsante forzerai la chiusura di qualsiasi gioco in corso e riporterai i monitor sulla rotazione &quot;Generica&quot;.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors"
                disabled={isResetting}
              >
                Annulla
              </button>
              <button
                onClick={handlePanic}
                disabled={isResetting}
                className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-white transition-colors flex justify-center items-center gap-2"
              >
                {isResetting ? <Loader2 size={18} className="animate-spin" /> : "ESEGUI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
