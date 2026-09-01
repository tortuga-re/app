# 🏴‍☠️ Tortuga Bay — Client PWA App

Benvenuti nel repository ufficiale della Web Application mobile-first del **Tortuga Bay** di Reggio Emilia.

L'applicazione è una Progressive Web App (PWA) ad alte prestazioni sviluppata per offrire un'esperienza completa e immersiva ai clienti del locale: dalla gestione della fedeltà gamificata alla prenotazione dei tavoli, fino all'intrattenimento dal vivo durante la permanenza al ristorante.

---

## 🌟 Caratteristiche Principali

### 🎁 Onboarding & Welcome Chest
- **Premi di Benvenuto**: Flusso di benvenuto che regala un bonus iniziale ai pirati al loro primo approdo.
- **Incentivo alla PWA e Notifiche Push**: Lo sblocco delle offerte speciali guida l'utente all'installazione dell'app sulla schermata home e all'abilitazione delle notifiche push.

### 🏴‍☠️ Sistema Loyalty "La Ciurma" & Hall of Legends
- **Progressione a Ranghi**: Avanzamento da *Mozzo* fino a *Leggenda del Tortuga* basato su visite annuali e Dobloni guadagnati.
- **Hall of Legends**: Albo d'oro pubblico per i pirati che raggiungono il rango massimo, con registrazione del nickname unico.
- **Tessera Fidelity Digitale & QR**: Riconoscimento immediato in cassa con scansione nativa del QR code personale.

### 🌙 Tonight Hub & Esperienza Live al Ristorante
- **Riconoscimento Presenza**: Rilevamento automatico della presenza al tavolo tramite QR code del tavolo o geo-check-in (validità 4 ore).
- **Foto Live**: Galleria e caricamenti istantanei per condividere gli scatti della serata sugli schermi del locale.
- **Contenuti Live TV**: Integrazione con i display del ristorante per dirette, menu del giorno e annunci del Capitano.

### 📅 Prenotazioni & Mappa del Locale
- **Sincronizzazione API Cooperto**: Verifica in tempo reale delle disponibilità orarie e delle sale.
- **Piantina Interattiva**: Visualizzazione integrata della posizione dei tavoli e delle sale tematiche.

### 📱 PWA Avanzata & Sicurezza
- **Notifica Aggiornamenti Proattiva**: Il Service Worker rileva le nuove build rilasciate su Hostinger in background e mostra un discreto banner di aggiornamento senza mai causare crash o errori di rotta.
- **Notifiche Push Native (VAPID)**: Canale diretto per comunicare offerte, scadenze coupon ed eventi.
- **Sicurezza & Rate Limiting**: Protezione degli endpoint riservati tramite blocco temporaneo IP in caso di tentativi errati e validazione severa degli input utente.

---

## 🛠️ Stack Tecnologico

- **Core**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Linguaggio**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/), Lucide Icons
- **Backend & Database**:
  - **Cooperto API**: Sincronizzazione cassa, fidelity points e prenotazioni.
  - **Supabase Cloud**: Gestione stati live, notifiche, classifiche e Hall of Fame.
  - **Local Persistence Layer**: Fallback locale per la massima continuità di servizio.
- **Media Optimization**: Compressione automatica `sharp` in formato WebP.
- **PWA**: Service Worker nativi, Web App Manifest e Push Notifications API.

---

## 📂 Struttura del Repository

```text
tortuga-app/
├── app/                  # Next.js App Router (Rotte, API & Layouts)
│   ├── admin/            # Plancia di comando per lo Staff / Capitano
│   ├── api/              # Proxy API per Cooperto, Supabase, Push & Media
│   ├── ciurma/           # Dashboard fedeltà, Dobloni e Hall of Legends
│   ├── gift/             # Carte regalo ed esperienze
│   ├── info/             # Orari, piantina, contatti e FAQ
│   └── page.tsx          # Home page con Highlights e Tonight Hub
├── components/           # Componenti UI riutilizzabili
│   ├── booking-overlay.tsx # Modal prenotazioni Cooperto
│   ├── bottom-nav.tsx    # Navigation bar dinamica adattiva
│   ├── loyalty-journey.tsx # Componente card fedeltà e caroselli tappe
│   ├── pwa-controller.tsx# Gestore PWA, notifiche push e update toast
│   └── tonight/          # Moduli dell'esperienza live serale
├── lib/                  # Moduli di servizio, validazioni e client SDK
│   ├── cooperto/         # Client API e modelli di cassa
│   ├── security/         # Rate Limiter e protezioni di sicurezza
│   └── supabase/         # Client Supabase e sincronizzazione
├── public/               # Asset statici ottimizzati (.webp) e icone PWA
└── supabase/             # Schema database e migrazioni SQL
```

---

## 🚀 Guida all'Installazione Locale

### 1. Prerequisiti
- **Node.js**: v18.17+ o v20+
- **npm** o **pnpm**

### 2. Configurazione
1. Clona il repository sul tuo computer.
2. Copia il file delle variabili di ambiente:
   ```bash
   cp .env.example .env.local
   ```
3. Compila `.env.local` con le tue credenziali riservate (Cooperto API key, Supabase credentials, VAPID keys).

### 3. Avvio in Sviluppo
```bash
npm install
npm run dev
```
L'applicazione sarà disponibile su `http://localhost:3000`.

### 4. Build di Produzione
```bash
npm run typecheck
npm run build
```

---

## 📄 Licenza & Diritti

Tutti i diritti sono riservati a **Tortuga Bay** © 2026.
