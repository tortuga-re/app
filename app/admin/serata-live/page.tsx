"use client";

import { useEffect, useMemo, useState } from "react";
import { Music, Vote, Plus, Trash2, RotateCcw, Save, Calendar, ShieldAlert, CheckCircle2, Eye, FileText, Upload, Trophy, Layers, Zap, PowerOff, Edit3, Camera, Image as ImageIcon, Heart } from "lucide-react";
import type { SerataLiveState, SongCandidate, SurveyOption, CiurmaMinRank, SurveyTargetPlacement, CiurmaSurveyState } from "@/lib/serata-live/types";
import { getSupabase } from "@/lib/supabase/client";

type AdminPhotoItem = {
  id: string;
  mediaUrl: string;
  createdAt: string;
  likesCount: number;
  likedByDevices: string[];
  uploaderName?: string;
};

export default function AdminSerataLivePage() {
  const [activeTab, setActiveTab] = useState<"canzoni" | "sondaggi" | "foto">("canzoni");
  const [state, setState] = useState<SerataLiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin Photos state
  const [adminPhotos, setAdminPhotos] = useState<AdminPhotoItem[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Top 20 songs calculated in real time
  const top20Songs = useMemo(() => {
    if (!state?.songVoting?.songs) return [];
    return [...state.songVoting.songs]
      .filter((s) => s.votesCount > 0)
      .sort((a, b) => b.votesCount - a.votesCount)
      .slice(0, 20);
  }, [state]);

  // Form states for single song
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  const [newSongGenre, setNewSongGenre] = useState("");
  const [newSongDecade, setNewSongDecade] = useState("");

  // Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkSongsText, setBulkSongsText] = useState("");

  // Form state for survey creation/editing
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [surveyQuestion, setSurveyQuestion] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [surveyPlacement, setSurveyPlacement] = useState<SurveyTargetPlacement>("ciurma_home");
  const [surveyMinRank, setSurveyMinRank] = useState<CiurmaMinRank>("bucaniere");
  const [surveyStartDate, setSurveyStartDate] = useState("");
  const [surveyEndDate, setSurveyEndDate] = useState("");
  const [surveyOptions, setSurveyOptions] = useState<SurveyOption[]>([
    { id: "opt-1", text: "Opzione 1 🍕", votesCount: 0, voterIds: [] },
    { id: "opt-2", text: "Opzione 2 🍔", votesCount: 0, voterIds: [] },
  ]);
  const [newOptionText, setNewOptionText] = useState("");

  const loadAdminPhotos = async () => {
    try {
      setLoadingPhotos(true);
      const res = await fetch("/api/admin/live-tv/customer-photos", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAdminPhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Errore caricamento foto admin:", err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa foto? Verrà rimossa dal carosello pubblico e dal server.")) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/live-tv/customer-photos?id=${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAdminPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setMessage({ type: "success", text: "Foto eliminata con successo!" });
      } else {
        setMessage({ type: "error", text: "Impossibile eliminare la foto." });
      }
    } catch (err) {
      console.error("Errore eliminazione foto:", err);
      setMessage({ type: "error", text: "Errore durante l'eliminazione della foto." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPhotoLikes = async () => {
    if (!confirm("Sei sicuro di voler azzerare i voti di TUTTE le foto della serata?")) return;
    try {
      setSaving(true);
      const res = await fetch("/api/admin/live-tv/customer-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetLikes" }),
      });
      if (res.ok) {
        await loadAdminPhotos();
        setMessage({ type: "success", text: "Voti foto azzerati con successo!" });
      }
    } catch (err) {
      console.error("Errore azzeramento voti foto:", err);
    } finally {
      setSaving(false);
    }
  };

  const loadState = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/admin/serata-live", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState((prev) => {
            if (prev && JSON.stringify(prev) === JSON.stringify(data.state)) {
              return prev;
            }
            return data.state;
          });

          // Sync initial survey form if empty
          if (data.state.survey && !surveyQuestion && !editingSurveyId) {
            const s = data.state.survey;
            setEditingSurveyId(s.id);
            setSurveyQuestion(s.question || "");
            setSurveyDescription(s.description || "");
            setSurveyPlacement(s.targetPlacement || "ciurma_home");
            setSurveyMinRank(s.minRank || "bucaniere");
            setSurveyStartDate(s.startDate || "");
            setSurveyEndDate(s.endDate || "");
            setSurveyOptions(s.options || []);
          }
        }
      }
    } catch (err) {
      if (!silent) {
        console.error("Errore nel caricamento dello stato:", err);
        setMessage({ type: "error", text: "Impossibile caricare i dati della Serata Live." });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadState(false);

    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel("serata_live_votes_admin")
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
                setState((prev) => {
                  if (prev && JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
                  return parsed;
                });
              } catch {
                void loadState(true);
              }
            } else {
              void loadState(true);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime WebSocket fallback:", err);
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadState(true);
      }
    }, 15000);

    const handleFocus = () => void loadState(true);
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

  const saveState = async (updatedState: SerataLiveState, successMsg: string) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/admin/serata-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveAll", state: updatedState }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
          setMessage({ type: "success", text: successMsg });
        }
      } else {
        setMessage({ type: "error", text: "Errore durante il salvataggio." });
      }
    } catch (err) {
      console.error("Errore salvataggio:", err);
      setMessage({ type: "error", text: "Errore di connessione durante il salvataggio." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSongVotes = async () => {
    if (!state || !confirm("Sei sicuro di voler azzerare tutti i voti delle canzoni? Il repertorio rimarrà salvato.")) return;
    const nextState: SerataLiveState = {
      ...state,
      songVoting: {
        ...state.songVoting,
        songs: state.songVoting.songs.map((s) => ({ ...s, votesCount: 0, voterIds: [] })),
      },
    };
    await saveState(nextState, "Voti canzoni azzerati con successo!");
  };

  const handleAddSong = () => {
    if (!state || !newSongTitle.trim()) return;
    const newSong: SongCandidate = {
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newSongTitle.trim(),
      artist: newSongArtist.trim() || undefined,
      genre: newSongGenre.trim() || undefined,
      decade: newSongDecade.trim() || undefined,
      votesCount: 0,
      voterIds: [],
    };
    const nextState: SerataLiveState = {
      ...state,
      songVoting: {
        ...state.songVoting,
        songs: [...state.songVoting.songs, newSong],
      },
    };
    setState(nextState);
    setNewSongTitle("");
    setNewSongArtist("");
    setNewSongGenre("");
    setNewSongDecade("");
  };

  const handleBulkImport = () => {
    if (!state || !bulkSongsText.trim()) return;
    const lines = bulkSongsText.split("\n").map((l) => l.trim()).filter(Boolean);
    const newSongs: SongCandidate[] = lines.map((line, idx) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        id: `song-bulk-${Date.now()}-${idx}`,
        title: parts[0] || "Brano",
        artist: parts[1] || undefined,
        genre: parts[2] || undefined,
        decade: parts[3] || undefined,
        votesCount: 0,
        voterIds: [],
      };
    });

    const nextState: SerataLiveState = {
      ...state,
      songVoting: {
        ...state.songVoting,
        songs: [...state.songVoting.songs, ...newSongs],
      },
    };
    setState(nextState);
    setBulkSongsText("");
    setShowBulkImport(false);
  };

  const handleDeleteSong = (id: string) => {
    if (!state) return;
    const nextState: SerataLiveState = {
      ...state,
      songVoting: {
        ...state.songVoting,
        songs: state.songVoting.songs.filter((s) => s.id !== id),
      },
    };
    setState(nextState);
  };

  // --- SURVEY MANAGEMENT HANDLERS ---
  const handleNewSurvey = () => {
    setEditingSurveyId(null);
    setSurveyQuestion("");
    setSurveyDescription("");
    setSurveyPlacement("ciurma_home");
    setSurveyMinRank("bucaniere");
    setSurveyStartDate("");
    setSurveyEndDate("");
    setSurveyOptions([
      { id: `opt-${Date.now()}-1`, text: "Opzione 1 🍕", votesCount: 0, voterIds: [] },
      { id: `opt-${Date.now()}-2`, text: "Opzione 2 🍔", votesCount: 0, voterIds: [] },
    ]);
  };

  const handleEditSurvey = (survey: CiurmaSurveyState) => {
    setEditingSurveyId(survey.id);
    setSurveyQuestion(survey.question);
    setSurveyDescription(survey.description || "");
    setSurveyPlacement(survey.targetPlacement);
    setSurveyMinRank(survey.minRank);
    setSurveyStartDate(survey.startDate || "");
    setSurveyEndDate(survey.endDate || "");
    setSurveyOptions(survey.options || []);
  };

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    const newOpt: SurveyOption = {
      id: `opt-${Date.now()}`,
      text: newOptionText.trim(),
      votesCount: 0,
      voterIds: [],
    };
    setSurveyOptions((prev) => [...prev, newOpt]);
    setNewOptionText("");
  };

  const handleDeleteOption = (id: string) => {
    setSurveyOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSaveAndActivateSurvey = async () => {
    if (!state) return;
    if (!surveyQuestion.trim()) {
      setMessage({ type: "error", text: "La domanda del sondaggio non può essere vuota." });
      return;
    }
    if (surveyOptions.length < 2) {
      setMessage({ type: "error", text: "Inserisci almeno 2 opzioni di risposta per il sondaggio." });
      return;
    }

    const targetId = editingSurveyId || `survey-${Date.now()}`;
    const newSurvey: CiurmaSurveyState = {
      id: targetId,
      enabled: true,
      question: surveyQuestion.trim(),
      description: surveyDescription.trim() || undefined,
      targetPlacement: surveyPlacement,
      minRank: surveyMinRank,
      startDate: surveyStartDate || undefined,
      endDate: surveyEndDate || undefined,
      options: surveyOptions,
      createdAt: new Date().toISOString(),
    };

    const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];
    const existingIdx = currentSurveys.findIndex((s) => s.id === targetId);

    let updatedSurveys: CiurmaSurveyState[];
    if (existingIdx >= 0) {
      updatedSurveys = currentSurveys.map((s, idx) =>
        idx === existingIdx ? newSurvey : { ...s, enabled: false }
      );
    } else {
      updatedSurveys = [newSurvey, ...currentSurveys.map((s) => ({ ...s, enabled: false }))];
    }

    const nextState: SerataLiveState = {
      ...state,
      survey: newSurvey,
      surveys: updatedSurveys,
    };

    setEditingSurveyId(targetId);
    await saveState(nextState, "Sondaggio salvato ed ATTIVATO con successo!");
  };

  const handleDeactivateSurvey = async (surveyId: string) => {
    if (!state) return;
    const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];

    const updatedSurveys = currentSurveys.map((s) => {
      if (s.id === surveyId) {
        return {
          ...s,
          enabled: false,
          options: s.options.map((o) => ({ ...o, votesCount: 0, voterIds: [] })),
        };
      }
      return s;
    });

    let activeSurvey = state.survey;
    if (state.survey.id === surveyId) {
      activeSurvey = {
        ...state.survey,
        enabled: false,
        options: state.survey.options.map((o) => ({ ...o, votesCount: 0, voterIds: [] })),
      };
    }

    const nextState: SerataLiveState = {
      ...state,
      survey: activeSurvey,
      surveys: updatedSurveys,
    };

    await saveState(nextState, "Sondaggio disattivato e voti azzerati. È rimasto salvato per usi futuri!");
  };

  const handleActivateSurvey = async (surveyId: string) => {
    if (!state) return;
    const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];

    const targetSurvey = currentSurveys.find((s) => s.id === surveyId);
    if (!targetSurvey) return;

    const activatedSurvey = {
      ...targetSurvey,
      enabled: true,
      options: targetSurvey.options.map((o) => ({ ...o, votesCount: 0, voterIds: [] })),
    };

    const updatedSurveys = currentSurveys.map((s) =>
      s.id === surveyId ? activatedSurvey : { ...s, enabled: false }
    );

    const nextState: SerataLiveState = {
      ...state,
      survey: activatedSurvey,
      surveys: updatedSurveys,
    };

    handleEditSurvey(activatedSurvey);
    await saveState(nextState, `Sondaggio "${activatedSurvey.question}" attivato!`);
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!state || !confirm("Sei sicuro di voler eliminare questo sondaggio dalla libreria?")) return;
    const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];

    const updatedSurveys = currentSurveys.filter((s) => s.id !== surveyId);
    let activeSurvey = state.survey;

    if (state.survey?.id === surveyId) {
      const nextActive = updatedSurveys.find((s) => s.enabled) || updatedSurveys[0] || {
        id: `survey-disabled-${Date.now()}`,
        enabled: false,
        question: "",
        targetPlacement: "ciurma_home" as SurveyTargetPlacement,
        minRank: "bucaniere" as CiurmaMinRank,
        options: [],
        createdAt: new Date().toISOString(),
      };
      activeSurvey = nextActive;
    }

    const nextState: SerataLiveState = {
      ...state,
      survey: activeSurvey,
      surveys: updatedSurveys,
    };

    if (editingSurveyId === surveyId) {
      handleNewSurvey();
    }
    await saveState(nextState, "Sondaggio eliminato dalla libreria.");
  };

  if (loading || !state) {
    return (
      <div className="p-8 text-center text-white/70">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[#c59a47] rounded-full mb-3" />
        <p>Caricamento configurazione Serata Live...</p>
      </div>
    );
  }

  const surveysList = Array.isArray(state.surveys) ? state.surveys : [state.survey];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(40,35,28,.15)] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5" style={{ color: "#1a1612" }}>
            <Music className="text-[#a52b2b]" /> Gestione Serata Live & Sondaggi
          </h1>
          <p className="text-sm font-semibold mt-1" style={{ color: "#5c4f41" }}>
            Gestisci in tempo reale il repertorio canzoni da cantare e i sondaggi per la Ciurma e la Home.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#1a1612] p-1.5 rounded-xl border border-[#c59a47]/40 shrink-0 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("canzoni")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === "canzoni"
                ? "bg-[#c59a47] shadow-lg font-black"
                : "hover:bg-white/10"
            }`}
            style={activeTab === "canzoni" ? { color: "#000000", backgroundColor: "#c59a47" } : { color: "#ffffff", backgroundColor: "transparent" }}
          >
            <Music size={15} /> Canzoni
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sondaggi")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === "sondaggi"
                ? "bg-[#c59a47] shadow-lg font-black"
                : "hover:bg-white/10"
            }`}
            style={activeTab === "sondaggi" ? { color: "#000000", backgroundColor: "#c59a47" } : { color: "#ffffff", backgroundColor: "transparent" }}
          >
            <Vote size={15} /> Sondaggi
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("foto");
              void loadAdminPhotos();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === "foto"
                ? "bg-[#c59a47] shadow-lg font-black"
                : "hover:bg-white/10"
            }`}
            style={activeTab === "foto" ? { color: "#000000", backgroundColor: "#c59a47" } : { color: "#ffffff", backgroundColor: "transparent" }}
          >
            <Camera size={15} /> Foto Live
          </button>
        </div>
      </header>

      {/* Alert message */}
      {message ? (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            message.type === "success"
              ? "bg-green-950/50 border-green-500/50 text-green-200"
              : "bg-red-950/50 border-red-500/50 text-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
          <span>{message.text}</span>
        </div>
      ) : null}

      {/* Tab 1: Votazione Canzoni */}
      {activeTab === "canzoni" ? (
        <div className="space-y-6">
          {/* Controllo Stato Votazione Canzoni */}
          <div className="bg-[#1a1612] border border-[#c59a47]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c59a47]/20 border border-[#c59a47]/40 flex items-center justify-center text-[#f4e0ad]">
                <Music size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#f4e0ad]">Stato Votazione Canzoni</h3>
                <p className="text-xs text-white/60">
                  Abilita o disabilita la possibilità per i clienti di votare le canzoni dalla pagina Stasera
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer bg-[#120f0c] px-3.5 py-2 rounded-xl border border-[#c59a47]/40 hover:border-[#c59a47] transition-all shrink-0">
              <span
                className="text-xs font-extrabold tracking-wide"
                style={{ color: state.songVoting.enabled ? "#4ade80" : "#f87171" }}
              >
                {state.songVoting.enabled ? "🟢 Votazione Attiva" : "🔴 Votazione Disattivata"}
              </span>
              <input
                type="checkbox"
                checked={state.songVoting.enabled}
                onChange={(e) => {
                  const nextState: SerataLiveState = {
                    ...state,
                    songVoting: { ...state.songVoting, enabled: e.target.checked },
                  };
                  setState(nextState);
                  void saveState(nextState, e.target.checked ? "Votazione canzoni attivata!" : "Votazione canzoni disattivata!");
                }}
                className="w-5 h-5 accent-[#c59a47] rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Top 20 Ranking Live */}
          <div className="bg-gradient-to-br from-[#241a12] via-[#1a1612] to-[#151714] border border-[#c59a47]/50 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#c59a47]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#c59a47]/20 border border-[#c59a47]/40 flex items-center justify-center text-[#f4e0ad]">
                  <Trophy size={20} />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg text-[#f4e0ad] flex items-center gap-2">
                    Classifica Live Top 20 Canzoni
                  </h2>
                  <p className="text-xs text-white/60">I brani più votati stasera in tempo reale dai clienti nel locale</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#c59a47]/20 border border-[#c59a47]/40 rounded-full text-xs font-extrabold text-[#f4e0ad]">
                {top20Songs.length} Brani Votati
              </span>
            </div>

            {top20Songs.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/50 italic">
                Nessun voto registrato finora stasera. La classifica si aggiornerà in tempo reale non appena i clienti cominceranno a votare!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {top20Songs.map((song, rank) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#120f0c] border border-[#c59a47]/20 hover:border-[#c59a47]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                        rank === 0
                          ? "bg-[#c59a47] text-black shadow-md"
                          : rank === 1
                          ? "bg-slate-300 text-black shadow"
                          : rank === 2
                          ? "bg-amber-700 text-white shadow"
                          : "bg-white/10 text-white/70"
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm truncate" style={{ color: "#ffffff" }}>
                          {song.title}
                        </p>
                        {song.artist ? (
                          <p className="text-xs font-semibold truncate" style={{ color: "#d9b66d" }}>
                            {song.artist}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {song.genre ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#c59a47]/20 text-[#f4e0ad] text-[9px] font-semibold">
                          {song.genre}
                        </span>
                      ) : null}
                      <span className="px-2.5 py-1 bg-[#a52b2b]/30 border border-[#c59a47]/40 rounded-full text-xs font-black text-[#f4e0ad]">
                        ❤️ {song.votesCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card Repertorio Canzoni */}
          <div className="bg-[#1a1612] border border-[#c59a47]/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c59a47]/20 pb-3">
              <h3 className="font-bold text-md text-[#f4e0ad]">
                Repertorio Canzoni Costante ({state.songVoting.songs.length} brani)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkImport(!showBulkImport)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <Upload size={14} /> {showBulkImport ? "Nascondi Import Massivo" : "Import Massivo Elenco"}
              </button>
            </div>

            {/* Bulk Import Textarea */}
            {showBulkImport ? (
              <div className="bg-[#120f0c] p-4 rounded-xl border border-[#c59a47]/40 space-y-3">
                <label className="block text-xs font-bold text-[#f4e0ad] flex items-center gap-2">
                  <FileText size={16} /> Incolla elenco canzoni (Una per riga)
                </label>
                <p className="text-[11px] text-white/60">
                  Formato supportato per riga: <code className="text-[#f4e0ad]">Titolo, Artista, Genere, Annata</code>
                  <br />
                  Esempio: <code className="text-white/80">Albachiara, Vasco Rossi, Rock Italiano, Anni &apos;70</code>
                </p>
                <textarea
                  rows={5}
                  value={bulkSongsText}
                  onChange={(e) => setBulkSongsText(e.target.value)}
                  placeholder="Albachiara, Vasco Rossi, Rock, Anni '70&#10;50 Special, Lunapop, Pop, Anni '90&#10;Mon Amour, Annalisa, Pop, 2020+"
                  className="w-full bg-[#1a1612] border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#c59a47] font-mono"
                />
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-4 py-2 bg-[#c59a47] text-black font-extrabold text-xs rounded-xl hover:bg-[#d9b66d] transition-all"
                >
                  Importa Canzoni nel Repertorio
                </button>
              </div>
            ) : null}

            {/* Form per singolo brano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end bg-[#120f0c] p-3.5 rounded-xl border border-[#c59a47]/20">
              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">Titolo Brano*</label>
                <input
                  type="text"
                  value={newSongTitle}
                  onChange={(e) => setNewSongTitle(e.target.value)}
                  placeholder="Es. Albachiara"
                  className="w-full bg-[#1a1612] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">Artista</label>
                <input
                  type="text"
                  value={newSongArtist}
                  onChange={(e) => setNewSongArtist(e.target.value)}
                  placeholder="Es. Vasco Rossi"
                  className="w-full bg-[#1a1612] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">Genere</label>
                <input
                  type="text"
                  value={newSongGenre}
                  onChange={(e) => setNewSongGenre(e.target.value)}
                  placeholder="Es. Pop, Rock, Dance"
                  className="w-full bg-[#1a1612] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">Annata / Decennio</label>
                <input
                  type="text"
                  value={newSongDecade}
                  onChange={(e) => setNewSongDecade(e.target.value)}
                  placeholder="Es. Anni 2010, Anni 2020, Anni '90"
                  className="w-full bg-[#1a1612] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSong}
                className="px-4 py-1.5 bg-[#c59a47] text-black font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#d9b66d] transition-all"
              >
                <Plus size={15} /> Aggiungi
              </button>
            </div>

            {/* Elenco canzoni */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {state.songVoting.songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between gap-3 p-3 bg-[#120f0c] border border-white/10 rounded-xl hover:border-[#c59a47]/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm truncate" style={{ color: "#ffffff" }}>
                      {song.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap" style={{ color: "#d9b66d" }}>
                      {song.artist ? <span className="font-semibold">{song.artist}</span> : null}
                      {song.decade ? (
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/70">
                          {song.decade}
                        </span>
                      ) : null}
                      {song.genre ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#c59a47]/20 text-[#f4e0ad] text-[10px]">
                          {song.genre}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 bg-[#c59a47]/20 border border-[#c59a47]/40 rounded-full text-xs font-bold text-[#f4e0ad]">
                      {song.votesCount} voti
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSong(song.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Elimina brano"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetSongVotes}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 bg-red-950/60 border border-red-500/40 text-red-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-900/60 transition-colors"
            >
              <RotateCcw size={15} /> Azzera Voti Canzoni
            </button>
            <button
              type="button"
              onClick={() => saveState(state, "Configurazione Canzoni salvata con successo!")}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#c59a47] to-[#d9b66d] text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <Save size={16} /> {saving ? "Salvataggio..." : "Salva Modifiche Canzoni"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Gestione Sondaggi */}
      {activeTab === "sondaggi" ? (
        <div className="space-y-6">
          {/* Card Configurazione/Creazione Sondaggio */}
          <div className="bg-[#1a1612] border border-[#c59a47]/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#c59a47]/20 pb-3">
              <h2 className="font-bold text-lg text-[#f4e0ad] flex items-center gap-2">
                <Vote size={18} className="text-[#c59a47]" />{" "}
                {editingSurveyId ? "Modifica Sondaggio" : "Crea Nuovo Sondaggio"}
              </h2>

              {editingSurveyId ? (
                <button
                  type="button"
                  onClick={handleNewSurvey}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Plus size={14} /> Crea Nuovo da Zero
                </button>
              ) : (
                <span className="px-3 py-1 bg-[#c59a47]/20 border border-[#c59a47]/40 text-[#f4e0ad] rounded-xl text-xs font-extrabold">
                  Nuovo Sondaggio
                </span>
              )}
            </div>

            {/* Posizionamento del sondaggio */}
            <div className="bg-[#120f0c] p-4 rounded-xl border border-[#c59a47]/20 space-y-2">
              <label className="block text-xs font-bold text-[#f4e0ad] flex items-center gap-2">
                <Eye size={15} className="text-[#c59a47]" /> Dove mostrare questo sondaggio?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {(
                  [
                    { id: "ciurma_home", label: "Tab Ciurma ed Home", desc: "Mostrato in home page e tab Ciurma" },
                    { id: "serata", label: "Serata Live (TV)", desc: "Mostrato nella pagina Stasera" },
                    { id: "entrambi", label: "Ovunque (Entrambi)", desc: "Mostrato sia in Serata che in Ciurma/Home" },
                  ] as const
                ).map((target) => (
                  <label
                    key={target.id}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      surveyPlacement === target.id
                        ? "bg-[#c59a47]/20 border-[#c59a47]"
                        : "bg-[#120f0c] border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs" style={{ color: "#ffffff" }}>{target.label}</span>
                      <input
                        type="radio"
                        name="targetPlacement"
                        checked={surveyPlacement === target.id}
                        onChange={() => setSurveyPlacement(target.id as SurveyTargetPlacement)}
                        className="accent-[#c59a47]"
                      />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: "#d9b66d" }}>{target.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Domanda e Descrizione */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#d9b66d" }}>Domanda del Sondaggio</label>
                <input
                  type="text"
                  value={surveyQuestion}
                  onChange={(e) => setSurveyQuestion(e.target.value)}
                  style={{ color: "#ffffff" }}
                  className="w-full bg-[#120f0c] border border-[#c59a47]/40 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#c59a47]"
                  placeholder="Es. Qual è la tua bevanda preferita stasera?"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#d9b66d" }}>Rango Minimo per Votare</label>
                <select
                  value={surveyMinRank}
                  onChange={(e) => setSurveyMinRank(e.target.value as CiurmaMinRank)}
                  style={{ color: "#ffffff" }}
                  className="w-full bg-[#120f0c] border border-[#c59a47]/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#c59a47]"
                >
                  <option value="tutti" className="bg-[#120f0c] text-white">Tutti (Anche ospiti / non registrati)</option>
                  <option value="bucaniere" className="bg-[#120f0c] text-white">Bucaniere o superiore (Primo Rango)</option>
                  <option value="corsaro" className="bg-[#120f0c] text-white">Corsaro o superiore</option>
                  <option value="capitano" className="bg-[#120f0c] text-white">Capitano o superiore</option>
                  <option value="leggenda" className="bg-[#120f0c] text-white">Leggenda (Massimo Rango)</option>
                </select>
              </div>
            </div>

            {/* Programmazione temporale (Da data a data) */}
            <div className="bg-[#120f0c] p-4 rounded-xl border border-[#c59a47]/20 space-y-3">
              <label className="block text-xs font-bold flex items-center gap-2" style={{ color: "#f4e0ad" }}>
                <Calendar size={15} className="text-[#c59a47]" /> Programmazione Temporale (Visibilità da data a data)
              </label>
              <p className="text-[11px] font-medium leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                Se impostati, il sondaggio apparirà solo all&apos;interno del periodo specificato. Se lasciati vuoti, sarà sempre visibile quando attivo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: "#d9b66d" }}>Data e Ora Inizio</label>
                  <input
                    type="datetime-local"
                    value={surveyStartDate}
                    onChange={(e) => setSurveyStartDate(e.target.value)}
                    style={{ color: "#ffffff" }}
                    className="w-full bg-[#1a1612] border border-white/20 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#c59a47]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: "#d9b66d" }}>Data e Ora Fine</label>
                  <input
                    type="datetime-local"
                    value={surveyEndDate}
                    onChange={(e) => setSurveyEndDate(e.target.value)}
                    style={{ color: "#ffffff" }}
                    className="w-full bg-[#1a1612] border border-white/20 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#c59a47]"
                  />
                </div>
              </div>
            </div>

            {/* Card Opzioni del Sondaggio */}
            <div className="bg-[#120f0c] border border-[#c59a47]/20 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-sm" style={{ color: "#f4e0ad" }}>
                Opzioni di Risposta ({surveyOptions.length})
              </h3>

              {/* Inserimento nuova opzione */}
              <div className="flex gap-3 items-end bg-[#1a1612] p-3 rounded-lg border border-white/10">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: "#d9b66d" }}>Testo Nuova Opzione</label>
                  <input
                    type="text"
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    placeholder="Es. Cocktail del Capitano 🍹"
                    style={{ color: "#ffffff" }}
                    className="w-full bg-[#120f0c] border border-white/20 rounded-lg px-3 py-1.5 text-xs placeholder:text-white/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-4 py-1.5 bg-[#c59a47] text-black font-bold text-xs rounded-lg flex items-center gap-1.5 hover:bg-[#d9b66d] transition-all shrink-0"
                >
                  <Plus size={15} /> Aggiungi
                </button>
              </div>

              {/* List of options */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {surveyOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-3 p-2.5 bg-[#1a1612] border border-white/10 rounded-lg hover:border-[#c59a47]/40 transition-colors"
                  >
                    <p className="font-semibold text-xs truncate flex-1" style={{ color: "#ffffff" }}>{opt.text}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(opt.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                      title="Elimina opzione"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveAndActivateSurvey}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-[#c59a47] to-[#d9b66d] text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
              >
                <Zap size={16} /> {saving ? "Salvataggio..." : "Salva e Attiva Sondaggio"}
              </button>
            </div>
          </div>

          {/* Section: Libreria Sondaggi (Attivi & Salvati) */}
          <div className="bg-[#1a1612] border border-[#c59a47]/30 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c59a47]/20 pb-3">
              <div>
                <h2 className="font-bold text-lg text-[#f4e0ad] flex items-center gap-2">
                  <Layers size={18} className="text-[#c59a47]" /> Libreria Sondaggi (Attivi & Salvati)
                </h2>
                <p className="text-xs text-white/60">Tutti i sondaggi disponibili per il Tortuga. Puoi disattivarli o riattivarli per nuove serate.</p>
              </div>
              <button
                type="button"
                onClick={handleNewSurvey}
                className="px-3.5 py-1.5 bg-[#c59a47]/20 border border-[#c59a47]/40 text-[#f4e0ad] hover:bg-[#c59a47] hover:text-black rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <Plus size={15} /> Nuovo Sondaggio
              </button>
            </div>

            <div className="space-y-3">
              {surveysList.length === 0 ? (
                <div className="py-8 text-center text-white/50 space-y-2">
                  <Vote size={32} className="mx-auto text-[#c59a47]/40" />
                  <p className="text-sm font-semibold">Nessun sondaggio presente in libreria.</p>
                  <p className="text-xs text-white/40">Crea il tuo primo sondaggio dal modulo qui sopra per salvarlo ed attivarlo!</p>
                </div>
              ) : (
                surveysList.map((s) => {
                  const isCurrentlyActive = s.enabled;
                  const totalVotes = (s.options || []).reduce((acc, curr) => acc + (curr.votesCount || 0), 0);

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isCurrentlyActive
                        ? "bg-[#1f1a14] border-[#4ade80]/60 shadow-lg shadow-green-950/20"
                        : "bg-[#120f0c] border-white/10 hover:border-[#c59a47]/30"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1.5 ${
                              isCurrentlyActive
                                ? "bg-green-950 border border-green-500/50 text-green-300"
                                : "bg-white/10 border border-white/20 text-white/60"
                            }`}
                          >
                            {isCurrentlyActive ? "🟢 ATTIVO" : "⚪ DISATTIVATO"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#c59a47]/20 text-[#f4e0ad] text-[10px] font-bold">
                            {s.targetPlacement === "ciurma_home"
                              ? "Home & Ciurma"
                              : s.targetPlacement === "serata"
                              ? "Serata Live (TV)"
                              : "Ovunque"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                            Rango min: {s.minRank || "tutti"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#a52b2b]/30 text-[#f4e0ad] text-[10px] font-bold">
                            📊 {totalVotes} voti totali
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base pt-1" style={{ color: "#ffffff" }}>
                          {s.question}
                        </h4>
                        {s.description ? (
                          <p className="text-xs font-medium" style={{ color: "#d9b66d" }}>
                            {s.description}
                          </p>
                        ) : null}
                      </div>

                      {/* Actions for this survey */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                        {isCurrentlyActive ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivateSurvey(s.id)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-red-950/80 border border-red-500/60 text-red-200 hover:bg-red-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                          >
                            <PowerOff size={14} /> Disattiva
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateSurvey(s.id)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-green-700 text-white hover:bg-green-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                          >
                            <Zap size={14} /> Attiva Ora
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEditSurvey(s)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Edit3 size={14} /> Modifica
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSurvey(s.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition-all"
                          title="Elimina sondaggio"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Options summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-white/5">
                      {s.options.map((opt) => (
                        <div key={opt.id} className="bg-[#120f0c] p-2 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                          <span className="font-semibold text-white/90 truncate mr-2">{opt.text}</span>
                          <span className="font-mono font-bold text-[#f4e0ad] shrink-0">{opt.votesCount || 0} voti</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 3: Gestione Foto Live */}
      {activeTab === "foto" ? (
        <div className="space-y-6">
          <div className="bg-[#1a1612] border border-[#c59a47]/30 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c59a47]/20 pb-3">
              <div>
                <h2 className="font-bold text-lg text-[#f4e0ad] flex items-center gap-2">
                  <Camera size={18} className="text-[#c59a47]" /> Foto Live Serata ({adminPhotos.length})
                </h2>
                <p className="text-xs text-white/60">
                  Foto inviate dai clienti al maxi-schermo, ordinate per numero di voti/like ricevuti
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={loadAdminPhotos}
                  disabled={loadingPhotos}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw size={14} /> {loadingPhotos ? "Caricamento..." : "Aggiorna Elenco"}
                </button>
              </div>
            </div>

            {adminPhotos.length === 0 ? (
              <div className="py-12 text-center text-white/50 space-y-2">
                <Camera size={36} className="mx-auto text-[#c59a47]/40" />
                <p className="text-sm font-semibold">Nessuna foto inviata finora stasera.</p>
                <p className="text-xs text-white/40">Le foto inviate dai clienti dal form nella pagina Stasera appariranno qui ordinate per voti.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {adminPhotos.map((photo, rank) => {
                  const formattedTime = new Date(photo.createdAt).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={photo.id}
                      className="bg-[#120f0c] border border-[#c59a47]/20 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-[#c59a47]/50 transition-all group"
                    >
                      {/* Visualizzazione Foto + Badge Posizione */}
                      <div className="relative aspect-4/3 bg-black overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.mediaUrl}
                          alt="Scatto live cliente"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Rank Badge */}
                        <span
                          className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg font-black text-xs shadow-md flex items-center gap-1 ${
                            rank === 0
                              ? "bg-[#c59a47] text-black"
                              : rank === 1
                              ? "bg-slate-300 text-black"
                              : rank === 2
                              ? "bg-amber-700 text-white"
                              : "bg-black/70 text-white border border-white/20"
                          }`}
                        >
                          #{rank + 1} {rank === 0 ? "🏆 1° Posto" : ""}
                        </span>

                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white/90">
                          Ore {formattedTime}
                        </span>

                        <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-[#a52b2b]/90 border border-[#c59a47]/40 backdrop-blur-md text-xs font-black text-[#f4e0ad]">
                          ❤️ {photo.likesCount} {photo.likesCount === 1 ? "like" : "like"}
                        </span>
                      </div>

                      {/* Info & Azione Elimina */}
                      <div className="p-3 bg-[#120f0c] flex items-center justify-between gap-2 border-t border-white/10">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {photo.uploaderName || "Cliente al tavolo"}
                          </p>
                          <p className="text-[10px] text-[#d9b66d] truncate">
                            {photo.likesCount} voti ricevuti
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={saving}
                          className="px-3 py-1.5 bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                          title="Elimina foto"
                        >
                          <Trash2 size={14} /> Elimina
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Controllo Azzera Voti Foto */}
            {adminPhotos.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/60">
                  Totale scatti attivi stasera: <strong className="text-[#f4e0ad]">{adminPhotos.length}</strong>
                </p>
                <button
                  type="button"
                  onClick={handleResetPhotoLikes}
                  disabled={saving}
                  className="px-4 py-2 bg-red-950/60 border border-red-500/40 text-red-300 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-red-900/60 transition-colors cursor-pointer"
                >
                  <RotateCcw size={15} /> Azzera Voti Foto
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
