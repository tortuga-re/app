"use client";

import { useState } from "react";
import { Wifi, KeyRound, Copy, Check, X, QrCode } from "lucide-react";

type WifiConnectModalProps = {
  open: boolean;
  onClose: () => void;
};

export function WifiConnectModal({ open, onClose }: WifiConnectModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const wifiSsid = "Tortuga";
  const wifiPassword = "PERLANERA";
  const wifiUri = `WIFI:S:${wifiSsid};T:WPA;P:${wifiPassword};;`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    wifiUri
  )}`;

  const handleCopyPassword = () => {
    void navigator.clipboard.writeText(wifiPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#241c14] via-[#1a1612] to-[#120f0c] border border-[#c59a47] p-6 shadow-2xl text-white space-y-5 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-[#c59a47]/20 border border-[#c59a47]/40 flex items-center justify-center mx-auto text-[#f4e0ad]">
            <Wifi size={24} />
          </div>
          <h3 className="text-lg font-extrabold text-[#f4e0ad] pt-2">Connessione Wi-Fi Tortuga</h3>
          <p className="text-xs text-white/60">
            Connettiti per partecipare ai giochi serali dal vivo!
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-[#120f0c] p-4 rounded-2xl border border-[#c59a47]/30 flex flex-col items-center space-y-3">
          <div className="bg-white p-2 rounded-xl shadow-lg border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="QR Code Wi-Fi Tortuga"
              className="w-44 h-44 object-contain"
            />
          </div>
          <p className="text-[11px] text-center text-[#f4e0ad] font-semibold flex items-center gap-1.5">
            <QrCode size={14} /> Inquadra con la fotocamera per connetterti al Wi-Fi
          </p>
        </div>

        {/* Wi-Fi Details */}
        <div className="bg-[#120f0c] p-3.5 rounded-xl border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-white/60 flex items-center gap-1.5 font-medium">
              <Wifi size={14} className="text-[#c59a47]" /> Rete Wi-Fi:
            </span>
            <span className="font-extrabold text-white font-mono bg-[#c59a47]/20 px-2.5 py-1 rounded-lg border border-[#c59a47]/40">
              {wifiSsid}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/60 flex items-center gap-1.5 font-medium">
              <KeyRound size={14} className="text-[#c59a47]" /> Password:
            </span>
            <button
              type="button"
              onClick={handleCopyPassword}
              title="Clicca per copiare la password"
              className="font-extrabold text-[#f4e0ad] font-mono bg-[#c59a47]/20 hover:bg-[#c59a47]/35 px-2.5 py-1 rounded-lg border border-[#c59a47]/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              {copied ? (
                <Check size={13} className="text-green-400 shrink-0 animate-in zoom-in-50 duration-200" />
              ) : (
                <Copy size={13} className="text-[#c59a47] shrink-0" />
              )}
              <span>{wifiPassword}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
