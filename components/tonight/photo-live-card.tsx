"use client";

import { useRef, useState } from "react";
import { Camera, Send } from "lucide-react";

export function PhotoLiveCard({ onPhotoUploaded }: { onPhotoUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitPhoto = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setMessage("Scegli una foto da inviare.");
      return;
    }

    setLoading(true);
    setMessage("");

    const body = new FormData();
    body.set("media", file);

    try {
      const response = await fetch("/api/live-tv/customer-upload", {
        method: "POST",
        body,
      });

      const result = await response.json().catch(() => null);
      setLoading(false);

      if (!response.ok) {
        setMessage(result?.error ?? "Non siamo riusciti a inviare la foto.");
        return;
      }

      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Foto inviata in diretta per 10 secondi ed inserita nel carosello!");
      if (onPhotoUploaded) onPhotoUploaded();
    } catch {
      setLoading(false);
      setMessage("Errore di connessione durante l'invio.");
    }
  };

  return (
    <section className="loyalty-summary space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[rgba(165,43,43,.2)] flex items-center justify-center text-[var(--accent-strong)] shrink-0">
          <Camera size={19} />
        </div>
        <div>
          <p className="minimal-eyebrow">Sfida Bottiglia Omaggio 🍾</p>
          <h2 className="tonight-section-title">Invia la tua foto dal tavolo</h2>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        Nessun dato o login richiesto! Scegli una foto dal tuo telefono per trasmetterla subito sul maxi-schermo in sala per 10 secondi ed entrare nel carosello in fondo alla pagina per ricevere i like della serata.
      </p>

      <form onSubmit={submitPhoto} className="space-y-3">
        <label className="block w-full text-[.73rem] font-bold text-[var(--text)]">
          Seleziona Foto
          <input
            ref={inputRef}
            required
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1.5 block min-h-[3rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-3 py-2.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !file}
          className="minimal-primary w-full py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            "Invio in corso..."
          ) : (
            <>
              <Send size={16} /> Invia Foto Live ora
            </>
          )}
        </button>

        {message ? (
          <p
            className={`text-xs font-semibold text-center p-2 rounded-xl ${
              message.includes("inviata")
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
