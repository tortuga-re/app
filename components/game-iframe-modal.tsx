"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";

type GameIframeModalProps = {
  open: boolean;
  onClose: () => void;
  gameUrl: string;
  gameTitle: string;
};

export function GameIframeModal({ open, onClose, gameUrl, gameTitle }: GameIframeModalProps) {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* Floating Action Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2 pointer-events-auto">
        {/* Pulsante per apertura in browser esterno */}
        <a
          href={gameUrl}
          target="_blank"
          rel="noreferrer"
          className="w-10 h-10 rounded-full bg-black/80 backdrop-blur-md text-white/90 hover:text-white border border-white/30 flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Apri nel browser esterno"
        >
          <ExternalLink size={18} />
        </a>

        {/* Pulsante X di chiusura */}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-red-600/90 hover:bg-red-700 text-white border border-white/30 flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Chiudi gioco"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Iframe Container (Full Screen 100%) */}
      <div className="relative w-full h-full bg-[#120f0c]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#120f0c] text-white p-6 z-10 space-y-3">
            <div className="animate-spin w-10 h-10 border-4 border-[#c59a47] border-t-transparent rounded-full" />
            <p className="font-bold text-sm text-[#f4e0ad]">Caricamento {gameTitle}...</p>
            <p className="text-xs text-white/50 text-center max-w-xs">
              Assicurati di essere collegato al Wi-Fi del locale per partecipare!
            </p>
          </div>
        ) : null}

        <iframe
          src={gameUrl}
          title={gameTitle}
          onLoad={() => setLoading(false)}
          allow="fullscreen; autoplay; camera; microphone; geolocation"
          className="w-full h-full border-0 block"
        />
      </div>
    </div>,
    document.body
  );
}
