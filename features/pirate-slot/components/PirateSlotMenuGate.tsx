"use client";

import { Beer, BookOpen, Gift, X } from "lucide-react";
import { useState } from "react";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { formatCouponExpiry } from "@/lib/customer-profile";
import { rememberPirateSlotPlayedToday } from "@/lib/pirate-slot/client-state";
import { PirateSlotModal } from "@/features/pirate-slot/components/PirateSlotModal";

import styles from "./menu-gate.module.css";

type StartResponse = {
  playId?: string;
  playDate: string;
  email: string;
  alreadyPlayed?: boolean;
  error?: string;
  identity?: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    marketingConsent?: boolean;
  } | null;
  profile?: unknown;
};

type Prize = { code: string; qrValue: string; expiresAt?: string | null };

export function PirateSlotMenuGate({
  open,
  onClose,
  onOpenMenu,
}: {
  open: boolean;
  onClose: () => void;
  onOpenMenu: () => void;
}) {
  const { identity, updateIdentity } = useCustomerIdentity();
  const [stage, setStage] = useState<"choice" | "details">("choice");
  const [name, setName] = useState(identity.firstName);
  const [email, setEmail] = useState(identity.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slotOpen, setSlotOpen] = useState(false);
  const [playId, setPlayId] = useState("");
  const [prize, setPrize] = useState<Prize | null>(null);
  const [claimingPrize, setClaimingPrize] = useState(false);
  const [prizeError, setPrizeError] = useState("");

  const resetGate = () => {
    setStage("choice");
    setError("");
  };

  const closeGate = () => {
    resetGate();
    onClose();
  };

  const showDetails = () => {
    setName(identity.firstName);
    setEmail(identity.email);
    setError("");
    setStage("details");
  };

  const openMenu = () => {
    closeGate();
    onOpenMenu();
  };

  const isLoggedIn = Boolean(identity.email.trim() && identity.firstName.trim());

  const startSlotWithData = async (inputName: string, inputEmail: string) => {
    const normalizedName = inputName.trim();
    if (!normalizedName) {
      setError("Inserisci il tuo nome.");
      setStage("details");
      return;
    }
    const normalizedEmail = inputEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Inserisci un indirizzo email valido.");
      setStage("details");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pirate-slot/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, email: normalizedEmail }),
      });
      const data = (await response.json().catch(() => null)) as StartResponse | null;
      if (!data) throw new Error("Risposta Slot non valida.");

      if (data.identity) updateIdentity(data.identity);
      if (data.email && data.playDate) {
        rememberPirateSlotPlayedToday(data.email, data.playDate);
      }
      if (data.profile) {
        window.dispatchEvent(new CustomEvent("tortuga:profile-updated", { detail: { profile: data.profile } }));
      }
      if (!response.ok) {
        if (data.alreadyPlayed) {
          openMenu();
          return;
        }
        throw new Error(data.error || "Slot Pirata non disponibile.");
      }
      if (!data.playId) throw new Error("Partita Slot non disponibile.");

      setPlayId(data.playId);
      setPrize(null);
      setPrizeError("");
      closeGate();
      setSlotOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Non siamo riusciti a registrarti.");
      if (!isLoggedIn) setStage("details");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotChoice = () => {
    if (isLoggedIn) {
      void startSlotWithData(identity.firstName, identity.email);
    } else {
      showDetails();
    }
  };

  const submitDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    await startSlotWithData(name, email);
  };

  const resolveSpin = async () => {
    const response = await fetch("/api/pirate-slot/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playId }),
    });
    const data = (await response.json().catch(() => null)) as { won?: boolean; error?: string } | null;
    if (!response.ok || typeof data?.won !== "boolean") {
      throw new Error(data?.error || "Il giro non è partito. Riprova.");
    }
    return data.won;
  };

  const claimPrize = async () => {
    setClaimingPrize(true);
    setPrizeError("");
    try {
      const response = await fetch("/api/pirate-slot/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playId }),
      });
      const data = (await response.json().catch(() => null)) as { coupon?: Prize; error?: string } | null;
      if (!response.ok || !data?.coupon) throw new Error(data?.error || "Coupon non disponibile.");
      setPrize(data.coupon);
    } catch (claimError) {
      setPrizeError(claimError instanceof Error ? claimError.message : "Coupon non disponibile.");
    } finally {
      setClaimingPrize(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="profile-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="slot-menu-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeGate(); }}>
          <section className="profile-edit-modal">
            <header>
              <div>
                <p className="minimal-eyebrow">Sei al Tortuga</p>
                <h2 id="slot-menu-title">{stage === "choice" ? "Prima il menu o tenti la sorte?" : "Preparati a giocare"}</h2>
              </div>
              <button type="button" onClick={closeGate} aria-label="Chiudi popup"><X size={18} /></button>
            </header>

            {stage === "choice" ? (
              <div className={styles.choiceBody}>
                <p>Vuoi guardare subito il menu o prima provi a vincere una bevuta omaggio?</p>
                <button type="button" className={styles.slotChoice} onClick={handleSlotChoice} disabled={loading}>
                  <span><Beer /></span><span><strong>{loading ? "Preparazione in corso..." : "Slot Pirata"}</strong><small>Hai 5 tentativi per allineare cinque birre.</small></span>
                </button>
                <button type="button" className="minimal-primary w-full" onClick={openMenu}>
                  <BookOpen size={17} /> Vedi menu
                </button>
              </div>
            ) : (
              <form className="profile-edit-form" onSubmit={submitDetails}>
                <p className={styles.formIntro}>Ti manderemo il coupon in caso di vincita.</p>
                <label className="profile-edit-field">
                  <span>Nome</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" maxLength={120} required />
                </label>
                <label className="profile-edit-field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nome@email.it" required />
                </label>
                {error ? <div className="profile-edit-alert error" role="alert">{error}</div> : null}
                <button type="submit" className="minimal-primary w-full" disabled={loading}>
                  <Beer size={17} /> {loading ? "Preparazione in corso..." : "Entra nella Slot Pirata"}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}

      <PirateSlotModal
        open={slotOpen}
        onClose={() => setSlotOpen(false)}
        resolveSpin={resolveSpin}
        allowReset={false}
        onWin={() => void claimPrize()}
        winContent={(
          <div className={styles.prizePanel}>
            {claimingPrize ? <><Gift /><strong>Prepariamo il tuo coupon...</strong><small>I dobloni continuano a cadere mentre carichiamo il QR.</small></> : null}
            {prize ? <><p>Bevuta omaggio conquistata</p><FidelityQrCode value={prize.qrValue} label="QR coupon bevuta omaggio" variant="coupon" /><div><span>Codice coupon</span><strong>{prize.code}</strong></div>{prize.expiresAt ? <small>Valido fino al {formatCouponExpiry(prize.expiresAt)}</small> : null}</> : null}
            {prizeError ? <><p role="alert">{prizeError}</p><button type="button" onClick={() => void claimPrize()}>Riprova a caricare il QR</button></> : null}
          </div>
        )}
      />
    </>
  );
}
