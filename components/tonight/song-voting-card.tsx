"use client";

import { useEffect, useMemo, useState } from "react";
import { Music, Check, User, Mail, Sparkles, AlertCircle, Search, Calendar, Disc, X, Heart } from "lucide-react";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { getSupabase } from "@/lib/supabase/client";
import type { SongVotingState } from "@/lib/serata-live/types";

export function SongVotingCard() {
  const { scenario } = useDemoScenario();
  const { identity, setIdentityFromEmail } = useCustomerIdentity();
  const [songVoting, setSongVoting] = useState<SongVotingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState("");

  // Determine effective user email considering demo scenarios
  const userEmail = useMemo(() => {
    if (scenario.enabled) {
      return scenario.loggedIn ? (identity.email?.trim().toLowerCase() || "pirata.demo@tortuga.it") : "";
    }
    return identity.email?.trim().toLowerCase() || "";
  }, [scenario.enabled, scenario.loggedIn, identity.email]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingSongId, setPendingSongId] = useState<string | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  const fetchState = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/serata-live/canzoni", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.songVoting) {
          setSongVoting((prev) => {
            // Prevent unnecessary re-renders if vote state hasn't changed
            if (prev && JSON.stringify(prev) === JSON.stringify(data.songVoting)) {
              return prev;
            }
            return data.songVoting;
          });
        }
      }
    } catch (err) {
      if (!silent) console.error("Errore recupero canzoni:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchState(false);

    // 1. Supabase Realtime WebSockets Push (0 HTTP polling requests)
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel("serata_live_votes_client")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_state",
            filter: "key=eq.serata_live_state",
          },
          (payload) => {
            if (payload.new && (payload.new as { value?: string }).value) {
              try {
                const parsed = JSON.parse((payload.new as { value: string }).value);
                if (parsed.songVoting) {
                  setSongVoting((prev) => {
                    if (prev && JSON.stringify(prev) === JSON.stringify(parsed.songVoting)) return prev;
                    return parsed.songVoting;
                  });
                }
              } catch {
                void fetchState(true);
              }
            } else {
              void fetchState(true);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase realtime fallback to interval:", err);
    }

    // 2. Safety fallback interval (15s) for offline / local-only environments
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetchState(true);
      }
    }, 15000);

    // 3. Instant sync when user re-opens tab
    const handleFocus = () => void fetchState(true);
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      if (channel) void channel.unsubscribe();
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, []);

  const handleVoteClick = async (songId: string) => {
    if (!userEmail) {
      setPendingSongId(songId);
      setShowLoginModal(true);
      return;
    }

    await submitVote(songId, userEmail);
  };

  const submitVote = async (songId: string, userIdentifier: string) => {
    const userId = userIdentifier.toLowerCase().trim();

    try {
      setSubmittingId(songId);
      setErrorBanner("");

      // Optimistic local state update for 0ms instantaneous tap feedback
      setSongVoting((prev) => {
        if (!prev) return prev;
        const currentVotedIds = prev.songs
          .filter((s) => s.voterIds.map((v) => v.toLowerCase().trim()).includes(userId))
          .map((s) => s.id);
        const isAlreadyVoted = currentVotedIds.includes(songId);
        const maxVotes = prev.maxVotesPerUser ?? 5;

        if (!isAlreadyVoted && currentVotedIds.length >= maxVotes) {
          return prev;
        }

        const updatedSongs = prev.songs.map((song) => {
          const isTarget = song.id === songId;
          const cleanVoters = song.voterIds.filter((v) => v.toLowerCase().trim() !== userId);
          let nextVoters = cleanVoters;

          if (isTarget) {
            if (!isAlreadyVoted) {
              nextVoters = [...cleanVoters, userId];
            }
          } else if (currentVotedIds.includes(song.id)) {
            nextVoters = [...cleanVoters, userId];
          }

          return {
            ...song,
            voterIds: nextVoters,
            votesCount: nextVoters.length,
          };
        });

        return {
          ...prev,
          songs: updatedSongs,
        };
      });

      const res = await fetch("/api/serata-live/canzoni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, userIdentifier }),
      });
      const data = await res.json();
      if (res.ok && data.songVoting) {
        setSongVoting(data.songVoting);
      } else {
        setErrorBanner(data.error || "Impossibile registrare il voto.");
        void fetchState(true);
      }
    } catch (err) {
      console.error("Errore invio voto:", err);
      setErrorBanner("Errore di rete durante il salvataggio.");
      void fetchState(true);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim() || !loginEmail.includes("@")) {
      setLoginError("Inserisci una e-mail valida.");
      return;
    }

    const success = setIdentityFromEmail(loginEmail.trim(), {
      firstName: loginName.trim() || undefined,
    });

    if (success) {
      setShowLoginModal(false);
      if (pendingSongId) {
        const userEmail = loginEmail.trim().toLowerCase();
        await submitVote(pendingSongId, userEmail);
        setPendingSongId(null);
      }
    } else {
      setLoginError("Indirizzo e-mail non valido.");
    }
  };

  const maxVotes = songVoting?.maxVotesPerUser ?? 5;

  // List of unique genres and decades from songs catalog
  const { availableGenres, availableDecades } = useMemo(() => {
    if (!songVoting?.songs) return { availableGenres: [], availableDecades: [] };
    const genresSet = new Set<string>();
    const decadesSet = new Set<string>();

    songVoting.songs.forEach((s) => {
      if (s.genre) genresSet.add(s.genre);
      if (s.decade) decadesSet.add(s.decade);
    });

    return {
      availableGenres: Array.from(genresSet).sort(),
      availableDecades: Array.from(decadesSet).sort(),
    };
  }, [songVoting]);

  // Filtered songs
  const filteredSongs = useMemo(() => {
    if (!songVoting?.songs) return [];
    return songVoting.songs.filter((song) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist?.toLowerCase().includes(q);
        if (!matchTitle && !matchArtist) return false;
      }

      if (selectedGenre !== "all" && song.genre !== selectedGenre) {
        return false;
      }

      if (selectedDecade !== "all" && song.decade !== selectedDecade) {
        return false;
      }

      return true;
    });
  }, [songVoting, searchQuery, selectedGenre, selectedDecade]);

  // Count user selected songs
  const userVotedCount = useMemo(() => {
    if (!userEmail || !songVoting?.songs) return 0;
    return songVoting.songs.filter((s) => s.voterIds.includes(userEmail)).length;
  }, [userEmail, songVoting]);

  if (loading) {
    return (
      <section className="loyalty-summary p-6 text-center text-[var(--text-muted)] text-sm">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-[var(--accent)] rounded-full mb-2" />
        <p>Caricamento canzoni da cantare...</p>
      </section>
    );
  }

  if (!songVoting || !songVoting.enabled) {
    return (
      <section className="loyalty-summary p-5 text-center text-[var(--text-muted)] space-y-1">
        <Music className="mx-auto text-[var(--accent)]/60" size={24} />
        <p className="font-bold text-sm text-[var(--text)]">Votazione canzoni al momento non attiva</p>
        <p className="text-xs text-[var(--text-muted)]">
          Il Capitano attiverà la votazione durante la serata dal vivo!
        </p>
      </section>
    );
  }

  const totalVotes = songVoting.songs.reduce((acc, s) => acc + s.votesCount, 0);

  return (
    <>
      <section className="loyalty-summary space-y-4">
        {/* Card Header matching App Style */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(40,35,28,.12)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[rgba(165,43,43,.2)] flex items-center justify-center text-[var(--accent-strong)] shrink-0">
              <Music size={20} />
            </div>
            <div>
              <p className="minimal-eyebrow">Serata Live</p>
              <h2 className="tonight-section-title">Scegli le canzoni di stasera</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {userEmail ? (
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                userVotedCount >= maxVotes
                  ? "bg-amber-100 border-amber-400 text-amber-900"
                  : "bg-[var(--accent-soft)] border-[var(--accent)]/30 text-[var(--accent-strong)]"
              }`}>
                {userVotedCount} / {maxVotes} Selezionate
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--accent-strong)] font-bold text-xs flex items-center gap-1">
                <Sparkles size={12} /> {totalVotes} Voti
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorBanner ? (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{errorBanner}</span>
          </div>
        ) : null}

        {/* Search & Filters Controls */}
        <div className="space-y-2 bg-[#f3ecdf] p-2.5 rounded-2xl border border-[rgba(40,35,28,.12)]">
          {/* Campo di ricerca */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca titolo o artista..."
              className="w-full bg-[#fffdf8] border border-[rgba(40,35,28,.16)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Dropdown Annata e Genere */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedDecade}
              onChange={(e) => setSelectedDecade(e.target.value)}
              className="w-full bg-[#fffdf8] border border-[rgba(40,35,28,.16)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">📅 Annata (Tutte)</option>
              {availableDecades.map((dec) => (
                <option key={dec} value={dec}>
                  {dec}
                </option>
              ))}
            </select>

            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-[#fffdf8] border border-[rgba(40,35,28,.16)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">🎸 Genere (Tutti)</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Songs List - Compact layout with Artist right, Year under votes */}
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredSongs.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-muted)] italic">
              Nessuna canzone trovata per i filtri selezionati.
            </p>
          ) : (
            filteredSongs.map((song) => {
              const hasVoted = userEmail ? song.voterIds.includes(userEmail) : false;
              const percentage = totalVotes > 0 ? Math.round((song.votesCount / totalVotes) * 100) : 0;
              const isSubmitting = submittingId === song.id;
              const cleanYear = song.decade ? song.decade.replace(/^Anni\s*/i, "") : "";

              return (
                <div
                  key={song.id}
                  onClick={() => !isSubmitting && handleVoteClick(song.id)}
                  className={`relative overflow-hidden px-3 py-2 rounded-xl border transition-all cursor-pointer group select-none ${
                    hasVoted
                      ? "bg-[#a52b2b]/10 border-[#c59a47] text-[var(--text)] shadow-sm"
                      : "bg-[#f3ecdf] border-[rgba(40,35,28,.12)] hover:border-[#c59a47]/50 text-[var(--text)]"
                  }`}
                >
                  {/* Progress bar background */}
                  {totalVotes > 0 ? (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-[#c59a47]/10 transition-all duration-500 pointer-events-none"
                      style={{ width: `${percentage}%` }}
                    />
                  ) : null}

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    {/* Parte Sinistra: Artista SOPRA, Titolo SOTTO */}
                    <div className="min-w-0 flex-1 pr-1">
                      {/* Linea 1 (Sopra): Artista */}
                      {song.artist ? (
                        <p className="text-[11px] text-[var(--text-muted)] font-semibold truncate leading-tight">
                          {song.artist}
                        </p>
                      ) : null}

                      {/* Linea 2 (Sotto): Titolo */}
                      <p className="font-bold text-xs sm:text-sm text-[var(--text)] group-hover:text-[var(--accent-strong)] truncate leading-snug">
                        {song.title}
                      </p>
                    </div>

                    {/* Parte Destra: Divisione fissa con Genere/Anno e Pulsante Like */}
                    <div className="flex items-center gap-1.5 shrink-0 border-l border-[rgba(40,35,28,.14)] pl-1.5">
                      {/* Blocco Genere (sopra) e Anno (sotto) a larghezza ridotta (54px) per dare più spazio al titolo */}
                      <div className="w-[54px] text-right flex flex-col items-end justify-center gap-0.5 shrink-0 overflow-hidden">
                        {song.genre ? (
                          <span
                            className="w-full text-right truncate block px-0.5 py-0.2 rounded bg-[var(--accent-soft)] text-[var(--accent-strong)] text-[9px] font-bold tracking-tighter"
                            title={song.genre}
                          >
                            {song.genre}
                          </span>
                        ) : null}

                        {cleanYear ? (
                          <span className="px-1 py-0.2 rounded bg-[#fffdf8] border border-[rgba(40,35,28,.14)] text-[9px] text-[var(--text-muted)] font-semibold leading-tight shadow-2xs shrink-0">
                            {cleanYear}
                          </span>
                        ) : null}
                      </div>

                      {/* Pulsante Like con Contatore a larghezza fissa (56px) */}
                      <button
                        type="button"
                        disabled={isSubmitting}
                        className={`w-14 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer shrink-0 ${
                          hasVoted
                            ? "bg-gradient-to-r from-[#a52b2b] to-[#c59a47] text-white ring-2 ring-[#c59a47]/40"
                            : "bg-[#fffdf8] border border-[rgba(40,35,28,.18)] text-[var(--text)] hover:border-[#c59a47]"
                        }`}
                      >
                        <Heart
                          size={13}
                          className={`shrink-0 transition-transform duration-200 ${
                            hasVoted ? "fill-white text-white scale-110" : "text-[#a52b2b] group-hover:scale-110"
                          }`}
                        />
                        <span className="font-mono text-xs font-black shrink-0">{song.votesCount}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!identity.email ? (
          <p className="text-xs text-center text-[var(--text-muted)] italic border-t border-[rgba(40,35,28,.1)] pt-2.5">
            💡 Chiunque può vedere il repertorio. Clicca &quot;Scegli&quot; per accedere e votare fino a {maxVotes} canzoni!
          </p>
        ) : null}
      </section>

      {/* Login Modal matching App Style */}
      {showLoginModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#fffdf8] border border-[rgba(40,35,28,.2)] p-6 shadow-2xl text-[var(--text)] space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#f3ecdf] hover:bg-[#ebe2d2] flex items-center justify-center text-[var(--text-muted)]"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1 pr-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex items-center justify-center mx-auto text-[var(--accent-strong)]">
                <Music size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-[var(--text)] pt-2">Accedi per Votare</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Inserisci il tuo nome ed e-mail per scegliere fino a {maxVotes} canzoni dal repertorio!
              </p>
            </div>

            {loginError ? (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            ) : null}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text)] mb-1">Il tuo Nome</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                  <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Es. Marco"
                    className="w-full bg-[#f2ebdf] border border-[rgba(40,35,28,.16)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text)] mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="marco@example.com"
                    required
                    className="w-full bg-[#f2ebdf] border border-[rgba(40,35,28,.16)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#f2ebdf] text-[var(--text-muted)] font-bold text-xs hover:bg-[#ebe2d2] transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="minimal-primary flex-1 py-3"
                >
                  Entra e Vota
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
