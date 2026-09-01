"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Sparkles, Tv, X } from "lucide-react";
import { ALLOWED_TABLE_RANGES_DESCRIPTION, validateGreetingInput } from "@/lib/live-tv/table-validation";

const GREETING_COOLDOWN_MS = 5 * 60 * 1000; // 5 minuti
const STORAGE_KEY_LAST_GREETING = "tortuga_last_greeting_sent_ts";

interface LiveGreetingModalProps {
  open: boolean;
  onClose: () => void;
  defaultNickname?: string;
}

export function LiveGreetingModal({ open, onClose, defaultNickname = "" }: LiveGreetingModalProps) {
  const [nickname, setNickname] = useState(defaultNickname);
  const [tableNumber, setTableNumber] = useState("");
  const [messageType, setMessageType] = useState<"brindisi" | "saluto" | "compleanno">("brindisi");
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState(0);

  // Controllo cooldown da localStorage ogni secondo mentre il modal è aperto
  useEffect(() => {
    if (!open) return;

    const checkCooldown = () => {
      try {
        const lastSent = Number(window.localStorage.getItem(STORAGE_KEY_LAST_GREETING)) || 0;
        const elapsed = Date.now() - lastSent;
        if (elapsed < GREETING_COOLDOWN_MS) {
          setCooldownRemainingSec(Math.ceil((GREETING_COOLDOWN_MS - elapsed) / 1000));
        } else {
          setCooldownRemainingSec(0);
        }
      } catch {
        setCooldownRemainingSec(0);
      }
    };

    checkCooldown();
    const interval = window.setInterval(checkCooldown, 1000);
    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const isCooldownActive = cooldownRemainingSec > 0;
  const cooldownMin = Math.floor(cooldownRemainingSec / 60);
  const cooldownSec = cooldownRemainingSec % 60;
  const cooldownFormatted = `${cooldownMin}:${cooldownSec.toString().padStart(2, "0")}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isCooldownActive) {
      setError(`Attendi ancora ${cooldownFormatted} prima di inviare un nuovo saluto.`);
      return;
    }

    const validation = validateGreetingInput(
      nickname,
      tableNumber,
      messageType === "compleanno" ? customMessage : undefined,
    );
    if (!validation.valid) {
      setError(validation.error || "Compila tutti i campi correttamente.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/live-tv/greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: validation.cleanNickname,
          tableNumber: validation.cleanTableNumber,
          messageType,
          customMessage: validation.cleanCustomMessage,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Impossibile inviare il saluto in questo momento.");
      }

      // Salva il timestamp nel localStorage del dispositivo
      try {
        window.localStorage.setItem(STORAGE_KEY_LAST_GREETING, Date.now().toString());
        setCooldownRemainingSec(300);
      } catch {
        // Ignora eventuali restrizioni di localStorage in modalità incognito
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCustomMessage("");
        onClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'invio del saluto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#151714] border border-[#c59a47]/40 rounded-3xl p-6 shadow-2xl text-[#fffdf8] overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow header */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#c59a47] to-transparent opacity-80" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Chiudi"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="py-8 flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-[#d9b66d]">Saluto inviato al Maxi-Schermo!</h3>
            <p className="text-sm text-white/70 max-w-xs">
              Guarda i display del Tortuga: il tuo brindisi dal Tavolo <strong>{tableNumber}</strong> sta andando in onda per 12 secondi! 🍻🏴‍☠️
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c59a47]/15 border border-[#c59a47]/30 flex items-center justify-center text-[#d9b66d]">
                <Tv size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Saluta in diretta TV</h3>
                <p className="text-xs text-white/60">Fai apparire il tuo saluto sui display del locale</p>
              </div>
            </div>

            {isCooldownActive ? (
              <div className="p-3.5 rounded-2xl bg-[#c59a47]/10 border border-[#c59a47]/30 flex items-center gap-3 text-xs text-[#f4e0ad]">
                <Clock size={18} className="shrink-0 text-[#c59a47]" />
                <p>
                  Hai inviato un saluto di recente. Potrai inviarne un altro tra <strong>{cooldownFormatted}</strong>.
                </p>
              </div>
            ) : null}

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#d9b66d] mb-1">
                  Nome o Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Es. Capitan Jack o Marco"
                  maxLength={24}
                  disabled={isCooldownActive}
                  required
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c59a47] transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#d9b66d] mb-1">
                  Numero del Tavolo
                </label>
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Es. 24"
                  min={10}
                  max={60}
                  disabled={isCooldownActive}
                  required
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c59a47] transition-colors disabled:opacity-50"
                />
                <p className="text-[11px] text-white/50 mt-1">
                  {ALLOWED_TABLE_RANGES_DESCRIPTION}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#d9b66d] mb-1.5">
                  Tipo di Saluto
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isCooldownActive}
                    onClick={() => setMessageType("brindisi")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer disabled:opacity-50 ${
                      messageType === "brindisi"
                        ? "bg-[#c59a47]/20 border-[#c59a47] text-[#f4e0ad]"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    🍻 Brindisi
                  </button>
                  <button
                    type="button"
                    disabled={isCooldownActive}
                    onClick={() => setMessageType("saluto")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer disabled:opacity-50 ${
                      messageType === "saluto"
                        ? "bg-[#c59a47]/20 border-[#c59a47] text-[#f4e0ad]"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    🎉 Saluto
                  </button>
                  <button
                    type="button"
                    disabled={isCooldownActive}
                    onClick={() => setMessageType("compleanno")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer disabled:opacity-50 ${
                      messageType === "compleanno"
                        ? "bg-[#c59a47]/20 border-[#c59a47] text-[#f4e0ad]"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    🎂 Auguri
                  </button>
                </div>
              </div>

              {messageType === "compleanno" ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#d9b66d]">
                      Messaggio di Auguri (opzionale)
                    </label>
                    <span className="text-[10px] text-white/40">{customMessage.length}/50</span>
                  </div>
                  <input
                    type="text"
                    value={customMessage}
                    disabled={isCooldownActive}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Es. Tanti auguri Capitano da tutta la ciurma!"
                    maxLength={50}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c59a47] transition-colors disabled:opacity-50"
                  />
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || isCooldownActive}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#a52b2b] to-[#8b2323] hover:from-[#b83232] hover:to-[#9e2727] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles size={16} />
              {loading
                ? "Invio in corso..."
                : isCooldownActive
                  ? `Disponibile tra ${cooldownFormatted}`
                  : "Invia Saluto al Maxi-Schermo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
