# Tortuga Client App

Web app mobile-first per i pirati del **Tortuga Bay**, progettata per offrire un'esperienza immersiva nel locale: dalle prenotazioni ai giochi interattivi, fino alla gestione della fedeltà ("Ciurma").

Costruita con **Next.js (App Router)**, **TypeScript** e **Tailwind CSS v4**, l'applicazione è una PWA (Progressive Web App) installabile con supporto alle notifiche push e integrazione server-side con il sistema **Cooperto**.

---

## 🚀 Funzionalità Principali

### 🏴‍☠️ Dashboard "La Ciurma"
*   **Profilo Dinamico**: Visualizzazione saldo punti, livello fedeltà e QR code per il riconoscimento rapido in cassa.
*   **Azioni Rapide**: Accesso immediato a prenotazioni, giochi e coupon attivi.
*   **Stato Prenotazioni**: Riepilogo delle prenotazioni imminenti direttamente in Home.

### 📅 Sistema di Prenotazione Avanzato
*   **Integrazione Real-time**: Sincronizzazione completa con le API di Cooperto per disponibilità e sale.
*   **Ingresso Dopo Cena**: Opzione dedicata per prenotazioni dalle 22:30, gestita con logiche di overbooking flessibile.
*   **Area Family**: Supporto specifico per famiglie con inserimento obbligatorio del numero di bambini per la sala dedicata.
*   **Mappa Interattiva**: Piantina del locale integrata per visualizzare la posizione della sala scelta.

### 🎮 Giochi e Intrattenimento
*   **Match & Drink**: Gioco multiplayer per animare i tavoli, con gestione sessioni via Supabase.
*   **Kantaquiz**: Quiz a tema musicale/karaoke per sfidare la propria conoscenza.
*   **Sfida il Capitano**: Gioco di riflessi con validazione server-side e sistema di referral.
*   **Pirate Photo**: Contest fotografico con upload diretto delle immagini per partecipare alle iniziative del locale.

### 📱 PWA & Esperienza Locale
*   **PWA Installabile**: Prompt personalizzato "Aggiungi a Home" per iOS e Android.
*   **Notifiche Push**: Infrastruttura pronta per l'invio di avvisi e comunicazioni marketing.
*   **Registrazione Visite**: Sistema di check-in via QR code locale per accumulare punti e sbloccare premi.
*   **Survey Post-Visita**: Funnel automatico per la raccolta feedback dopo l'esperienza al locale.

---

## 🛠 Stack Tecnologico

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Database & Backend**:
    *   **Supabase**: Gestione dati per giochi (domande, sessioni) e contest fotografici.
    *   **Redis**: Tracking delle visite, gestione lock e rate limiting.
*   **Integrazioni**: API Cooperto (Booking & Fidelity).
*   **PWA**: Service Workers nativi per gestione offline e installazione.

---

## 📂 Struttura del Progetto

```text
app/
├── api/                # Route handlers (Cooperto proxy, Push, Games, Visits)
├── components/         # Componenti UI condivisi (BookingFlow, Layout, MapViewer)
├── features/           # Moduli verticali (Match&Drink, PiratePhoto, Kantaquiz)
├── lib/                # Logica di business, configurazioni e client (Supabase, Redis, Cooperto)
├── (pages)/            # Pagine dell'applicazione (Home, Prenota, Profilo, Info)
└── public/             # Asset statici, icone PWA e piantine
```

---

## ⚙️ Configurazione (Variabili Ambiente)

L'app richiede diverse variabili per il pieno funzionamento. Copia `.env.example` in `.env` e configura:

### Cooperto & Fidelity
- `COOPERTO_API_KEY`: Chiave API fornita da Cooperto.
- `COOPERTO_SEDE_CODE`: Codice identificativo della sede.
- `COOPERTO_BOOKING_MODULE_CODE`: Codice del modulo prenotazioni attivo.

### Supabase & Redis
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: Per giochi e contest.
- `REDIS_URL`: Per il tracking delle visite e survey.

### PWA & Push
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Per le notifiche push.

---

## 🛠 Setup Locale

1.  **Installazione**:
    ```bash
    npm install
    ```
2.  **Sviluppo**:
    ```bash
    npm run dev
    ```
3.  **Qualità & Build**:
    ```bash
    npm run lint       # Controllo stile e errori
    npm run typecheck  # Controllo tipi TypeScript
    npm run build      # Build di produzione
    ```

---

## 🚢 Deploy

L'applicazione è ottimizzata per il deploy su ambienti **Node.js** o **Cloud Run**.
In produzione, assicurarsi che le variabili ambiente siano correttamente popolate e che il Service Worker sia servito via HTTPS.
