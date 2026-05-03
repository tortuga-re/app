"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { triggerHaptic } from "@/lib/haptics";
import { StatusBlock } from "@/components/status-block";
import { Camera, Upload, CheckCircle2, ChevronLeft, Wallet } from "lucide-react";

export default function CaricaScontrinoPage() {
  const router = useRouter();
  const { identity } = useCustomerIdentity();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !amount || !identity.email) {
      setResult({ error: "Inserisci l'importo e carica la foto dello scontrino." });
      return;
    }

    triggerHaptic();
    setIsSubmitting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("photo", photo);
      formData.append("amount", amount);
      formData.append("email", identity.email);
      // If customer identity has a code, we could add it, but email is primary for lookup
      
      const res = await fetch("/api/receipts/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true });
        // Clear form after delay or redirect
        setTimeout(() => {
          router.push("/ciurma");
        }, 3000);
      } else {
        setResult({ error: data.error || "Errore durante l'invio dello scontrino." });
      }
    } catch (err) {
      setResult({ error: "Errore di connessione. Riprova tra poco." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div className="mx-auto max-w-md p-6 space-y-8 animate-in fade-in zoom-in duration-500">
        <StatusBlock
          variant="info"
          title="Bottino Ricevuto! 🏴‍☠️"
          description="Abbiamo preso in carico il tuo scontrino. Un capitano lo verificherà e i punti verranno accreditati a breve sulla tua card."
        />
        <div className="text-center pt-4">
          <CheckCircle2 className="w-20 h-20 text-[var(--accent-strong)] mx-auto mb-6 opacity-80" />
          <Link href="/ciurma" className="button-primary px-8 py-3 inline-block">
            Torna alla Ciurma
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-8 pb-24">
      <header className="space-y-2">
        <Link 
          href="/ciurma" 
          className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline"
        >
          <ChevronLeft className="w-3 h-3" /> Torna alla Ciurma
        </Link>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
          Carica Scontrino
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Invia la foto del tuo scontrino per accumulare punti sulla tua card fedeltà.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Immagine Upload */}
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)] px-1">
            Foto dello scontrino
          </label>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative aspect-[4/5] rounded-[2.5rem] border-2 border-dashed 
              flex flex-col items-center justify-center overflow-hidden cursor-pointer
              transition-all duration-300
              ${preview ? 'border-[var(--accent-strong)]/50' : 'border-white/10 hover:border-white/20 bg-white/5'}
            `}
          >
            {preview ? (
              <>
                <img src={preview} alt="Anteprima scontrino" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white font-bold text-sm bg-black/60 px-4 py-2 rounded-full">Cambia Foto</p>
                </div>
              </>
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)]/10 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-[var(--accent-strong)]" />
                </div>
                <div>
                  <p className="text-white font-bold">Scatta o Carica</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">Assicurati che l'importo e la data siano leggibili</p>
                </div>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>

        {/* Importo */}
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)] px-1">
              Importo speso (€)
            </span>
            <div className="relative">
              <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--accent-strong)] opacity-50" />
              <input
                type="number"
                step="0.01"
                className="field pl-12 text-xl font-bold"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </label>
        </div>

        {result?.error && (
          <StatusBlock
            variant="error"
            title="Mille bende!"
            description={result.error}
          />
        )}

        <button
          type="submit"
          disabled={isSubmitting || !photo || !amount}
          className="button-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-black/40 disabled:opacity-50 disabled:grayscale"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Inviando...
            </span>
          ) : (
            "Invia Scontrino 🏴‍☠️"
          )}
        </button>
      </form>
    </div>
  );
}
