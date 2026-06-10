"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useMatchDrinkPlayer } from "@/lib/match-drink/use-match-drink-player";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { MatchDrinkShell } from "./MatchDrinkShell";
import { MatchDrinkCard } from "./MatchDrinkCard";
import { MatchDrinkButton } from "./MatchDrinkButton";
import { MatchDrinkRevealCard } from "./MatchDrinkRevealCard";
import { MatchDrinkPlayer } from "@/lib/match-drink/types";
import { getMainCategoryPluralLabel } from "@/lib/match-drink/profile";
import { LocalPirateAvatar } from "@/features/pirate-photo/components/LocalPirateAvatar";
import { QRScanner } from "@/components/QRScanner";
import { useCustomerIdentity, normalizeCustomerEmail } from "@/lib/customer-identity";
import { scrollToFormField } from "@/lib/form-focus";

export function MatchDrinkPlayerController() {
  const { identity } = useCustomerIdentity();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const {
    session,
    player,
    myMatch,
    myAnswers,
    loading,
    error,
    savedProfile,
    join,
    submitAnswer,
    respondToMatch,
    sendMessage,
    setSavedProfile,
  } = useMatchDrinkPlayer();
  const { hasAccess: isPresent } = useOnPremiseAccess();

  useEffect(() => {
    const email = normalizeCustomerEmail(identity.email);

    if (!email || (profileAvatarUrl && profileFullName)) {
      return;
    }

    let cancelled = false;

    const loadAvatar = async () => {
      try {
        const response = await fetch(`/api/profile?mode=email&query=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const avatarUrl = typeof data?.avatarUrl === "string" ? data.avatarUrl.trim() : "";
        const firstName = typeof data?.contact?.Nome === "string" ? data.contact.Nome.trim() : "";
        const lastName = typeof data?.contact?.Cognome === "string" ? data.contact.Cognome.trim() : "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

        if (!cancelled && (avatarUrl || fullName)) {
          if (avatarUrl) {
            setProfileAvatarUrl(avatarUrl);
          }
          if (fullName) {
            setProfileFullName(fullName);
          }
          setSavedProfile((current) => {
            const currentNickname = current?.nickname?.trim() || "";
            const nextNickname = currentNickname || fullName;

            if (current) {
              return {
                ...current,
                nickname: nextNickname || current.nickname,
                avatarUrl: avatarUrl || current.avatarUrl,
              };
            }

            return {
              nickname: nextNickname || "",
              tableNumber: "",
              ageRange: "25-34",
              gender: "donna",
              relationshipStatus: "single",
              lookingFor: "entrambi",
              avatarUrl: avatarUrl || undefined,
            };
          });
        }
      } catch (error) {
        console.error("Error loading Match & Drink avatar", error);
      }
    };

    void loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [identity.email, profileAvatarUrl, profileFullName, setSavedProfile]);

  if (loading) {
    return (
      <MatchDrinkShell>
        <div className="flex flex-1 items-center justify-center">
          <p className="eyebrow animate-pulse">Caricamento in corso...</p>
        </div>
      </MatchDrinkShell>
    );
  }

  if (!session) {
    return (
      <MatchDrinkShell>
        <div className="flex flex-1 items-center justify-center text-center p-8">
          <div className="space-y-6 animate-in fade-in zoom-in duration-700">
            <h1 className="text-4xl font-black gold-gradient uppercase italic">Match & Drink</h1>
            <div className="space-y-2">
              <p className="text-xl font-bold text-white uppercase tracking-widest">In attesa del Capitano...</p>
              <p className="text-sm text-[var(--text-muted)]">La sfida non è ancora iniziata. Torna tra poco o tieni aperta questa pagina.</p>
            </div>
            <div className="flex justify-center gap-2 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-[var(--accent-strong)] animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </MatchDrinkShell>
    );
  }

  if (!player) {
    if (!isPresent) {
      return (
        <MatchDrinkShell>
          <div className="flex flex-1 items-center justify-center p-6">
            <MatchDrinkCard className="text-center space-y-6">
              {showQRScanner ? (
                <QRScanner
                  onSuccess={(table) => {
                    if (table) {
                      setSavedProfile(prev => ({
                        nickname: prev?.nickname || "",
                        ageRange: prev?.ageRange || "25-34",
                        gender: prev?.gender || "donna",
                        relationshipStatus: prev?.relationshipStatus || "single",
                        lookingFor: prev?.lookingFor || "entrambi",
                        ...prev,
                        tableNumber: table
                      }));
                    }
                    setShowQRScanner(false);
                  }}
                  onCancel={() => setShowQRScanner(false)}
                />
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                    <span className="text-3xl">ðŸ“</span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white uppercase italic">Sei al Tortuga?</h2>
                    <p className="text-sm text-[var(--text-muted)] uppercase font-bold">Accesso limitato ai presenti</p>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    Per partecipare al Match & Drink devi essere fisicamente nel locale.
                    Scannerizza il QR code sul tuo tavolo per sbloccare l&apos;accesso!
                  </p>
                  <div className="pt-2 flex flex-col gap-3">
                    <MatchDrinkButton
                      size="lg"
                      className="w-full"
                      onClick={() => setShowQRScanner(true)}
                    >
                      ðŸ“· Scannerizza QR Tavolo
                    </MatchDrinkButton>
                    <Link href="/ciurma" className="button-secondary block w-full py-3 text-xs font-black uppercase">
                      Torna alla Ciurma
                    </Link>
                  </div>
                </>
              )}
            </MatchDrinkCard>
          </div>
        </MatchDrinkShell>
      );
    }
    if (session.status !== "lobby") {
      return (
        <MatchDrinkShell>
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <MatchDrinkCard className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-3xl">â›”</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic">Iscrizioni Chiuse</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed uppercase font-bold">
                Il Capitano ha già  levato l&apos;ancora!<br />
                Non puoi pià¹ unirti a questa sfida, ma resta nei paraggi per la prossima.
              </p>
              <Link href="/ciurma" className="button-secondary block w-full py-3 text-xs font-black uppercase mt-4">
                Torna alla Ciurma
              </Link>
            </MatchDrinkCard>
          </div>
        </MatchDrinkShell>
      );
    }
    return (
      <JoinForm
        onJoin={join}
        error={error}
        savedProfile={savedProfile}
      />
    );
  }

  // Lobby
  if (session.status === "lobby") {
    const participantCount = session.participantCount ?? 1;
    const departureHint =
      participantCount < 5
        ? "Mancano pochi pirati alla partenza"
        : "La ciurma è quasi pronta alla partenza";

    return (
      <MatchDrinkShell>
        <div className="space-y-6">
          <MatchDrinkCard variant="accent" className="overflow-hidden text-center">
            <div className="space-y-5 animate-in fade-in zoom-in duration-700">
              <div className="space-y-2">
                <p className="eyebrow">Sei nella lista del Capitano</p>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                  {session.title}
                </h1>
                <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-strong)]">
                  {departureHint}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4">
                  <p className="text-3xl font-black gold-gradient">{participantCount}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    a bordo
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                  <p className="text-lg font-black text-white">OK</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    iscrizione
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                  <p className="text-lg font-black text-white">LIVE</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    domande
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                Il Capitano sta formando la ciurma: tra poco partono domande,
                brindisi e abbinamenti. Tieni il telefono pronto.
              </p>
            </div>
          </MatchDrinkCard>
          
          {session.bottleMessagesEnabled ? (
            <BottleMessageForm
              onSend={sendMessage}
              draftKey={`match-drink.bottleMessage.${player.id}`}
            />
          ) : (
            <MatchDrinkCard variant="muted" className="py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">I messaggi in bottiglia sono attualmente chiusi</p>
            </MatchDrinkCard>
          )}
        </div>
      </MatchDrinkShell>
    );
  }

  // Question Pad
  if (session.status === "playing") {
    const questions = session.questions || [];
    const currentQuestion = questions[session.currentQuestionIndex];
    
    if (!currentQuestion) {
       return (
        <MatchDrinkShell>
          <div className="flex flex-1 items-center justify-center">
            <p className="eyebrow animate-pulse">In attesa della domanda...</p>
          </div>
        </MatchDrinkShell>
      );
    }

    const hasAnswered = myAnswers.some(a => a.questionId === currentQuestion?.id);
    // Filtra le opzioni della domanda reale
    const availableOptions = currentQuestion.options.map(o => o.id);

    return (
      <MatchDrinkShell>
        <div className="space-y-6">
          <MatchDrinkCard variant="accent">
            <p className="eyebrow mb-2">Domanda {session.currentQuestionIndex + 1}</p>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
              Guarda lo schermo e scegli la tua risposta
            </h2>
          </MatchDrinkCard>

          {hasAnswered ? (
            <MatchDrinkCard variant="muted" className="text-center py-12">
              <p className="text-lg font-bold text-[var(--accent-strong)] uppercase">Risposta registrata.</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Il Capitano sta giudicando le tue scelte di vita.</p>
            </MatchDrinkCard>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {availableOptions.map((opt) => (
                <MatchDrinkButton
                  key={opt}
                  variant="primary"
                  size="xl"
                  onClick={() => submitAnswer(currentQuestion.id, opt)}
                >
                  {opt}
                </MatchDrinkButton>
              ))}
            </div>
          )}
          
          {session.bottleMessagesEnabled ? (
            <BottleMessageForm
              onSend={sendMessage}
              draftKey={`match-drink.bottleMessage.${player.id}`}
            />
          ) : (
            <MatchDrinkCard variant="muted" className="py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">I messaggi in bottiglia sono attualmente chiusi</p>
            </MatchDrinkCard>
          )}
        </div>
      </MatchDrinkShell>
    );
  }

  // Matching / Suspense
  if (session.status === "matching") {
    return (
      <MatchDrinkShell>
        <div className="flex flex-1 items-center justify-center text-center">
          <div className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full border-2 border-[var(--accent-strong)] animate-spin border-t-transparent" />
            <p className="text-lg font-bold text-white uppercase tracking-tight">
              Il sistema sta incrociando risposte, traumi e pessime decisioniâ€¦
            </p>
          </div>
        </div>
      </MatchDrinkShell>
    );
  }

  // Reveal
  if (session.status === "reveal") {
    if (!myMatch) {
      return (
        <MatchDrinkShell>
          <div className="flex flex-1 items-center justify-center p-4">
            <MatchDrinkCard className="text-center py-16 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <span className="text-4xl italic">â˜ ï¸</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Nessun Match sicuro</h2>
                <p className="text-sm text-[var(--accent-strong)] font-bold uppercase tracking-widest">Naufragio in solitaria</p>
              </div>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed uppercase font-bold">
                A volte anche il sistema del Capitano preferisce non prendersi responsabilit&agrave;.<br /><br />
                Goditi il drink con la tua ciurma attuale e tieni d&apos;occhio lo schermo per i prossimi giochi!
              </p>
              <div className="pt-6">
                <MatchDrinkButton variant="secondary" onClick={() => window.location.reload()} size="md">
                  AGGIORNA PAGINA
                </MatchDrinkButton>
              </div>
            </MatchDrinkCard>
          </div>
        </MatchDrinkShell>
      );
    }

    const isPlayerA = myMatch.playerAId === player.id;
    const iAccepted = isPlayerA ? myMatch.acceptedByA : myMatch.acceptedByB;
    const matchedNickname =
      myMatch.matchedPlayerNickname ||
      (isPlayerA ? myMatch.playerBNickname : myMatch.playerANickname) ||
      "il tuo match";
    const meetingTableNumber = myMatch.meetingTableNumber || "?";
    const meetingTableArea = myMatch.meetingTableArea || "";
    const meetingTableLabel =
      myMatch.meetingTableLabel ||
      (meetingTableArea ? `${meetingTableNumber} in ${meetingTableArea}` : meetingTableNumber);
    const matchedAvatar = isPlayerA ? myMatch.playerBAvatar : myMatch.playerAAvatar;
    const categoryKey = (myMatch.sharedMainCategory || myMatch.ownMainCategory || "romantico") as
      | "romantico"
      | "passionale"
      | "piccante"
      | "energico";
    const categorySummary = myMatch.sharedMainCategoryLabel
      ? `Siete entrambi ${myMatch.sharedMainCategoryLabel}.`
      : myMatch.ownMainCategoryLabel
        ? `Siete entrambi ${getMainCategoryPluralLabel(myMatch.ownMainCategory!).toUpperCase()}.`
        : null;

    let mainReason = myMatch.reason;
    let spicyQ: string | null = null;
    let spicyA: string | null = null;

    if (myMatch.reason.includes("|SPICY_Q|")) {
      const parts = myMatch.reason.split("|SPICY_Q|");
      mainReason = parts[0];
      const spicyParts = parts[1].split("|SPICY_A|");
      if (spicyParts.length === 2) {
        spicyQ = spicyParts[0];
        spicyA = spicyParts[1];
      }
    }

    const isFriendshipGroup = Boolean(myMatch.isFriendshipGroup);
    const groupMembers = myMatch.friendshipGroupMembers ?? [];
    const otherGroupMembers = groupMembers.filter((member) => member.id !== player.id);
    const groupSize = myMatch.friendshipGroupSize ?? groupMembers.length;

    if (isFriendshipGroup && myMatch.drinkUnlocked) {
      return (
        <MatchDrinkShell>
          <div className="space-y-6 animate-in fade-in zoom-in duration-700">
            <MatchDrinkCard variant="accent" className="overflow-hidden text-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="eyebrow">Ciurma confermata.</p>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                    Il tavolo friendship è tuo
                  </h2>
                  <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-strong)]">
                    Tavolo {meetingTableLabel}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex w-24 flex-col items-center gap-2">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-strong)] bg-black/40 shadow-[0_0_25px_rgba(216,176,106,0.22)]">
                        {member.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-black uppercase italic gold-gradient">
                            {member.nickname[0] || "?"}
                          </span>
                        )}
                      </div>
                      <p className="w-full truncate text-xs font-black uppercase text-white">
                        {member.id === player.id ? "Tu" : member.nickname}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                  <p className="eyebrow mb-2">Motivo del tavolo</p>
                  <p className="text-sm leading-relaxed text-white">&quot;{mainReason}&quot;</p>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--accent-strong)]/30 bg-[var(--accent-strong)]/10 px-5 py-4">
                  <p className="text-sm font-bold leading-relaxed text-[var(--accent-strong)]">
                    {myMatch.rewardText || `Raggiungi il tavolo ${meetingTableLabel} e richiedi il drink della ciurma.`}
                  </p>
                </div>
              </div>
            </MatchDrinkCard>
          </div>
        </MatchDrinkShell>
      );
    }

    if (!isFriendshipGroup && myMatch.drinkUnlocked) {
      return (
        <MatchDrinkShell>
          <MatchDrinkRevealCard
            nickname={matchedNickname}
            avatarUrl={matchedAvatar}
            avatarInitial={matchedNickname[0] || "?"}
            tableNumber={meetingTableNumber}
            tableArea={meetingTableArea}
            categoryKey={categoryKey}
            categorySummary={categorySummary}
            secondaryTraitLabel={myMatch.matchedPlayerSecondaryTraitLabel || "misterioso"}
            approachAdvice={
              myMatch.matchedPlayerApproachAdvice ||
              "Fai il primo passo con leggerezza e lascia che il brindisi faccia il resto."
            }
            rewardText={
              myMatch.rewardText ||
              `Accomodati al tavolo ${meetingTableLabel} e richiedi il tuo drink omaggio.`
            }
            onAvatarClick={() => setAvatarZoomOpen(true)}
          />

          {avatarZoomOpen ? (
            <button
              type="button"
              onClick={() => setAvatarZoomOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
              aria-label="Chiudi avatar ingrandito"
            >
              <div className="flex h-[min(80vw,28rem)] w-[min(80vw,28rem)] items-center justify-center overflow-hidden rounded-full border-4 border-[var(--accent-strong)] bg-black shadow-[0_0_60px_rgba(216,176,106,0.35)]">
                {matchedAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={matchedAvatar}
                    alt="Avatar del match ingrandito"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[8rem] font-black uppercase italic gold-gradient">
                    {matchedNickname[0] || "?"}
                  </span>
                )}
              </div>
            </button>
          ) : null}
        </MatchDrinkShell>
      );
    }

    if (iAccepted === false) {
      return (
        <MatchDrinkShell>
          <MatchDrinkCard className="text-center">
            <h2 className="text-xl font-bold text-white uppercase">Va bene così.</h2>
            <p className="mt-4 text-[var(--text-muted)]">Il Capitano rispetta la fuga.</p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    if (isFriendshipGroup && iAccepted === true) {
      return (
        <MatchDrinkShell>
          <MatchDrinkCard className="text-center">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">
              Ciurma accettata.
            </h2>
            <p className="mt-4 text-[var(--text-muted)]">
              Stiamo preparando il tavolo friendship e il drink sbloccato.
            </p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    if (iAccepted === true) {
      return (
        <MatchDrinkShell>
          <MatchDrinkCard className="text-center">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Tu hai accettato.</h2>
            <p className="mt-4 text-[var(--text-muted)]">
              Ora aspettiamo l&apos;altra metà del naufragio. Se accetta anche lei/lui, sbloccherete i drink omaggio del match.
            </p>
          </MatchDrinkCard>
        </MatchDrinkShell>
      );
    }

    if (isFriendshipGroup) {
      return (
        <MatchDrinkShell>
          <div className="space-y-6 animate-in fade-in zoom-in duration-700">
            <MatchDrinkCard variant="accent" className="overflow-hidden text-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="eyebrow">Hai una ciurma!</p>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                    Il Capitano ti manda al tavolo friendship
                  </h2>
                  <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-strong)]">
                    {groupSize || 3} persone · Tavolo {meetingTableLabel}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {groupMembers.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex w-24 flex-col items-center gap-2"
                      style={{ animationDelay: `${index * 120}ms` }}
                    >
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-black/40 shadow-[0_0_22px_rgba(0,0,0,0.35)]">
                        {member.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-black uppercase italic gold-gradient">
                            {member.nickname[0] || "?"}
                          </span>
                        )}
                      </div>
                      <p className="w-full truncate text-xs font-black uppercase text-white">
                        {member.id === player.id ? "Tu" : member.nickname}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 text-left">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                    <p className="eyebrow mb-2">Compatibilità gruppo</p>
                    <p className="text-sm font-bold text-white">
                      {myMatch.score}% - {myMatch.commonCriterion}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                    <p className="eyebrow mb-2">Motivo del match</p>
                    <p className="text-sm leading-relaxed text-white">&quot;{mainReason}&quot;</p>
                  </div>

                  {otherGroupMembers.length > 0 ? (
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                      <p className="eyebrow mb-2">Ti aspettano</p>
                      <p className="text-sm font-bold uppercase tracking-wide text-white">
                        {otherGroupMembers.map((member) => member.nickname).join(", ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </MatchDrinkCard>

            <div className="flex flex-col gap-3">
              <MatchDrinkButton size="lg" onClick={() => respondToMatch(true)}>
                ACCETTO IL TAVOLO
              </MatchDrinkButton>
              <MatchDrinkButton variant="secondary" size="lg" onClick={() => respondToMatch(false)}>
                PASSO
              </MatchDrinkButton>
            </div>

            <p className="text-center text-[10px] text-[var(--text-muted)] px-4 uppercase font-bold tracking-widest leading-relaxed">
              Se accetti, sblocchi il drink e raggiungi la tua ciurma al tavolo friendship.
            </p>
          </div>
        </MatchDrinkShell>
      );
    }

    return (
      <MatchDrinkShell>
        <div className="space-y-6">
          <MatchDrinkCard variant="accent" className="text-center">
            <p className="eyebrow mb-2">Hai un abbinamento!</p>
            <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tighter">
              Il Capitano ha parlato.
            </h2>

            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Compatibilità</p>
                <p className="mt-1 text-white font-bold">
                  {myMatch?.score}% - {myMatch?.commonCriterion}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Cosa vi unisce</p>
                <p className="mt-1 text-white italic">&quot;{mainReason}&quot;</p>
              </div>

              {spicyQ ? (
                <div className="rounded-2xl border border-[var(--accent-strong)]/30 bg-[var(--accent-strong)]/10 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--accent-strong)] font-black flex items-center justify-center gap-2">
                    <span>🌶️</span> Avete dato la stessa risposta
                  </p>
                  <p className="mt-2 text-white font-bold">{spicyQ}</p>
                  <p className="text-[var(--accent-strong)] italic">&quot;{spicyA}&quot;</p>
                </div>
              ) : null}
            </div>
          </MatchDrinkCard>

          <div className="flex flex-col gap-3">
            <MatchDrinkButton size="lg" onClick={() => respondToMatch(true)}>
              SÌ, ACCETTO IL MATCH
            </MatchDrinkButton>
            <MatchDrinkButton variant="secondary" size="lg" onClick={() => respondToMatch(false)}>
              NO, RESTO NELL&apos;OMBRA
            </MatchDrinkButton>
          </div>

          <p className="text-center text-[10px] text-[var(--text-muted)] px-4 uppercase font-bold tracking-widest leading-relaxed">
            Se entrambi accettate, sbloccate i drink omaggio del vostro match.
          </p>
        </div>
      </MatchDrinkShell>
    );
  }

  return (
    <MatchDrinkShell>
      <MatchDrinkCard className="text-center">
        <h2 className="text-xl font-bold text-white uppercase">Match & Drink è finito.</h2>
        <p className="mt-4 text-[var(--text-muted)]">Se avete trovato l&apos;amore, bene. Se avete trovato un errore, almeno avete una storia da raccontare.</p>
      </MatchDrinkCard>
    </MatchDrinkShell>
  );
}

function JoinForm({ 
  onJoin, 
  error,
  savedProfile
}: { 
  onJoin: (nickname: string, details: {
    tableNumber: string;
    ageRange: MatchDrinkPlayer["ageRange"];
    gender: MatchDrinkPlayer["gender"];
    relationshipStatus: MatchDrinkPlayer["relationshipStatus"];
    lookingFor: MatchDrinkPlayer["lookingFor"];
    email?: string;
    phone?: string;
    publicConsent: boolean;
    avatarUrl?: string;
  }) => Promise<void>, 
  error: string | null,
  savedProfile?: {
    nickname: string;
    tableNumber: string;
    ageRange: MatchDrinkPlayer["ageRange"];
    gender: MatchDrinkPlayer["gender"];
    relationshipStatus: MatchDrinkPlayer["relationshipStatus"];
    lookingFor: MatchDrinkPlayer["lookingFor"];
    avatarUrl?: string;
  } | null
}) {
  const { identity } = useCustomerIdentity();
    const [nickname, setNickname] = useState(savedProfile?.nickname || "");
    const [tableNumber, setTableNumber] = useState(savedProfile?.tableNumber || "");
  const [ageRange, setAgeRange] = useState<MatchDrinkPlayer["ageRange"]>(savedProfile?.ageRange || "25-34");
  const [gender, setGender] = useState<MatchDrinkPlayer["gender"]>(savedProfile?.gender || "donna");
  const [relationshipStatus, setRelationshipStatus] = useState<MatchDrinkPlayer["relationshipStatus"]>(savedProfile?.relationshipStatus || "single");
  const [lookingFor, setLookingFor] = useState<MatchDrinkPlayer["lookingFor"]>(savedProfile?.lookingFor || "entrambi");
  const [avatarUrl, setAvatarUrl] = useState<string>(savedProfile?.avatarUrl || "");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"nickname" | "tableNumber", string>>
  >({});
  const userEditedRef = React.useRef(false);
  const nicknameFieldRef = React.useRef<HTMLInputElement | null>(null);
  const tableNumberFieldRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!savedProfile || userEditedRef.current) return;

    setNickname((current) => current || savedProfile.nickname || "");
    setTableNumber((current) => current || savedProfile.tableNumber || "");
    setAgeRange(savedProfile.ageRange || "25-34");
    setGender(savedProfile.gender || "donna");
    setRelationshipStatus(savedProfile.relationshipStatus || "single");
    setLookingFor(savedProfile.lookingFor || "entrambi");
    setAvatarUrl((current) => current || savedProfile.avatarUrl || "");
  }, [savedProfile]);

  const markUserEdited = () => {
    userEditedRef.current = true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: Partial<Record<"nickname" | "tableNumber", string>> = {};

    if (!nickname.trim()) {
      nextFieldErrors.nickname = "Inserisci il tuo nickname.";
    }

    if (!tableNumber.trim()) {
      nextFieldErrors.tableNumber = "Inserisci il numero del tavolo.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      scrollToFormField(
        nextFieldErrors.nickname ? nicknameFieldRef.current : tableNumberFieldRef.current,
      );
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    try {
      await onJoin(nickname, {
        tableNumber,
        ageRange,
        gender,
        relationshipStatus,
        lookingFor,
        email: identity.email,
        phone: identity.phone,
        avatarUrl,
        publicConsent: true
      });
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <MatchDrinkShell>
      <div className="space-y-6 pb-12">
        <div className="text-center">
          <h1 className="hero-title text-4xl font-black gold-gradient uppercase">Match & Drink</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--accent-strong)]">Il gioco live pià¹ pericolosamente social</p>
        </div>

            <MatchDrinkCard className="max-w-md w-full">
              <div className="flex flex-col items-center mb-8">
            <LocalPirateAvatar
              customerKey={nickname || savedProfile?.nickname || "ospite"}
              label={nickname || "Nuovo Pirata"}
              onUpload={(url) => {
                markUserEdited();
                setAvatarUrl(url);
              }}
            />
            <p className="text-xs uppercase tracking-widest text-[var(--accent-strong)] mt-3 font-black">Scatta la tua foto</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="eyebrow mb-2 block">Il tuo Nickname</label>
              <input 
                ref={nicknameFieldRef}
                value={nickname} 
                onChange={e => {
                  markUserEdited();
                  setFieldErrors((current) => ({ ...current, nickname: undefined }));
                  setNickname(e.target.value);
                }}
                placeholder="Nome da battaglia..." 
                className="field font-bold uppercase tracking-widest"
                required
              />
              {fieldErrors.nickname ? (
                <p className="mt-2 text-xs font-semibold text-red-400">
                  {fieldErrors.nickname}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="eyebrow mb-2 block">Tavolo</label>
                <input 
                  ref={tableNumberFieldRef}
                  value={tableNumber} 
                  onChange={e => {
                    markUserEdited();
                    setFieldErrors((current) => ({ ...current, tableNumber: undefined }));
                    setTableNumber(e.target.value);
                  }}
                  placeholder="Es. 12" 
                  className="field font-bold"
                  required
                />
                {fieldErrors.tableNumber ? (
                  <p className="mt-2 text-xs font-semibold text-red-400">
                    {fieldErrors.tableNumber}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="eyebrow mb-2 block">Età </label>
                <select 
                  value={ageRange} 
                  onChange={e => {
                    markUserEdited();
                    setAgeRange(e.target.value as MatchDrinkPlayer["ageRange"]);
                  }}
                  className="field font-bold"
                >
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-45">35-45</option>
                  <option value="46-plus">46+</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow mb-2 block">Sei</label>
                <select 
                  value={gender} 
                  onChange={e => {
                    markUserEdited();
                    setGender(e.target.value as MatchDrinkPlayer["gender"]);
                  }}
                  className="field font-bold"
                >
                  <option value="donna">Donna</option>
                  <option value="uomo">Uomo</option>
                </select>
              </div>
              <div>
                <label className="eyebrow mb-2 block">Stato</label>
                <select 
                  value={relationshipStatus} 
                  onChange={e => {
                    markUserEdited();
                    setRelationshipStatus(e.target.value as MatchDrinkPlayer["relationshipStatus"]);
                  }}
                  className="field font-bold"
                >
                  <option value="single">Single</option>
                  <option value="in_coppia">In coppia</option>
                  <option value="complicato">Complicato</option>
                  <option value="solo_per_ridere">Per ridere</option>
                </select>
              </div>
            </div>

            <div>
              <label className="eyebrow mb-2 block">Cosa cerchi stasera?</label>
              <select 
                value={lookingFor} 
                onChange={e => {
                  markUserEdited();
                  setLookingFor(e.target.value as MatchDrinkPlayer["lookingFor"]);
                }}
                className="field font-bold"
              >
                <option value="donna">Una Donna</option>
                <option value="uomo">Un Uomo</option>
                <option value="entrambi">Entrambi</option>
                <option value="amicizie">Solo nuove amicizie</option>
              </select>
            </div>


            {error && <p className="text-center text-sm text-red-400 font-medium">{error}</p>}

            <MatchDrinkButton type="submit" size="lg" className="w-full mt-4" loading={submitting}>
              SALI A BORDO
            </MatchDrinkButton>
          </form>
        </MatchDrinkCard>
      </div>
    </MatchDrinkShell>
  );
}

function BottleMessageForm({ 
  onSend,
  draftKey
}: { 
  onSend: (text: string, displayMode: "anonymous" | "nickname") => Promise<void>,
  draftKey?: string
}) {
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined" || !draftKey) return "";
    return localStorage.getItem(draftKey) ?? "";
  });
  const [anon, setAnon] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !draftKey) return;

    setMessage(localStorage.getItem(draftKey) ?? "");
  }, [draftKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !draftKey) return;

    if (message.trim()) {
      localStorage.setItem(draftKey, message);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      await onSend(message, anon ? "anonymous" : "nickname");
      if (typeof window !== "undefined" && draftKey) {
        localStorage.removeItem(draftKey);
      }
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'invio");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <MatchDrinkCard variant="muted">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Message in a Bottle</p>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${message.length > 280 ? 'text-orange-400' : 'text-[var(--text-muted)]'}`}>
              {message.length}/300
            </span>
            {sent && <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Inviato!</span>}
          </div>
        </div>
        {error && <p className="text-[10px] text-red-400 font-bold uppercase animate-pulse">{error}</p>}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Invia un messaggio al Capitano..."
          className="field min-h-[100px] resize-none py-3 text-sm font-bold uppercase"
          maxLength={300}
          required
        />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="anon" 
              checked={anon} 
              onChange={e => setAnon(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] bg-transparent accent-[var(--accent-strong)]"
            />
            <label htmlFor="anon" className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Anonimo</label>
          </div>
          <MatchDrinkButton type="submit" size="md" loading={sending} disabled={!message.trim()}>
            INVIA
          </MatchDrinkButton>
        </div>
      </form>
    </MatchDrinkCard>
  );
}
