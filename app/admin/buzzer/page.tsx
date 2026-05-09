"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { requestJson } from "@/lib/client";
import { triggerHaptic } from "@/lib/haptics";
import { StatusBlock } from "@/components/status-block";
import { isAdmin } from "@/lib/live-buzzer/admin";
import { ChevronLeft } from "lucide-react";
import type { BuzzerState, BuzzerEntry, BuzzerResult } from "@/lib/live-buzzer/types";

type ConfirmAction = "reset-game" | "end-round" | "kick-team" | null;

const getPointsForTime = (timeMs: number): number => {
  const seconds = timeMs / 1000;
  if (seconds <= 3.0) return 20;
  if (seconds <= 5.0) return 17;
  if (seconds <= 8.0) return 14;
  if (seconds <= 12.0) return 11;
  if (seconds <= 20.0) return 8;
  return 5;
};

export default function AdminBuzzerPage() {
  const { identity, hasIdentity } = useCustomerIdentity();
  const canAccess = hasIdentity && isAdmin(identity.email);
  
  const [pin, setPin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("match-drink.adminPin") || "";
    }
    return "";
  });
  const [isPinAuthorized, setIsPinAuthorized] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  const [gameState, setGameState] = useState<BuzzerState | null>(null);
  const [entries, setEntries] = useState<BuzzerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistInput, setPlaylistInput] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [teamToKick, setTeamToKick] = useState<string | null>(null);
  
  const [savedPlaylists, setSavedPlaylists] = useState<{name: string, playlist_id: string, id: string}[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    fetch("/api/live-buzzer/admin/playlists")
      .then(res => res.json())
      .then(data => {
        if (data.playlists) {
          setSavedPlaylists(data.playlists);
        }
      })
      .catch(console.error);
  }, []);

  const savePlaylist = async () => {
    if (!playlistInput || !newPlaylistName) return;
    let pid = playlistInput;
    if (pid.includes("list=")) {
      pid = pid.split("list=")[1].split("&")[0];
    }
    
    try {
      const res = await fetch("/api/live-buzzer/admin/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", name: newPlaylistName, playlistId: pid })
      });
      const data = await res.json();
      if (data.success && data.playlist) {
        setSavedPlaylists([...savedPlaylists, data.playlist]);
        setNewPlaylistName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      const res = await fetch("/api/live-buzzer/admin/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id })
      });
      const data = await res.json();
      if (data.success) {
        setSavedPlaylists(savedPlaylists.filter(pl => pl.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const validatePin = useCallback(async (p: string) => {
    if (!p) return;
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch("/api/admin/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });
      if (res.ok) {
        setIsPinAuthorized(true);
        localStorage.setItem("match-drink.adminPin", p);
      } else {
        setPinError("PIN non valido");
        setIsPinAuthorized(false);
      }
    } catch {
      setPinError("Errore di validazione");
    } finally {
      setPinLoading(false);
    }
  }, []);

  const syncSession = useCallback(async () => {
    if (identity.email) {
      await fetch("/api/session/customer", {
        method: "POST",
        body: JSON.stringify({ email: identity.email }),
        headers: { "Content-Type": "application/json" },
      });
    }
  }, [identity.email]);

  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (pin && !isPinAuthorized && !initialCheckDone.current) {
      initialCheckDone.current = true;
      validatePin(pin);
    }
  }, [pin, isPinAuthorized, validatePin]);

  useEffect(() => {
    if (!canAccess || !isPinAuthorized) return;

    let cancelled = false;
    let eventSource: EventSource | null = null;

    void syncSession().then(() => {
      if (cancelled) return;
      void fetch("/api/live-buzzer/admin/activate", { method: "POST" });
      
      eventSource = new EventSource("/api/live-buzzer/stream");
      eventSource.onmessage = (event) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = JSON.parse(event.data) as any;
          setGameState(data);
          if (data.entries) {
            setEntries(data.entries);
          }
          setLoading(false);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      eventSource.onerror = () => {
        console.error("SSE connection error");
      };
    });

    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [canAccess, isPinAuthorized, syncSession]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    triggerHaptic();
    try {
      await requestJson(`/api/live-buzzer/admin/${action}`, { method: "POST" });
    } catch {
      setError("Errore azione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScore = async (email: string, points: number, result: BuzzerResult) => {
    setActionLoading(true);
    triggerHaptic();
    try {
      await requestJson("/api/live-buzzer/admin/score", {
        method: "POST",
        body: JSON.stringify({ email, points, result }),
      });
    } catch {
      setError("Errore punteggio");
    } finally {
      setActionLoading(false);
    }
  };

  const handleYoutubeAction = async (payload: Record<string, unknown>) => {
    try {
      await requestJson("/api/live-buzzer/admin/youtube", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      setError("Errore YouTube");
    }
  };

  const handleRevealAction = async (action: "start" | "next" | "full") => {
    setActionLoading(true);
    triggerHaptic();
    try {
      await requestJson("/api/live-buzzer/admin/reveal", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    } catch {
      setError("Errore Svelamento");
    } finally {
      setActionLoading(false);
    }
  };

  const initiateConfirm = (action: ConfirmAction, email?: string) => {
    setConfirmAction(action);
    setConfirmStep(1);
    if (email) setTeamToKick(email);
    triggerHaptic();
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;

    if (confirmStep === 1) {
      setConfirmStep(2);
      triggerHaptic();
    } else {
      if (confirmAction === "kick-team" && teamToKick) {
        setActionLoading(true);
        try {
          await requestJson("/api/live-buzzer/admin/kick-team", {
            method: "POST",
            body: JSON.stringify({ email: teamToKick }),
          });
        } catch {
          setError("Errore espulsione");
        } finally {
          setActionLoading(false);
          setTeamToKick(null);
        }
      } else {
        await handleAction(confirmAction);
      }
      setConfirmAction(null);
      setConfirmStep(0);
    }
  };

  if (!canAccess) {
    return (
      <StatusBlock
        variant="error"
        title="Accesso negato"
        description="Non hai i permessi per accedere alla plancia del Capitano."
        action={
          <Link href="/" className="button-secondary inline-flex min-h-12 items-center justify-center px-6">
            Torna alla base
          </Link>
        }
      />
    );
  }

  if (!isPinAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="panel w-full max-w-sm text-center space-y-6 rounded-[2rem] p-8 border-[var(--accent-strong)]">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase italic">Sblocca Plancia</h1>
            <p className="text-sm text-[var(--text-muted)]">Inserisci il PIN del Capitano per procedere.</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              className="field text-center text-3xl tracking-[0.5em] font-mono"
            />
            {pinError && <p className="text-[var(--danger)] text-xs font-bold uppercase">{pinError}</p>}
            <button 
              className="button-primary w-full min-h-12 text-sm uppercase font-black"
              onClick={() => validatePin(pin)}
              disabled={pinLoading || !pin}
            >
              {pinLoading ? "Verifica..." : "ACCEDI ALLA PLANCIA"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <StatusBlock variant="loading" title="Caricamento..." description="Sto preparando la plancia..." />;
  }

  const currentResponder = entries.find(e => e.id === gameState?.currentResponderEntryId);

  return (
    <div className="space-y-6">
      <Link 
        href="/ciurma" 
        className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline mb-4"
      >
        <ChevronLeft className="w-3 h-3" /> Torna alla Ciurma
      </Link>
      {/* Universal Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="panel rounded-[2.5rem] p-8 text-center space-y-6 max-w-sm border-[var(--danger)] shadow-[0_0_50px_rgba(240,139,117,0.3)]">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase italic">
                {confirmStep === 1 ? "Sei sicuro?" : "SICURO SICURO?"}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {confirmAction === "kick-team"
                  ? (confirmStep === 1
                      ? "Stai per espellere questa squadra. Tutti i suoi punti andranno persi."
                      : "La squadra verrà eliminata definitivamente dalla partita attuale. Confermi?")
                  : confirmAction === "reset-game" 
                  ? (confirmStep === 1 
                      ? "Questo azzererà TUTTO: squadre, punti e round. Non si torna indietro!" 
                      : "Stai per cancellare l'intera partita. Conferma per procedere.")
                  : (confirmStep === 1
                      ? "Stai per terminare la partita e mostrare la classifica finale a tutti."
                      : "Tutte le squadre vedranno il loro piazzamento. Confermi la fine della gara?")
                }
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setConfirmAction(null); setConfirmStep(0); }}
                className="button-secondary min-h-12 text-xs uppercase font-black"
              >
                Annulla
              </button>
              <button 
                onClick={handleConfirmedAction}
                className="button-primary bg-[var(--danger)] border-[var(--danger)] min-h-12 text-xs uppercase font-black text-white"
              >
                {confirmStep === 1 ? "Sì, procedi" : "SÌ, CONFERMA"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel rounded-[2rem] p-6 space-y-6 border-[var(--accent-strong)]">
        <div className="space-y-2">
          <p className="eyebrow">Tortuga Music Quiz</p>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter italic">Plancia — Round {gameState?.currentRound}</h2>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${gameState?.status === "open" ? "bg-green-600 text-white" : "bg-white/10 text-[var(--text-muted)]"}`}>
              {gameState?.status}
            </span>
            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${gameState?.leaderboardVisible ? "bg-blue-600 text-white" : "bg-orange-600 text-white"}`}>
              {gameState?.leaderboardVisible ? "Classifica Live" : "Classifica Nascosta"}
            </span>
            <a 
              href="/stage" 
              target="_blank" 
              className="ml-auto flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-wider text-white transition-all"
            >
              🖥️ Apri Smart Stage
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {gameState?.roundEnded ? (
            // Pannello Svelamento a fine partita
            <div className="col-span-2 grid grid-cols-2 gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="col-span-2 text-center mb-1">
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Svelamento Classifica</span>
              </div>
              
              {gameState?.leaderboardRevealStep === null ? (
                <>
                  <button 
                    className="button-primary min-h-12 text-[10px] uppercase font-black bg-blue-600 border-blue-500" 
                    onClick={() => handleRevealAction("start")}
                    disabled={actionLoading}
                  >
                    Svela a mano a mano
                  </button>
                  <button 
                    className="button-secondary min-h-12 text-[10px] uppercase font-black" 
                    onClick={() => handleRevealAction("full")}
                    disabled={actionLoading}
                  >
                    Mostra Tutta Subito
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="button-primary col-span-2 min-h-16 text-sm uppercase font-black bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-pulse" 
                    onClick={() => handleRevealAction("next")}
                    disabled={actionLoading}
                  >
                    {gameState.leaderboard.length - gameState.leaderboardRevealStep <= 2 
                      ? "🏆 SVELA I VINCITORI 🏆" 
                      : "Avanti (Svela Prossimo)"}
                  </button>
                  <button 
                    className="button-secondary col-span-2 min-h-10 text-[10px] uppercase font-black opacity-70" 
                    onClick={() => handleRevealAction("full")}
                    disabled={actionLoading}
                  >
                    Svela Tutta e Concludi
                  </button>
                </>
              )}
            </div>
          ) : (
            <button 
              className="button-secondary col-span-2 min-h-12 text-xs uppercase font-black" 
              onClick={() => handleAction(gameState?.leaderboardVisible ? "hide-leaderboard" : "show-leaderboard")}
              disabled={actionLoading}
            >
              {gameState?.leaderboardVisible ? "Nascondi Classifica" : "Mostra Classifica"}
            </button>
          )}

          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black border-blue-500/50 text-blue-400" 
            onClick={() => initiateConfirm("end-round")}
            disabled={actionLoading || gameState?.roundEnded}
          >
            Termina Partita
          </button>
          <button 
            className="button-secondary min-h-12 text-xs uppercase font-black border-[var(--danger-soft)] text-[var(--danger)]" 
            onClick={() => initiateConfirm("reset-game")}
            disabled={actionLoading}
          >
            RESET PARTITA
          </button>
          <button 
            className="button-primary col-span-2 min-h-12 text-xs uppercase font-black" 
            onClick={() => handleAction("next-round")}
            disabled={actionLoading}
          >
            Prossima Canzone (Round {(gameState?.currentRound ?? 0) + 1})
          </button>

          {/* Card a sé stante per il titolo */}
          <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-3 text-center mt-2">
            <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Ora in onda</span>
            <p className="text-sm font-bold text-white mt-1">
              {gameState?.youtubeVideoTitle 
                ? `▶ ${gameState.youtubeVideoTitle}` 
                : "Nessun brano in riproduzione"}
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-[var(--danger)] text-center">{error}</p>}
      </div>

      {currentResponder && gameState?.status === "closed" && (
        <div className="panel rounded-3xl p-6 border-2 border-green-500 bg-green-500/5 animate-pulse">
           <p className="eyebrow text-green-500">ORA RISPONDE</p>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mt-1">
             Tavolo {currentResponder.tableNumber} - {currentResponder.nickname}
           </h3>
           <div className="grid grid-cols-2 gap-4 mt-6">
              <button onClick={() => handleScore(currentResponder.email, getPointsForTime(currentResponder.relativeTimeMs), "correct")} className="bg-green-600/30 border border-green-600/50 text-green-300 text-lg font-black py-4 rounded-xl hover:bg-green-600/50 flex flex-col items-center justify-center">
                <span>CORRETTA</span>
                <span className="text-xs font-bold opacity-80">(+{getPointsForTime(currentResponder.relativeTimeMs)} pt)</span>
              </button>
              <button onClick={() => handleScore(currentResponder.email, -5, "wrong")} className="bg-red-600/30 border border-red-600/50 text-red-300 text-lg font-black py-4 rounded-xl hover:bg-red-600/50 flex flex-col items-center justify-center">
                <span>SBAGLIATA</span>
                <span className="text-xs font-bold opacity-80">(-5 pt)</span>
              </button>
              
              {!gameState.entries.some(e => e.scored) && (
                <button onClick={() => handleScore(currentResponder.email, getPointsForTime(currentResponder.relativeTimeMs) + 10, "correct")} className="col-span-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-lg font-black py-4 rounded-xl hover:bg-yellow-500/40 flex flex-col items-center justify-center transition-colors">
                  <span>CORRETTA + ARTISTA</span>
                  <span className="text-xs font-bold opacity-80">(+{getPointsForTime(currentResponder.relativeTimeMs) + 10} pt)</span>
                </button>
              )}
           </div>
        </div>
      )}

      {gameState?.status === "result_screen" && (
        <div className="panel rounded-3xl p-6 border-2 border-blue-500 bg-blue-500/5 text-center">
           <p className="eyebrow text-blue-400">FASE RISULTATO</p>
           <h3 className="text-xl font-bold text-white mt-2">Visualizzazione esito in corso...</h3>
           <p className="text-xs text-[var(--text-muted)] mt-1">Il gioco ripartirà automaticamente tra pochi secondi.</p>
        </div>
      )}

      {gameState?.status === "countdown" && (
        <div className="panel rounded-3xl p-6 border-2 border-[var(--accent-strong)] bg-[var(--accent-soft)]/5 text-center">
           <p className="eyebrow text-[var(--accent-strong)]">COUNTDOWN</p>
           <h3 className="text-3xl font-black text-white mt-2 animate-bounce">
             PREPARATI AL VIA!
           </h3>
        </div>
      )}

      {/* YouTube Control Panel */}
      <div className="panel rounded-[2rem] p-6 space-y-4 border border-red-600/30 bg-red-600/5">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider italic flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500">📺</span> YouTube Playlist
          </div>
          {gameState?.youtubePlaylistId && (
            <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-2 py-1 rounded-full animate-pulse uppercase tracking-widest">
              Connesso
            </span>
          )}
        </h3>
        
        {gameState?.youtubePlaylistId && (
          <div className="panel-muted p-3 rounded-xl border border-white/5 bg-white/2 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] font-black uppercase">Playlist Attiva</span>
              <span className="text-xs text-white font-mono truncate max-w-[150px]">{gameState.youtubePlaylistId}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--text-muted)] font-black uppercase">Stato</span>
              <p className="text-xs font-bold text-[var(--accent)] uppercase">{gameState.youtubeStatus}</p>
            </div>
          </div>
        )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Inserisci ID Playlist o URL..." 
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
              <button 
                onClick={() => {
                  let pid = playlistInput;
                  if (pid.includes("list=")) {
                    pid = pid.split("list=")[1].split("&")[0];
                  }
                  handleYoutubeAction({ action: "setPlaylist", playlistId: pid });
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase"
              >
                Carica
              </button>
            </div>
            {/* Sempre visibile per salvare le playlist */}
            <div className="flex gap-2 mt-1">
              <input 
                type="text" 
                placeholder="Nome per salvare la playlist..." 
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
              />
              <button 
                onClick={savePlaylist}
                disabled={!playlistInput || !newPlaylistName}
                className="bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase"
              >
                Salva
              </button>
            </div>
          </div>

          {savedPlaylists.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <h4 className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Playlist Salvate</h4>
              <div className="grid grid-cols-1 gap-2">
                {savedPlaylists.map((pl) => (
                  <div key={pl.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-xs text-white font-bold px-2">{pl.name}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleYoutubeAction({ action: "setPlaylist", playlistId: pl.playlist_id })}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      >
                        Carica
                      </button>
                      <button 
                        onClick={() => deletePlaylist(pl.id)}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState?.youtubePlaylistId && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button 
                onClick={() => handleYoutubeAction({ action: "setStatus", status: "playing" })}
                className="bg-green-600 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase text-xs transition-all"
              >
                ▶️ Play
              </button>
              <button 
                onClick={() => handleYoutubeAction({ action: "setStatus", status: "paused" })}
                className="bg-orange-600/20 text-orange-500 border border-orange-500/50 py-3 rounded-xl font-bold uppercase text-xs transition-all hover:bg-orange-600/30"
              >
                ⏸️ Pausa
              </button>
              <button 
                onClick={() => handleYoutubeAction({ action: "triggerCommand", command: "shuffle" })}
                className="bg-white/10 text-white py-3 rounded-xl font-bold uppercase text-xs border border-white/10 hover:bg-white/20 col-span-2"
              >
                🔀 Mixa
              </button>
            </div>
          )}
        </div>

      <div className="panel rounded-[2.5rem] p-6 space-y-4 border border-red-600/30">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider italic flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500">🏴‍☠️</span> Squadre in Gioco
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-black">{gameState?.leaderboard?.length || 0}</span>
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {gameState?.leaderboard && gameState.leaderboard.length > 0 ? (
            gameState.leaderboard.map(team => (
              <div key={team.email} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                <div>
                  <p className="text-sm font-bold text-white uppercase">{team.nickname}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-black uppercase">Tavolo {team.tableNumber} • {team.totalPoints} pt</p>
                </div>
                <button 
                  onClick={() => initiateConfirm("kick-team", team.email)}
                  disabled={actionLoading}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-400 w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors"
                  title="Espelli Squadra"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-xs text-[var(--text-muted)]">Nessuna squadra registrata</p>
          )}
        </div>
      </div>

    </div>
  );
}
