"use client";

import { useEffect, useState } from "react";
import { Vote, ChevronRight, Check, X, ShieldAlert, Sparkles, User, Mail, AlertCircle } from "lucide-react";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { getSupabase } from "@/lib/supabase/client";
import { getRankIndex, tortugaRanks } from "@/lib/loyalty-ranks";
import type { CiurmaSurveyState, CiurmaMinRank } from "@/lib/serata-live/types";

const minRankMap: Record<CiurmaMinRank, number> = {
  tutti: -1,
  bucaniere: 0,
  corsaro: 1,
  capitano: 2,
  leggenda: 3,
};

const rankLabels: Record<CiurmaMinRank, string> = {
  tutti: "Tutti i pirati",
  bucaniere: "Bucaniere",
  corsaro: "Corsaro",
  capitano: "Capitano",
  leggenda: "Leggenda",
};

export function CiurmaSurveySection({ placement = "ciurma_home" }: { placement?: "ciurma_home" | "serata" }) {
  const [survey, setSurvey] = useState<CiurmaSurveyState | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchSurvey = async () => {
    try {
      const res = await fetch("/api/serata-live/sondaggi", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.survey) {
          setSurvey(data.survey);
        }
      }
    } catch (err) {
      console.error("Errore caricamento sondaggio:", err);
    }
  };

  useEffect(() => {
    void fetchSurvey();

    // Listen to live survey updates via Supabase Realtime WebSockets
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel(`serata_live_survey_${placement}`)
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
                if (parsed.survey) {
                  setSurvey(parsed.survey);
                }
              } catch {
                void fetchSurvey();
              }
            } else {
              void fetchSurvey();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime survey channel fallback:", err);
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetchSurvey();
      }
    }, 15000);

    const handleFocus = () => void fetchSurvey();
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
  }, [placement]);

  if (!survey || !survey.enabled) {
    return null;
  }

  // Check target placement matching
  const isAllowedPlacement =
    survey.targetPlacement === "entrambi" ||
    (placement === "ciurma_home" && (survey.targetPlacement === "ciurma_home" || !survey.targetPlacement)) ||
    (placement === "serata" && survey.targetPlacement === "serata");

  if (!isAllowedPlacement) {
    return null;
  }

  // Check scheduling date range if dates are specified
  const now = Date.now();
  if (survey.startDate) {
    const start = new Date(survey.startDate).getTime();
    if (!Number.isNaN(start) && now < start) {
      return null;
    }
  }
  if (survey.endDate) {
    const end = new Date(survey.endDate).getTime();
    if (!Number.isNaN(end) && now > end) {
      return null;
    }
  }

  return (
    <>
      <section className="loyalty-summary my-4 animate-in fade-in duration-300">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full text-left transition-all group cursor-pointer flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[rgba(165,43,43,.2)] flex items-center justify-center text-[var(--accent-strong)] shrink-0 group-hover:scale-105 transition-transform">
              <Vote size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a52b2b] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#a52b2b]" />
                </span>
                <p className="minimal-eyebrow">Sondaggio in Corso</p>
              </div>
              <h3 className="font-bold text-[var(--text)] text-sm sm:text-base leading-snug truncate group-hover:text-[var(--accent-strong)] transition-colors mt-0.5">
                {survey.question}
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                Esprimi la tua opinione e vota con la ciurma!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[var(--accent-strong)] font-bold text-xs">
            <span className="hidden sm:inline">Partecipa</span>
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </section>

      {showModal ? (
        <CiurmaSurveyModal
          survey={survey}
          onClose={() => setShowModal(false)}
          onSurveyUpdated={(updated) => setSurvey(updated)}
        />
      ) : null}
    </>
  );
}

