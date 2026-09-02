"use client";

import type { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Beer,
  Coins,
  Map as MapIcon,
  Ship,
  Skull,
  X,
} from "lucide-react";

import styles from "./pirate-slot.module.css";

type SlotSymbolId = "skull" | "beer" | "chest" | "map" | "ship" | "coin";

type SlotSymbol = {
  id: SlotSymbolId;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

function TreasureChestIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 10V8.4C4 5.5 7.6 4 12 4s8 1.5 8 4.4V10" />
      <path d="M3 10h18v9.5a.5.5 0 0 1-.5.5h-17a.5.5 0 0 1-.5-.5Z" />
      <path d="M3 14h18M7.5 5.4V10M16.5 5.4V10M7.5 14v6M16.5 14v6" />
      <path d="M10 12.5h4v4h-4z" />
      <path d="M11 12.5v-1a1 1 0 0 1 2 0v1M5 20v1M19 20v1" />
    </svg>
  );
}

const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: "skull", label: "Teschio e ossa", Icon: Skull },
  { id: "beer", label: "Birra", Icon: Beer },
  { id: "chest", label: "Forziere", Icon: TreasureChestIcon },
  { id: "map", label: "Mappa del tesoro", Icon: MapIcon },
  { id: "ship", label: "Galeone", Icon: Ship },
  { id: "coin", label: "Doblone", Icon: Coins },
];

const DEFAULT_REELS: SlotSymbolId[] = ["skull", "beer", "chest", "map", "ship"];
const WINNING_REELS: SlotSymbolId[] = ["beer", "beer", "beer", "beer", "beer"];
const REEL_TICK_MS = 92;
const FIRST_REEL_STOP_MS = 1_100;
const REEL_STOP_GAP_MS = 260;

const CELEBRATION_COINS = Array.from({ length: 54 }, (_, index) => ({
  left: (index * 37 + 7) % 101,
  delay: ((index * 11) % 28) / 10,
  duration: 1.65 + ((index * 7) % 12) / 10,
  drift: ((index * 29) % 180) - 90,
  size: 20 + ((index * 13) % 20),
  spin: 540 + ((index * 17) % 720),
}));

const symbolById = new Map(SLOT_SYMBOLS.map((symbol) => [symbol.id, symbol]));

const randomSymbol = (): SlotSymbolId => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].id;
const nextRandomSymbol = (current: SlotSymbolId): SlotSymbolId => {
  let next = randomSymbol();
  while (next === current) next = randomSymbol();
  return next;
};

const losingReels = (): SlotSymbolId[] => {
  const reels: SlotSymbolId[] = Array.from({ length: 5 }, randomSymbol);
  if (reels.every((symbol) => symbol === "beer")) {
    return [...reels.slice(0, 4), "coin" as SlotSymbolId];
  }
  return reels;
};

export type PirateSlotProps = {
  maxAttempts?: number;
  winProbability?: number;
  resolveSpin?: () => Promise<boolean>;
  allowReset?: boolean;
  winContent?: ReactNode;
  onWin?: () => void;
  onAttemptsExhausted?: () => void;
};

