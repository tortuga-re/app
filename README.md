# Tortuga Client App 🏴‍☠️

Web app mobile-first per i pirati del **Tortuga Bay**, progettata per offrire un'esperienza immersiva nel locale: dalle prenotazioni alla gamification della fedeltà ("Ciurma"), fino all'esperienza serale dal vivo (*Tonight Hub*).

Costruita con **Next.js 16 (App Router)**, **TypeScript** e **Tailwind CSS v4**, l'applicazione è una PWA (Progressive Web App) installabile con supporto alle notifiche push, aggiornamenti proattivi in background e integrazione server-side con il sistema **Cooperto**.

---

## 🚀 Funzionalità Principali

### 🎁 Onboarding & Welcome Chest
* **Premi di Benvenuto**: Flusso guidato di benvenuto che sblocca promozioni e coupon dedicati all'installazione della PWA e all'abilitazione delle notifiche push.

### 🏴‍☠️ Loyalty & Dashboard "La Ciurma"
* **Sistema a Ranghi**: Progressioni dinamiche da *Mozzo* fino a *Leggenda del Tortuga* in base a visite e Dobloni accumulati.
* **Hall of Legends**: Classifica pubblica dei pirati leggendari con salvataggio sicuro e gestione fallback.
* **Tessera & QR Code**: Riconoscimento istantaneo in cassa con scansione del QR code personalizzato.

### 🌙 Tonight Hub & Esperienza nel Locale
* **Stato "Nel Locale"**: Rilevamento automatico della presenza al tavolo via QR code locale o geolocalizzazione (valido 4 ore).
* **Foto Live**: Scatti della serata aggiornati in tempo reale sullo schermo e negli smartphone della ciurma.
* **Live TV & Media**: Integrazione con gli schermi del locale per annunci, promozioni e dirette.

### 📅 Sistema di Prenotazione Avanzato
* **Integrazione Real-time**: Sincronizzazione diretta con le API di Cooperto per la selezione delle sale e disponibilità orarie.
* **Mappa Interattiva**: Visualizzazione integrata della piantina delle sale del locale.

### 📱 PWA, Push & Performance
* **Aggiornamenti Proattivi**: Service Worker intelligente che riconosce le nuove build rilasciate e notifica l'utente con un banner di aggiornamento senza mai causare errori di rotta.
* **Notifiche Push**: Sistema avanzato di messaggistica diretto e personalizzato per eventi, scadenze coupon e promozioni.
* **Gestione Offline & Fallback**: Cache resiliente e database locale di riserva in caso di disservizi di rete.

---

## 🛠 Stack Tecnologico

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Linguaggio**: [TypeScript 5](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Database & Backend**:
    * **Supabase**: Gestione stato live, notifiche, classifiche e Hall of Fame.
    * **Local JSON Fallback**: Sistema di salvataggio di riserva a resilienza elevata.
* **Integrazioni**: API Cooperto (Booking & Fidelity).
* **Media & Performance**: `sharp` per l'ottimizzazione automatica delle immagini caricate in formato WebP.
* **PWA & Push**: Service Worker nativi con Web Push API (VAPID).

---

## 📂 Struttura del Progetto

```text
tortuga-app/
├── app/
│   ├── admin/            # Plancia di comando e gestione live game / TV
│   ├── api/              # Proxy API Cooperto, Push, Live TV, Leggende
│   ├── ciurma/           # Dashboard fidelity, scontrini e classifiche
│   ├── gift/             # Carte regalo ed esperienze
│   ├── info/             # Orari, mappa, contatti e domande frequenti
│   └── page.tsx          # Home Screen con highlights e Tonight Hub
├── components/
│   ├── booking-overlay.tsx # Popup prenotazioni Cooperto
│   ├── bottom-nav.tsx    # Barra di navigazione dinamica (4 o 5 pulsanti)
│   ├── loyalty-journey.tsx # Progressione fidelity e caroselli tappe
│   ├── pwa-controller.tsx# Gestione PWA, notifiche push e aggiornamenti
│   └── tonight/          # Componenti per l'esperienza serale live
├── lib/                  # Servizi Cooperto, Supabase, push e logica di business
├── public/               # Asset statici ottimizzati (.webp, manifest, PWA icons)
└── supabase/             # Migrazioni e schema database
```

---

## ⚙️ Setup Locale

1. **Installazione dipendenze**:
   ```bash
   npm install
   ```

2. **Configurazione ambiente**:
   Copia `.env.example` in `.env.local` e inserisci le tue credenziali riservate (API key Cooperto, Supabase URL, chiavi VAPID).

3. **Avvio in modalità sviluppo**:
   ```bash
   npm run dev
   ```

4. **Verifica Qualità e Build**:
   ```bash
   npm run typecheck  # Controllo tipi TypeScript
   npm run build      # Compilazione di produzione
   ```


L'applicazione è ottimizzata per il deploy su ambienti **Node.js** o **Cloud Run**.
In produzione, assicurarsi che le variabili ambiente siano correttamente popolate e che il Service Worker sia servito via HTTPS.