function CiurmaSurveyModal({
  survey,
  onClose,
  onSurveyUpdated,
}: {
  survey: CiurmaSurveyState;
  onClose: () => void;
  onSurveyUpdated: (updated: CiurmaSurveyState) => void;
}) {
  const { identity, setIdentityFromEmail } = useCustomerIdentity();
  const customer = useCurrentCustomerStatus();
  const { scenario } = useDemoScenario();
  
  const visits = scenario.enabled ? scenario.visits : customer.visits;
  const points = scenario.enabled ? scenario.points : customer.points;

  // Determine user rank index
  let userRankIndex = -1;
  if (identity.email) {
    for (let i = tortugaRanks.length - 1; i >= 0; i--) {
      if (visits >= tortugaRanks[i].visits && points >= tortugaRanks[i].points) {
        userRankIndex = i;
        break;
      }
    }
  }

  const requiredMinRankIndex = minRankMap[survey.minRank ?? "tutti"];
  const isRankAllowed = userRankIndex >= requiredMinRankIndex;
  const requiredRankName = rankLabels[survey.minRank ?? "tutti"];

  const userEmail = identity.email?.trim().toLowerCase();
  const userHasVoted = userEmail ? survey.options.some((o) => o.voterIds.includes(userEmail)) : false;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    userEmail ? survey.options.find((o) => o.voterIds.includes(userEmail))?.id ?? null : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quick Login form for unauthenticated users
  const [showLogin, setShowLogin] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleVoteSubmit = async () => {
    if (!selectedOptionId) return;

    if (!userEmail) {
      setShowLogin(true);
      return;
    }

    if (!isRankAllowed) {
      setErrorMsg(`Sondaggio riservato ai pirati con rango ${requiredRankName} o superiore.`);
      return;
    }

    await executeVote(selectedOptionId, userEmail);
  };

  const executeVote = async (optionId: string, userIdentifier: string) => {
    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await fetch("/api/serata-live/sondaggi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId,
          userIdentifier,
          userVisits: visits,
          userPoints: points,
        }),
      });

      const data = await res.json();
      if (res.ok && data.survey) {
        onSurveyUpdated(data.survey);
      } else {
        setErrorMsg(data.error || "Impossibile registrare il voto.");
      }
    } catch (err) {
      console.error("Errore invio voto sondaggio:", err);
      setErrorMsg("Errore di rete durante l'invio del voto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim() || !loginEmail.includes("@")) {
      setLoginError("Inserisci un'e-mail valida.");
      return;
    }

    const success = setIdentityFromEmail(loginEmail.trim(), {
      firstName: loginName.trim() || undefined,
    });

    if (success) {
      setShowLogin(false);
      if (selectedOptionId) {
        await executeVote(selectedOptionId, loginEmail.trim().toLowerCase());
      }
    } else {
      setLoginError("Indirizzo e-mail non valido.");
    }
  };

  const totalVotes = survey.options.reduce((acc, o) => acc + o.votesCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-[#fffdf8] border border-[rgba(40,35,28,.2)] p-6 shadow-2xl text-[var(--text)] space-y-5 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#f3ecdf] hover:bg-[#ebe2d2] flex items-center justify-center text-[var(--text-muted)]"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-6">
          <p className="minimal-eyebrow flex items-center gap-1.5">
            <Vote size={14} /> Sondaggio della Ciurma
          </p>
          <h2 className="text-xl font-bold text-[var(--text)] leading-tight">{survey.question}</h2>
          {survey.description ? <p className="text-xs text-[var(--text-muted)]">{survey.description}</p> : null}
        </div>

        {/* Rank Restriction Warning Banner */}
        {identity.email && !isRankAllowed ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-3">
            <ShieldAlert size={20} className="text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">Accesso Limitato</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Questo sondaggio è riservato ai pirati con rango <strong>{requiredRankName}</strong> o superiore.
              </p>
            </div>
          </div>
        ) : null}

        {errorMsg ? (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Login prompt form inside modal */}
        {showLogin ? (
          <div className="p-4 rounded-2xl bg-[#f2ebdf] border border-[rgba(40,35,28,.16)] space-y-3">
            <div className="text-center space-y-1">
              <h4 className="font-bold text-sm text-[var(--text)]">Accedi per votare</h4>
              <p className="text-[11px] text-[var(--text-muted)]">Inserisci il tuo nome ed e-mail per partecipare al sondaggio</p>
            </div>
            {loginError ? <p className="text-xs text-red-600 text-center font-semibold">{loginError}</p> : null}
            <form onSubmit={handleLoginSubmit} className="space-y-2.5">
              <div className="relative">
                <User className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={15} />
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="w-full bg-[#fffdf8] border border-[rgba(40,35,28,.16)] rounded-2xl pl-10 pr-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={15} />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="La tua e-mail"
                  required
                  className="w-full bg-[#fffdf8] border border-[rgba(40,35,28,.16)] rounded-2xl pl-10 pr-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 py-2 rounded-2xl bg-[#fffdf8] text-xs font-bold text-[var(--text-muted)]"
                >
                  Annulla
                </button>
                <button type="submit" className="minimal-primary flex-1 py-2 text-xs font-bold">
                  Conferma e Vota
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Survey Options list */
          <div className="space-y-2.5">
            {survey.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const percentage = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;

              return (
                <div
                  key={option.id}
                  onClick={() => (isRankAllowed || !identity.email) && setSelectedOptionId(option.id)}
                  className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--text)] shadow-sm"
                      : "bg-[#f3ecdf] border-[rgba(40,35,28,.12)] hover:border-[var(--accent)]/40 text-[var(--text)]"
                  } ${!isRankAllowed && identity.email ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {/* Progress bar background */}
                  {totalVotes > 0 ? (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-[var(--accent)]/10 transition-all duration-500 pointer-events-none"
                      style={{ width: `${percentage}%` }}
                    />
                  ) : null}

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[rgba(40,35,28,.3)] bg-[#fffdf8]"
                        }`}
                      >
                        {isSelected ? <Check size={13} strokeWidth={3} /> : null}
                      </div>
                      <span className="font-bold text-sm text-[var(--text)] leading-snug">{option.text}</span>
                    </div>

                    <span className="text-xs font-mono font-bold text-[var(--accent-strong)] shrink-0">
                      {option.votesCount} ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col gap-2">
          {!showLogin ? (
            <button
              type="button"
              disabled={submitting || !selectedOptionId || (Boolean(identity.email) && !isRankAllowed)}
              onClick={handleVoteSubmit}
              className="minimal-primary w-full py-3.5 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              {submitting ? "Invio voto in corso..." : userHasVoted ? "Aggiorna il tuo voto" : "Invia il tuo Voto"}
            </button>
          ) : null}

          {!identity.email ? (
            <p className="text-xs text-center text-[var(--text-muted)] italic">
              Chiunque può leggere il sondaggio. Clicca &quot;Invia Voto&quot; per accedere!
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
