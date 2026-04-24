import Link from "next/link";

export default function OfflinePage() {
  return (
    <section className="flex min-h-[70vh] items-center">
      <div className="panel w-full rounded-[2rem] p-6 text-center">
        <p className="eyebrow">Modalita offline</p>
        <h1 className="hero-title mt-3 text-4xl font-semibold">Connessione assente</h1>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Puoi continuare a consultare le informazioni gia caricate. Per nuove
          disponibilita o prenotazioni reali serve tornare online.
        </p>
        <Link
          href="/prenota"
          className="button-primary mt-6 inline-flex min-h-11 items-center justify-center px-5"
        >
          Torna alla prenotazione
        </Link>
      </div>
    </section>
  );
}

