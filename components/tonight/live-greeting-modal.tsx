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
        // Ignora restrizioni localStorage
      }

      if (data?.greeting) {
        try {
          const bc = new BroadcastChannel("tortuga_live_greetings");
          bc.postMessage(data.greeting);
          bc.close();
        } catch {}
        try {
          localStorage.setItem("tortuga_last_demo_greeting", JSON.stringify(data.greeting));
        } catch {}
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
    <div
      className="profile-edit-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-greeting-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="profile-edit-modal">
        <header>
          <div>
            <p className="minimal-eyebrow">Diretta Maxi-Schermo</p>
            <h2 id="live-greeting-title">Saluta in diretta TV</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi popup">
            <X size={18} />
          </button>
        </header>

        {isCooldownActive ? (
          <div className="profile-edit-alert info mt-3 flex items-center gap-2 bg-[#fdf5e6] text-[#7a581e] border border-[#ecd5a5] rounded-xl p-3 text-xs">
            <Clock size={16} className="shrink-0 text-[#b58a4d]" />
            <span>
              Hai inviato un saluto di recente. Potrai inviarne un altro tra <strong>{cooldownFormatted}</strong>.
            </span>
          </div>
        ) : null}

        {error ? <div className="profile-edit-alert error mt-3">{error}</div> : null}

        {success ? (
          <div className="py-6 flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-serif font-bold text-[var(--text)]">Saluto inviato al Maxi-Schermo!</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
              Guarda i display del Tortuga: il tuo messaggio dal Tavolo <strong>{tableNumber}</strong> sta andando in onda per 12 secondi! 🍻🏴‍☠️
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-edit-form space-y-4 mt-3">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Fai apparire il tuo saluto o brindisi dal tavolo in tempo reale sui display del locale.
            </p>

            <label className="profile-edit-field">
              <span>Nome o Nickname</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Es. Capitan Jack o Marco"
                maxLength={24}
                disabled={isCooldownActive || loading}
                required
              />
            </label>

            <label className="profile-edit-field">
              <span>Numero del Tavolo</span>
              <input
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Es. 24"
                min={10}
                max={60}
                disabled={isCooldownActive || loading}
                required
              />
              <small className="text-[11px] text-[var(--text-muted)] mt-1 block">
                {ALLOWED_TABLE_RANGES_DESCRIPTION}
              </small>
            </label>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block ml-2">
                Tipo di Saluto
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isCooldownActive || loading}
                  onClick={() => setMessageType("brindisi")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    messageType === "brindisi"
                      ? "bg-[var(--accent-soft)] border-[var(--accent-strong)] text-[var(--accent-strong)] shadow-sm"
                      : "bg-[#f5efe6] border-[var(--border)] text-[var(--text)] hover:bg-[#ebe2d5]"
                  }`}
                >
                  🍻 Brindisi
                </button>
                <button
                  type="button"
                  disabled={isCooldownActive || loading}
                  onClick={() => setMessageType("saluto")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    messageType === "saluto"
                      ? "bg-[var(--accent-soft)] border-[var(--accent-strong)] text-[var(--accent-strong)] shadow-sm"
                      : "bg-[#f5efe6] border-[var(--border)] text-[var(--text)] hover:bg-[#ebe2d5]"
                  }`}
                >
                  🎉 Saluto
                </button>
                <button
                  type="button"
                  disabled={isCooldownActive || loading}
                  onClick={() => setMessageType("compleanno")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    messageType === "compleanno"
                      ? "bg-[var(--accent-soft)] border-[var(--accent-strong)] text-[var(--accent-strong)] shadow-sm"
                      : "bg-[#f5efe6] border-[var(--border)] text-[var(--text)] hover:bg-[#ebe2d5]"
                  }`}
                >
                  🎂 Auguri
                </button>
              </div>
            </div>

            {messageType === "compleanno" ? (
              <label className="profile-edit-field animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between">
                  <span>Messaggio di Auguri (opzionale)</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-normal">{customMessage.length}/50</span>
                </div>
                <input
                  type="text"
                  value={customMessage}
                  disabled={isCooldownActive || loading}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Es. Tanti auguri Capitano da tutta la ciurma!"
                  maxLength={50}
                />
              </label>
            ) : null}

            {/* Anteprima del testo in TV */}
            <div className="rounded-2xl border border-[#d8c39d] bg-[#faf5ec] p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--accent-strong)]">
                <span className="flex items-center gap-1.5">
                  <Tv size={13} /> Anteprima sul Maxi-Schermo TV
                </span>
                <span className="text-[var(--text-muted)] font-semibold">12s in onda</span>
              </div>

              <div className="bg-[#fffdf8] border border-[var(--border)] rounded-xl p-3 text-center space-y-1 shadow-inner">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c59a47]">
                  {messageType === "brindisi"
                    ? "🍻 BRINDISI AL TORTUGA!"
                    : messageType === "saluto"
                      ? "🎉 SALUTO DALLA CIURMA!"
                      : "🎂 FESTA DI COMPLEANNO A BORDO!"}
                </p>
                <p className="font-serif text-[0.95rem] font-bold text-[var(--text)] leading-tight">
                  {nickname.trim() || "Il tuo Nickname"}{" "}
                  <span className="text-[var(--accent-strong)]">
                    dal Tavolo {tableNumber || "24"}
                  </span>
                </p>
                {messageType === "compleanno" && customMessage.trim() ? (
                  <p className="text-xs italic text-[var(--text)] bg-[#f5efe6] rounded-lg py-1 px-2.5 font-semibold inline-block max-w-full">
                    &ldquo;{customMessage.trim()}&rdquo;
                  </p>
                ) : null}
                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                  {messageType === "brindisi"
                    ? "Offre idealmente un boccale a tutta la ciurma!"
                    : messageType === "saluto"
                      ? "Manda un caloroso saluto a tutta la sala!"
                      : "Tanti auguri anche dalla Ciurma del Tortuga!"}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isCooldownActive}
              className="minimal-primary w-full mt-3 flex items-center justify-center gap-2"
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
      </section>
    </div>
  );
}
