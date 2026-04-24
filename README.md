# Tortuga Client App

Web app clienti mobile-first per Tortuga Bay, costruita con Next.js App Router, TypeScript e Tailwind CSS v4. L'integrazione Cooperto e interamente server-side, con PWA installabile, shell mobile, fallback mock leggibili e rotte pronte per home cliente, prenotazione, ciurma fidelity e info locale.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- PWA base senza dipendenze extra
- Route handlers server-side per Cooperto

## Setup locale

1. Copia `.env.example` in `.env`.
2. Installa le dipendenze:

```bash
npm install
```

3. Avvia il progetto:

```bash
npm run dev
```

4. Verifica lint e build:

```bash
npm run lint
npm run build
```

## Variabili ambiente

Le variabili richieste sono:

- `COOPERTO_API_KEY`
- `COOPERTO_SEDE_CODE`
- `COOPERTO_BOOKING_MODULE_CODE`
- `COOPERTO_BOOKING_ROOM_CODES`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `PUSH_SUBSCRIPTIONS_FILE`

Se una o piu variabili mancassero, le route interne passano automaticamente a mock locale o fallback mock per mantenere l'app navigabile.

## Flussi implementati

- `/`
  - dashboard cliente con priorita dinamica tra prossima prenotazione, compleanno vicino, coupon attivo e prenotazione rapida
  - riepilogo punti, fidelity, coupon, visite e azioni rapide
- `/prenota`
  - bootstrap modulo con `GET /api/Prenotazioni/ElencoModuliPrenotazione`
  - disponibilita con `GET /api/Prenotazioni/OrariModulo`
  - creazione prenotazione reale con `POST /api/Prenotazioni/Crea`
- `/ciurma`
  - dettagli contatto via email o codice contatto
  - saldo punti
  - coupon contatto
  - elenco fidelity card
- `/info`
  - elenco sedi
  - orari e eccezioni per sede
  - indicazioni, programmazione, contatti e social predisposti

## Note Cooperto

- La API key non viene mai esposta al browser.
- `RequestCreaPrenotazione` segue la Swagger reale:
  - richiesti `CodiceSede`, `DataPrenotazione`, `CodiceStato`, `Pax`
  - non viene inviato `CodiceModuloPrenotazione`
  - non viene inviato `CodiceContatto`
- `DataPrenotazione` viene costruita in timezone Europe/Rome.

## Deploy

Target richiesto:

- `app.tortugabay.it`
- Hostinger directory: `/home/u421648830/domains/tortugabay.it/public_html/app`

Per il deploy serve un runtime Node compatibile con Next.js e accesso alle stesse variabili ambiente presenti in locale.

## PWA e Push

- L'app registra un service worker e mostra una card discreta per `Aggiungi Tortuga alla Home` solo quando la web app e installabile e non risulta gia installata.
- Se il browser non espone `beforeinstallprompt`, la UI mostra istruzioni semplici per aggiungere la web app alla Home usando il comando nativo del browser.
- Le notifiche push vengono richieste solo dopo click esplicito su `Attiva notifiche`.
- Quando il permesso e `granted`, la subscription viene salvata nella route interna `/api/push/subscriptions`.
- Per default le subscription vengono memorizzate su file in `.data/push-subscriptions.json`. Se vuoi spostarle altrove puoi configurare `PUSH_SUBSCRIPTIONS_FILE`.
- Per creare davvero la push subscription su browser compatibili serve una chiave pubblica VAPID in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

### Test rapido installazione

1. Avvia `npm run dev`.
2. Apri l'app da mobile o dal device emulation del browser.
3. Verifica la card `Aggiungi Tortuga alla Home`.
4. Su Chrome/Edge compatibili il bottone `Aggiungi` apre il prompt nativo.
5. Su Safari iPhone compare il fallback con istruzioni `Condividi -> Aggiungi a Home`.

### Test rapido notifiche push

1. Imposta una `NEXT_PUBLIC_VAPID_PUBLIC_KEY` valida.
2. Apri l'app in HTTPS o in locale su `localhost`.
3. Premi `Attiva notifiche`.
4. Se il permesso e concesso, verifica la creazione del file `.data/push-subscriptions.json`.
5. In DevTools puoi simulare una push dal Service Worker e verificare il rendering della notifica.

Nota: l'invio reale delle notifiche ai device non e ancora attivo. La base attuale prepara service worker, subscription e salvataggio server-side, pronta per un successivo sender backend.
