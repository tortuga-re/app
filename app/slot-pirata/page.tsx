"use client";

import { useState } from "react";
import { Skull } from "lucide-react";

import { PirateSlotModal } from "@/features/pirate-slot/components/PirateSlotModal";

export default function PirateSlotPreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <main className="flex min-h-[65dvh] items-center justify-center px-2 py-8">
      <div className="w-full max-w-sm rounded-[1.6rem] border border-[var(--border)] bg-[#fffdf8] p-6 text-center shadow-[0_18px_45px_rgba(45,35,23,.12)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#171916] text-[#d7b36a]">
          <Skull aria-hidden="true" />
        </span>
        <p className="minimal-eyebrow mt-4">Anteprima isolata</p>
        <h1 className="mt-2 font-serif text-3xl text-[var(--text)]">Slot Pirata</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Questa pagina serve solo a provare la grafica del popup. Non è collegata ai flussi cliente.
        </p>
        <button type="button" className="minimal-primary mt-6 w-full" onClick={() => setOpen(true)}>
          Apri Slot Pirata
        </button>
      </div>

      <PirateSlotModal open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
