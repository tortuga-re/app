"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface LegendNicknameModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  onSuccess: () => void;
}

export function LegendNicknameModal({ open, onClose, email, onSuccess }: LegendNicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setError("Il nickname deve contenere da 2 a 24 caratteri.");
      return;
    }

    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
      setError("Il nickname può contenere solo lettere, numeri, spazi e trattini (-).");
      return;
    }

    setLoading(true);
    setError("");

    if (email === "demo@tortugabay.it") {
      setTimeout(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("demo_legend_nickname", trimmed);
          sessionStorage.setItem("demo_legend_real_name", "Demo Legend");
        }
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      }, 500);
      return;
    }

    try {
      const response = await fetch("/api/profile/legends/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, nickname: trimmed }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || "Impossibile registrare il nickname.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="legend-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="profile-edit-modal">
        <header>
          <div>
            <p className="minimal-eyebrow">Hall of Legends</p>
            <h2 id="legend-modal-title">Il tuo nome nella storia</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi popup"><X /></button>
        </header>

        {error ? <div className="profile-edit-alert error">{error}</div> : null}
        {success ? <div className="profile-edit-alert success"><CheckCircle2 /> Registrazione avvenuta con successo!</div> : null}

        {!success && (
          <div className="profile-edit-form space-y-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Inserisci il nickname con cui sarai visibile nella Hall of Legends del Tortuga.
            </p>
            <label className="profile-edit-field">
              <span>Nickname Leggenda</span>
              <input 
                type="text" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="Es. Barbarossa"
                disabled={loading}
              />
            </label>
            <button 
              type="button" 
              className="minimal-primary w-full mt-2" 
              disabled={loading || nickname.trim().length < 2} 
              onClick={() => void handleSave()}
            >
              {loading ? "Registrazione…" : "Registra Nickname"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
