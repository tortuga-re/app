"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MatchDrinkShell } from "@/components/match-drink/MatchDrinkShell";
import { MatchDrinkCard } from "@/components/match-drink/MatchDrinkCard";
import { MatchDrinkRevealCard } from "@/components/match-drink/MatchDrinkRevealCard";
import { MatchDrinkButton } from "@/components/match-drink/MatchDrinkButton";

type PreviewPreset = {
  label: string;
  selfNickname: string;
  matchNickname: string;
  selfMainCategoryLabel: string;
  matchMainCategoryLabel: string;
  matchSecondaryTraitLabel: string;
  matchedAvatarInitial: string;
  tableNumber: string;
  tableArea: string;
  score: number;
  commonCriterion: string;
  mainReason: string;
  spicyQuestion?: string;
  spicyAnswer?: string;
  rewardText: string;
  approachAdvice: string;
  matchPhone: string;
};

const toPluralCategory = (label: string) => {
  const map: Record<string, string> = {
    Romantico: "ROMANTICI",
    Romantica: "ROMANTICHE",
    Piccante: "PICCANTI",
    Piccanti: "PICCANTI",
    Passionale: "PASSIONALI",
    Energico: "ENERGICI",
    Energica: "ENERGICHE",
  };

  return map[label] || label.toUpperCase();
};

const PRESETS: PreviewPreset[] = [
  {
    label: "Romance",
    selfNickname: "Andrea",
    matchNickname: "Chiara",
    selfMainCategoryLabel: "Romantico",
    matchMainCategoryLabel: "Romantica",
    matchSecondaryTraitLabel: "Fedele",
    matchedAvatarInitial: "C",
    tableNumber: "12",
    tableArea: "Sala Centrale",
    score: 91,
    commonCriterion: "Siete entrambi Romantici",
    mainReason:
      "Avete una vibrazione di base simile: Romantico Timido e Romantica Fedele. Il Capitano vuole vedere come va a finire dal vivo.",
    spicyQuestion: "Se la serata fosse una rotta, quale sarebbe?",
    spicyAnswer: "Una rotta tranquilla ma con un po' di vento buono.",
    rewardText: "Accomodati al tavolo 12 in Sala Centrale e richiedi il tuo drink omaggio.",
    approachAdvice:
      "Funziona meglio essere autentici: una frase sincera, un sorriso vero e zero teatrini inutili.",
    matchPhone: "+39 340 910 9318",
  },
  {
    label: "Piccante",
    selfNickname: "Marco",
    matchNickname: "Sara",
    selfMainCategoryLabel: "Piccante",
    matchMainCategoryLabel: "Piccante",
    matchSecondaryTraitLabel: "Diretta",
    matchedAvatarInitial: "S",
    tableNumber: "7",
    tableArea: "Soppalco",
    score: 84,
    commonCriterion: "Curiosita reciproca",
    mainReason:
      "Tra Diretto e Ironico c'e il potenziale per una serata meno prevedibile del solito.",
    spicyQuestion: "Cosa ti conquista al primo sguardo?",
    spicyAnswer: "Una battuta intelligente e un sorriso che non si prende troppo sul serio.",
    rewardText: "Accomodati al tavolo 7 in Soppalco e richiedi il tuo drink omaggio.",
    approachAdvice: "Qui i giri larghi servono poco. Sii chiaro, sorridi e vai al punto.",
    matchPhone: "+39 331 445 7788",
  },
  {
    label: "Energico",
    selfNickname: "Vale",
    matchNickname: "Nico",
    selfMainCategoryLabel: "Energico",
    matchMainCategoryLabel: "Energico",
    matchSecondaryTraitLabel: "Libero",
    matchedAvatarInitial: "N",
    tableNumber: "16",
    tableArea: "Galeone",
    score: 77,
    commonCriterion: "Siete entrambi Energici",
    mainReason:
      "Avete una vibrazione di base simile: Energico Caotico e Energica Libera. Il Capitano vuole vedere come va a finire dal vivo.",
    spicyQuestion: "Che tipo di serata vuoi?",
    spicyAnswer: "Quella che inizia tranquilla e finisce con tre risate di fila.",
    rewardText: "Accomodati al tavolo 16 in Galeone e richiedi il tuo drink omaggio.",
    approachAdvice: "Non cercare di controllare la conversazione. Segui il ritmo e rilancia.",
    matchPhone: "+39 347 220 1188",
  },
];

export default function MatchDrinkPreviewPage() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const preset = PRESETS[presetIndex];
  const matchedNickname = preset.matchNickname;

  return (
    <MatchDrinkShell maxWidth="max-w-5xl">
      <Link
        href="/admin/match-drink"
        className="mb-6 flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline"
      >
        <ChevronLeft className="h-3 w-3" /> Torna a Match & Drink
      </Link>

      <div className="space-y-6 pb-20">
        <MatchDrinkCard variant="accent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">Anteprima cliente</p>
              <h1 className="text-3xl font-black uppercase italic text-white">Match accettato da entrambi</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((item, index) => (
                <MatchDrinkButton
                  key={item.label}
                  variant={presetIndex === index ? "primary" : "secondary"}
                  size="md"
                  onClick={() => setPresetIndex(index)}
                >
                  {item.label}
                </MatchDrinkButton>
              ))}
            </div>
          </div>
        </MatchDrinkCard>
        <MatchDrinkRevealCard
          nickname={matchedNickname}
          avatarInitial={preset.matchedAvatarInitial}
          tableNumber={preset.tableNumber}
          tableArea={preset.tableArea}
          categoryKey={preset.selfMainCategoryLabel === "Romantico"
            ? "romantico"
            : preset.selfMainCategoryLabel === "Piccante"
              ? "piccante"
              : preset.selfMainCategoryLabel === "Passionale"
                ? "passionale"
                : "energico"}
          categorySummary={`Siete entrambi ${toPluralCategory(preset.selfMainCategoryLabel)}.`}
          secondaryTraitLabel={preset.matchSecondaryTraitLabel}
          approachAdvice={preset.approachAdvice}
          rewardText={preset.rewardText}
          onAvatarClick={() => setAvatarZoomOpen(true)}
        />

        <MatchDrinkCard>
          <h2 className="eyebrow mb-4">Dettagli Match</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Criterio</p>
              <p className="mt-1 text-sm font-bold text-white">{preset.commonCriterion}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Compatibilità</p>
              <p className="mt-1 text-sm font-bold text-white">{preset.score}%</p>
            </div>
          </div>
        </MatchDrinkCard>

        {avatarZoomOpen ? (
          <button
            type="button"
            onClick={() => setAvatarZoomOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            aria-label="Chiudi avatar ingrandito"
          >
            <div className="flex h-[min(80vw,28rem)] w-[min(80vw,28rem)] items-center justify-center overflow-hidden rounded-full border-4 border-[var(--accent-strong)] bg-black shadow-[0_0_60px_rgba(216,176,106,0.35)]">
              <span className="text-[8rem] font-black uppercase italic gold-gradient">
                {preset.matchedAvatarInitial}
              </span>
            </div>
          </button>
        ) : null}
      </div>
    </MatchDrinkShell>
  );
}







