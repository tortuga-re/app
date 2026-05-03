"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { isAdmin } from "@/lib/live-buzzer/admin";
import { triggerHaptic } from "@/lib/haptics";
import { StatusBlock } from "@/components/status-block";
import { ChevronLeft, Check, X, Eye, Receipt, User, Calendar, ExternalLink } from "lucide-react";
import type { ReceiptRequest } from "@/lib/receipts/supabase";

export default function AdminReceiptsPage() {
  const { identity } = useCustomerIdentity();
  const [requests, setRequests] = useState<ReceiptRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ReceiptRequest | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // In a real app, we'd have a specific API for listing pending requests
      // For now, we can use a direct Supabase call if we have permissions, 
      // or a dedicated API route. Let's create a quick API for listing if needed,
      // but for this implementation we'll use a fetch to a new route.
      const res = await fetch("/api/admin/receipts/list");
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Impossibile caricare le richieste.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    
    setProcessingId(selectedRequest.id);
    setError(null);
    triggerHaptic();

    try {
      const res = await fetch("/api/admin/receipts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequest.id,
          status,
          receiptNumber: status === 'approved' ? receiptNumber : undefined,
          adminNote,
          adminEmail: identity.email
        })
      });

      const data = await res.json();

      if (res.ok) {
        setRequests(requests.filter(r => r.id !== selectedRequest.id));
        setSelectedRequest(null);
        setReceiptNumber("");
        setAdminNote("");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Errore durante l'elaborazione.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin(identity.email)) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-500">Accesso Negato</h1>
        <p className="mt-4 text-gray-400">Solo i capitani possono accedere a questa plancia.</p>
        <Link href="/" className="mt-6 inline-block button-secondary px-6 py-2">Torna alla Home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8 pb-32">
      <header className="space-y-2">
        <Link 
          href="/ciurma" 
          className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent-strong)] hover:underline"
        >
          <ChevronLeft className="w-3 h-3" /> Torna alla Ciurma
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Gestione Scontrini
          </h1>
          <button 
            onClick={fetchRequests} 
            className="text-xs font-bold uppercase text-[var(--accent-strong)] bg-white/5 px-3 py-1 rounded-full"
          >
            Aggiorna
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Valida le richieste di accredito punti caricate dai clienti.
        </p>
      </header>

      {error && (
        <StatusBlock variant="error" title="Errore" description={error} />
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--accent-strong)]/20 border-t-[var(--accent-strong)] rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <StatusBlock 
          variant="empty" 
          title="Nessuna richiesta" 
          description="Al momento non ci sono scontrini in attesa di approvazione."
        />
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <div 
              key={req.id}
              onClick={() => setSelectedRequest(req)}
              className={`
                panel rounded-[1.5rem] p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-white/5
                ${selectedRequest?.id === req.id ? 'border-[var(--accent-strong)] bg-white/10' : 'border-white/5'}
              `}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                  <img src={req.image_url} alt="Scontrino" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{req.user_email}</p>
                  <p className="text-[var(--accent-strong)] font-black text-lg">€ {req.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {new Date(req.created_at).toLocaleDateString('it-IT')}
                </p>
                <div className="flex items-center gap-1 text-[var(--accent-strong)] mt-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Dettagli</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Side Panel for processing */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] w-full max-w-2xl max-h-[95vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white uppercase italic">Dettaglio Richiesta</h2>
              <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-full bg-white/5 text-white/50 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid sm:grid-cols-2 gap-8">
                {/* Visualizzazione Foto */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">Foto Scontrino</p>
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-black">
                    <a href={selectedRequest.image_url} target="_blank" rel="noreferrer" className="relative block w-full h-full">
                      <img src={selectedRequest.image_url} alt="Scontrino" className="w-full h-full object-contain" />
                      <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-full text-white backdrop-blur-md">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </a>
                  </div>
                </div>

                {/* Dati e Azioni */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-[var(--accent-strong)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Cliente</p>
                        <p className="text-white font-medium">{selectedRequest.user_email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Receipt className="w-5 h-5 text-[var(--accent-strong)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Importo Dichiarato</p>
                        <p className="text-2xl font-black text-white">€ {selectedRequest.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[var(--accent-strong)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Inviato il</p>
                        <p className="text-white">{new Date(selectedRequest.created_at).toLocaleString('it-IT')}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  <div className="space-y-4 pt-2">
                    <label className="block space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">Numero Scontrino (per Cooperto)</span>
                      <input 
                        className="field" 
                        placeholder="Es: 42-125" 
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Note Admin (opzionale)</span>
                      <textarea 
                        className="field min-h-20 resize-none" 
                        placeholder="Aggiungi una nota..."
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-white/2 grid grid-cols-2 gap-4">
              <button
                disabled={!!processingId}
                onClick={() => handleProcess('rejected')}
                className="button-secondary flex items-center justify-center gap-2 py-4 border-red-500/30 text-red-400"
              >
                <X className="w-5 h-5" /> Rifiuta
              </button>
              <button
                disabled={!!processingId || !receiptNumber}
                onClick={() => handleProcess('approved')}
                className="button-primary flex items-center justify-center gap-2 py-4 shadow-emerald-500/20"
              >
                {processingId === selectedRequest.id ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Approva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
