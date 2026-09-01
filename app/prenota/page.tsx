import { BrandedIframe } from "@/components/branded-iframe";

const BOOKING_URL = "https://prenotazioni.cooperto.it/in/510b3be7-ed1d-41";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-[#151714] p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Prenota al Tortuga</h1>
        <p className="text-xs text-white/60">Riserva il tuo tavolo direttamente online.</p>
      </div>
      <div className="h-[80vh] w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
        <BrandedIframe
          src={BOOKING_URL}
          title="Prenotazione Tortuga Bay"
          allow="payment"
        />
      </div>
    </main>
  );
}