export function PirateSlot({
  maxAttempts = 5,
  winProbability = 0.05,
  resolveSpin,
  allowReset = true,
  winContent,
  onWin,
  onAttemptsExhausted,
}: PirateSlotProps) {
  const [reels, setReels] = useState<SlotSymbolId[]>(DEFAULT_REELS);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<"idle" | "won" | "lost">("idle");
  const [spinError, setSpinError] = useState("");
  const spinInterval = useRef<number | null>(null);
  const spinTimers = useRef<number[]>([]);

  useEffect(() => () => {
    if (spinInterval.current !== null) {
      window.clearInterval(spinInterval.current);
    }
    spinTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const spin = async () => {
    if (spinning || attemptsLeft <= 0 || result === "won") return;

    setSpinning(true);
    setSpinError("");
    let won: boolean;
    try {
      won = resolveSpin ? await resolveSpin() : Math.random() < winProbability;
    } catch (error) {
      setSpinning(false);
      setSpinError(error instanceof Error ? error.message : "Il mare è agitato. Riprova.");
      return;
    }
    const finalReels = won ? WINNING_REELS : losingReels();
    const stoppedReels = Array.from({ length: 5 }, () => false);
    setResult("idle");

    setReels(Array.from({ length: 5 }, randomSymbol));
    spinInterval.current = window.setInterval(() => {
      setReels((current) => current.map((symbol, index) => (
        stoppedReels[index] ? symbol : nextRandomSymbol(symbol)
      )));
    }, REEL_TICK_MS);

    spinTimers.current = finalReels.map((finalSymbol, index) => window.setTimeout(() => {
      stoppedReels[index] = true;
      setReels((current) => current.map((symbol, reelIndex) => (
        reelIndex === index ? finalSymbol : symbol
      )));
    }, FIRST_REEL_STOP_MS + index * REEL_STOP_GAP_MS));

    const finishTimer = window.setTimeout(() => {
      if (spinInterval.current !== null) {
        window.clearInterval(spinInterval.current);
        spinInterval.current = null;
      }
      const nextAttempts = attemptsLeft - 1;
      setReels(finalReels);
      setAttemptsLeft(nextAttempts);
      setSpinning(false);
      setResult(won ? "won" : "lost");
      spinTimers.current = [];
      if (won) onWin?.();
      if (!won && nextAttempts === 0) onAttemptsExhausted?.();
    }, FIRST_REEL_STOP_MS + finalReels.length * REEL_STOP_GAP_MS);
    spinTimers.current.push(finishTimer);
  };

  const resetDemo = () => {
    if (spinInterval.current !== null) {
      window.clearInterval(spinInterval.current);
      spinInterval.current = null;
    }
    spinTimers.current.forEach((timer) => window.clearTimeout(timer));
    spinTimers.current = [];
    setReels(DEFAULT_REELS);
    setAttemptsLeft(maxAttempts);
    setSpinning(false);
    setResult("idle");
    setSpinError("");
  };

  return (
    <section className={styles.machine} aria-label="Slot Pirata">
      <div className={styles.corner} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.emblem} aria-hidden="true">
          <Beer />
        </div>
        <p>Il gioco del Capitano</p>
        <h2>Slot Pirata</h2>
        <span>3 tentativi, una cena OMAGGIO in palio.</span>
      </header>

      <div className={styles.reelFrame} data-result={result}>
        <div className={styles.payline} aria-hidden="true" />
        <div className={styles.reels} aria-label="Cinque rulli della slot">
          {reels.map((symbolId, index) => {
            const symbol = symbolById.get(symbolId) ?? SLOT_SYMBOLS[0];
            const Icon = symbol.Icon;

            return (
              <div
                className={`${styles.reel} ${spinning ? styles.spinning : ""}`}
                key={index}
                aria-label={`Rullo ${index + 1}: ${spinning ? "in movimento" : symbol.label}`}
              >
                <span
                  className={`${styles.symbol} ${spinning ? styles.rollingSymbol : ""}`}
                  data-symbol={symbol.id}
                  key={`${index}-${symbol.id}-${spinning ? "rolling" : "stopped"}`}
                >
                  <Icon />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {result !== "won" ? (
        <>
          <div className={styles.attempts} aria-label={`${attemptsLeft} tentativi rimasti`}>
            <span>Tentativi</span>
            <div>
              {Array.from({ length: maxAttempts }, (_, index) => (
                <i className={index < attemptsLeft ? styles.available : ""} key={index} />
              ))}
            </div>
            <strong>{attemptsLeft}</strong>
          </div>

          <button
            type="button"
            className={styles.spinButton}
            onClick={spin}
            disabled={spinning || attemptsLeft <= 0}
          >
            <span>{attemptsLeft <= 0 ? "NON HAI VINTO" : "GIRA"}</span>
          </button>

          {spinError ? <p className={styles.spinError} role="alert">{spinError}</p> : null}

          {allowReset && attemptsLeft === 0 ? (
            <button type="button" className={styles.resetButton} onClick={resetDemo}>
              Riavvia anteprima grafica
            </button>
          ) : null}

        </>
      ) : winContent ? <div className={styles.winContent}>{winContent}</div> : null}
    </section>
  );
}

export type PirateSlotModalProps = PirateSlotProps & {
  open: boolean;
  onClose: () => void;
};

function CoinRain() {
  return (
    <div className={styles.coinRain} aria-hidden="true">
      {CELEBRATION_COINS.map((coin, index) => {
        const style = {
          "--coin-left": `${coin.left}%`,
          "--coin-delay": `${coin.delay}s`,
          "--coin-duration": `${coin.duration}s`,
          "--coin-drift": `${coin.drift}px`,
          "--coin-size": `${coin.size}px`,
          "--coin-spin": `${coin.spin}deg`,
        } as CSSProperties;
        return <i className={styles.fallingCoin} style={style} key={index}><span>D</span></i>;
      })}
    </div>
  );
}

export function PirateSlotModal({ open, onClose, onWin, ...slotProps }: PirateSlotModalProps) {
  const [celebrating, setCelebrating] = useState(false);

  const stopCelebration = useCallback(() => {
    setCelebrating(false);
  }, []);

  const closeModal = useCallback(() => {
    stopCelebration();
    onClose();
  }, [onClose, stopCelebration]);

  const handleWin = () => {
    setCelebrating(true);
    onWin?.();
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeModal, open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="pirate-slot-title">
      <button type="button" className={styles.backdrop} onClick={closeModal} aria-label="Chiudi Slot Pirata" />
      {celebrating ? <CoinRain /> : null}
      <div className={`${styles.modalBody} ${celebrating ? styles.celebrating : ""}`}>
        <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="Chiudi">
          <X />
        </button>
        <span id="pirate-slot-title" className={styles.srOnly}>Slot Pirata</span>
        <PirateSlot {...slotProps} onWin={handleWin} />
      </div>
    </div>
  );
}
