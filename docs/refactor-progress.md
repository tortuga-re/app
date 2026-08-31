# Consolidamento applicazione Tortuga

Ultimo aggiornamento: 2026-08-31

## Obiettivo

Completare il consolidamento tecnico e funzionale concordato senza modificare
involontariamente grafica, testi, spaziature o comportamento delle funzioni già
approvate.

Commit di partenza: `ff17e1a`

## Vincoli confermati

- La modalità on-premise e i QR statici non vengono modificati.
- Il carosello Home rimane invariato nella struttura e nello stile.
- Ciurma rimane invariata, salvo CTA nelle missioni per cui esiste un'azione utile.
- Il refactoring dei componenti non deve produrre differenze visive.
- `next-env.d.ts` era già modificato automaticamente prima dell'inizio del lavoro e
  non appartiene a questo intervento.
- Dati iniziali/fallback delle classifiche restano come sono.
- Il flusso corrente di primo login/iscrizione senza OTP resta come deciso.

## Piano e stato

- [x] Creazione del registro persistente e baseline del repository.
- [x] Rimozione verifica coupon amministrativa non più usata.
- [x] Cache PWA limitata ad asset e dati pubblici sicuri.
- [x] Riduzione e conversione immagini con confronto dimensionale.
- [x] Precaricamento iframe quando la CTA entra nel margine viewport di 300 px.
- [x] Scanner QR caricato dinamicamente solo all'apertura.
- [x] Prefetch route dopo il load, durante idle e rispettando Save-Data/reti lente.
- [x] Separazione progressiva Server/Client Components senza variazioni visive.
- [x] Suddivisione dei file monolitici per dominio e funzionalità.
- [x] CTA per missioni azionabili, rispettando prenotazioni nei 15 giorni.
- [x] Barra inferiore: Prenota diventa Stasera quando il cliente è nel locale.
- [x] Stasera fuori locale: prossima serata, programma, prenotazione, indicazioni.
- [x] Stasera nel locale: menu, Foto Live, serata attuale e gioco attivo integrato.
- [x] Home `/admin` trasformata in dashboard operativa.
- [x] Health dashboard servizi.
- [x] Duplica editoriale, bozze, anteprima reale, conferme distruttive, stati live/demo.
- [x] Centro notifiche interno accanto al pulsante QR.
- [x] Verifiche finali: typecheck, lint, test, build e diff check.

## Metodo di avanzamento

1. Ogni fase viene completata e verificata isolatamente.
2. Dopo ogni fase questo file viene aggiornato con file e controlli eseguiti.
3. Non si mescolano refactoring strutturali e cambiamenti visivi.
4. In caso di interruzione, riprendere dalla prima voce non selezionata.
5. Prima del rilascio confrontare la UI corrente nelle modalità ospite, cliente,
   cliente con prenotazione, on-premise e demo.

## Comandi di verifica

```powershell
node node_modules\typescript\bin\tsc --noEmit
node --experimental-strip-types --test lib\achievements\rules.test.ts
node node_modules\next\dist\bin\next build
git diff --check
```

## Diario

### 2026-08-31

- Audit iniziale completato.
- Confermato branch `main` al commit `ff17e1a`.
- Presente soltanto la modifica preesistente e generata a `next-env.d.ts`.
- Identificati endpoint e modulo della verifica coupon da rimuovere.
- Identificati i punti di caricamento di iframe, scanner e prefetch.
- Rimossi `app/api/admin/verify-coupon` e `lib/cooperto/coupon-verify`.
- La service worker v5 non conserva più API personali o operative; il fallback
  resta soltanto per cinque endpoint pubblici esplicitamente ammessi.
- `QRScanner` è ora un chunk dinamico caricato soltanto quando viene aperto.
- Il prefetch delle route parte dopo `load`, durante idle, è scaglionato e si
  disattiva con Save-Data o reti 2G.
- Gli iframe Prenota/Menu vengono precaricati soltanto quando la relativa CTA
  entra nel margine di 300 px (oppure quando viene aperta direttamente).
- Typecheck superato dopo la rigenerazione della cache `.next`.
- Convertiti 54 PNG in WebP: da 83.367.056 byte a 3.508.424 byte per
  gli asset coinvolti (circa -95,8%). `public` ora pesa circa 4,26 MB.
- Aggiunto `scripts/optimize-public-images.mjs` per rendere la conversione
  ripetibile; tutti i riferimenti applicativi puntano ai nuovi asset.
- La barra inferiore usa `Stasera` come quinta voce centrale quando la presenza
  on-premise è attiva, inclusa la simulazione demo.
- `Stasera` è stata suddivisa in `components/tonight/*`; Foto Live è solo
  on-premise, mentre fuori locale compaiono prossima serata, programma completo,
  prenotazione e indicazioni. Il programma è condiviso con Info.
- Estratte utility di dominio da `booking-flow` e `profile-screen` in
  `features/booking/utils.ts` e `features/profile/utils.ts`.
- Le imprese collegabili espongono ora CTA per prenotazione, programma, Foto
  Live, Fidelity e scontrino; Prenota riusa la regola centralizzata dei 15 giorni.
- `/admin` è un cruscotto con gioco/scadenza, editoriale, code Foto Live e
  scontrini, push, Live TV, health servizi, emergenza e cronologia azioni.
- L'editoriale supporta bozze, duplicazione, anteprima mobile reale, conferma
  eliminazione e badge Bozza/Programmato/Live/Scaduto.
- Aggiunto centro notifiche accanto al QR, derivato da gioco, coupon,
  prenotazione e stato Fidelity senza creare nuove tabelle pubbliche.
- Test browser mobile 390x844 superati per Home, notifiche, scenario on-premise,
  Stasera dentro/fuori locale e gioco Kantaquiz; nessun errore console.
- Typecheck superato, lint con 0 errori, test imprese 7/7 e prima build di
  produzione completata.
- Verifica finale: tutti gli asset locali referenziati esistono; typecheck
  superato; lint 0 errori (31 warning preesistenti/non bloccanti); test 7/7;
  build produzione completata; `git diff --check` superato.
- `/api/venues` è ora dinamica con cache server di un'ora: nessuna chiamata
  Cooperto viene più tentata durante il prerender della build.
