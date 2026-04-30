import { MatchDrinkQuestion } from "./types";

export const QUESTION_BANK: Partial<MatchDrinkQuestion>[] = [
  // --- LIGHT (Ghiaccio sottile) ---
  {
    category: "light",
    text: "IL TUO DRINK IDEALE PER INIZIARE LA SERATA È...",
    options: [
      { id: "A", text: "Analcolico (sono l'autista)" },
      { id: "B", text: "Bollicine (faccio il figo)" },
      { id: "C", text: "Gin Tonic (vado sul sicuro)" },
      { id: "D", text: "Shot ignorante (stasera si fa serata)" }
    ]
  },
  {
    category: "light",
    text: "COSA TI ATTRAE DI PIÙ IN UNA PERSONA AL PRIMO SGUARDO?",
    options: [
      { id: "A", text: "Il sorriso" },
      { id: "B", text: "Lo sguardo profondo" },
      { id: "C", text: "Come si muove e balla" },
      { id: "D", text: "Il suo modo di vestire" }
    ]
  },
  {
    category: "light",
    text: "QUANTO TEMPO CI METTI A PREPARARTI PER UNA SERATA?",
    options: [
      { id: "A", text: "5 minuti (acqua e sapone)" },
      { id: "B", text: "30 minuti (il giusto)" },
      { id: "C", text: "Un'ora (sono perfezionista)" },
      { id: "D", text: "Inizio due giorni prima" }
    ]
  },
  {
    category: "light",
    text: "IL TUO SUPERPOTERE SOCIALE È...",
    options: [
      { id: "A", text: "Ridere a tutte le battute" },
      { id: "B", text: "Scomparire quando c'è da pagare" },
      { id: "C", text: "Attaccare bottone con chiunque" },
      { id: "D", text: "Dimenticare i nomi dopo 2 secondi" }
    ]
  },
  {
    category: "light",
    text: "SE POTESSI VIAGGIARE NEL TEMPO, DOVE ANDRESTI?",
    options: [
      { id: "A", text: "Nel futuro (per i gadget)" },
      { id: "B", text: "Anni '70 (per il mood e la disco)" },
      { id: "C", text: "Anni '90 (nostalgia pura)" },
      { id: "D", text: "Ieri, per non bere quell'ultimo shot" }
    ]
  },
  {
    category: "light",
    text: "QUALE CANZONE TI FA SALTARE SUL TAVOLO?",
    options: [
      { id: "A", text: "Reggaeton ignorante" },
      { id: "B", text: "Rock anni '80" },
      { id: "C", text: "La hit del momento" },
      { id: "D", text: "Le sigle dei cartoni animati" }
    ]
  },
  {
    category: "light",
    text: "LA TUA VACANZA IDEALE È...",
    options: [
      { id: "A", text: "Relax totale in spiaggia" },
      { id: "B", text: "Avventura e zaino in spalla" },
      { id: "C", text: "Città d'arte e musei" },
      { id: "D", text: "Party h24 senza dormire" }
    ]
  },
  {
    category: "light",
    text: "IL TUO PIATTO PREFERITO DOPO LE 2 DI NOTTE?",
    options: [
      { id: "A", text: "Kebab tutto completo" },
      { id: "B", text: "Cornetto caldo" },
      { id: "C", text: "Pizza fredda avanzata" },
      { id: "D", text: "Non mangio, continuo a bere" }
    ]
  },
  {
    category: "light",
    text: "QUAL È IL TUO RAPPORTO CON IL TELEFONO?",
    options: [
      { id: "A", text: "Sempre in mano (dipendente)" },
      { id: "B", text: "Lo perdo ogni 10 minuti" },
      { id: "C", text: "Rispondo dopo 3 giorni" },
      { id: "D", text: "Uso solo i messaggi vocali" }
    ]
  },
  {
    category: "light",
    text: "SE FOSSI UN ANIMALE, SARESTI...",
    options: [
      { id: "A", text: "Un gatto pigro" },
      { id: "B", text: "Un lupo solitario" },
      { id: "C", text: "Un cucciolo iperattivo" },
      { id: "D", text: "Un gufo (vivo solo di notte)" }
    ]
  },
  {
    category: "light",
    text: "IL TUO TALENTO INUTILE È...",
    options: [
      { id: "A", text: "So tutte le canzoni a memoria" },
      { id: "B", text: "Dormo ovunque e in qualsiasi momento" },
      { id: "C", text: "Riesco a fare lo spelling al contrario" },
      { id: "D", text: "Evito sempre i controllori" }
    ]
  },
  {
    category: "light",
    text: "COSA NON MANCA MAI NEL TUO FRIGORIFERO?",
    options: [
      { id: "A", text: "Salse di ogni tipo" },
      { id: "B", text: "Acqua tonica e ghiaccio" },
      { id: "C", text: "Avanzi da asporto di giorni fa" },
      { id: "D", text: "È perennemente vuoto" }
    ]
  },
  {
    category: "light",
    text: "QUALE SERIE TV TI RAPPRESENTA DI PIÙ?",
    options: [
      { id: "A", text: "Friends (amici e caffè)" },
      { id: "B", text: "Gossip Girl (drama puro)" },
      { id: "C", text: "Stranger Things (fuori dal mondo)" },
      { id: "D", text: "Peaky Blinders (faccio il duro)" }
    ]
  },
  {
    category: "light",
    text: "COME TI COMPORTI ALLE FESTE DOVE NON CONOSCI NESSUNO?",
    options: [
      { id: "A", text: "Mi presento a tutti" },
      { id: "B", text: "Sto attaccato al telefono" },
      { id: "C", text: "Punto subito il buffet e il bar" },
      { id: "D", text: "Adotto un animale domestico se c'è" }
    ]
  },

  // --- IRONIC (Pungenti e imbarazzanti) ---
  {
    category: "ironic",
    text: "IL TUO EX TI SCRIVE 'MI MANCHI' ALLE 3 DI NOTTE. COSA FAI?",
    options: [
      { id: "A", text: "Blocco immediato" },
      { id: "B", text: "Rispondo 'Chi sei?'" },
      { id: "C", text: "Vado sotto casa sua" },
      { id: "D", text: "Mando uno screenshot al gruppo" }
    ]
  },
  {
    category: "ironic",
    text: "LA TUA FIGURA DI MERDA PIÙ FREQUENTE È...",
    options: [
      { id: "A", text: "Salutare chi non conosco" },
      { id: "B", text: "Dimenticare il nome di chi mi piace" },
      { id: "C", text: "Inciampare sul nulla" },
      { id: "D", text: "Inviare un messaggio alla persona sbagliata" }
    ]
  },
  {
    category: "ironic",
    text: "UNA PERSONA CI PROVA CON TE IN PISTA MA NON TI INTERESSA. COME SCAPPI?",
    options: [
      { id: "A", text: "Fingo un'emergenza al bagno" },
      { id: "B", text: "Dico che il mio fidanzato/a sta arrivando" },
      { id: "C", text: "Inizio a ballare malissimo per spaventarlo/a" },
      { id: "D", text: "Chiamo in soccorso i miei amici" }
    ]
  },
  {
    category: "ironic",
    text: "QUAL È LA TUA MISSIONE PRINCIPALE QUESTA SERA?",
    options: [
      { id: "A", text: "Bere tutto il bar" },
      { id: "B", text: "Trovare l'anima gemella (anche solo per stanotte)" },
      { id: "C", text: "Fare invidia agli ex sui social" },
      { id: "D", text: "Distruggere la pista da ballo" }
    ]
  },
  {
    category: "ironic",
    text: "IL TUO PIÙ GRANDE DIFETTO SECONDO GLI AMICI?",
    options: [
      { id: "A", text: "Ritardatario cronico" },
      { id: "B", text: "Troppo testardo e polemico" },
      { id: "C", text: "Parlo decisamente troppo" },
      { id: "D", text: "Faccio promesse che non mantengo" }
    ]
  },
  {
    category: "ironic",
    text: "COSA C'È NELLA TUA CRONOLOGIA DI RICERCA?",
    options: [
      { id: "A", text: "Domande imbarazzanti" },
      { id: "B", text: "Sintomi di malattie rare" },
      { id: "C", text: "Video di gattini e meme" },
      { id: "D", text: "Gli ex del mio attuale partner" }
    ]
  },
  {
    category: "ironic",
    text: "SE POTESSI CAMBIARE NOME, QUALE SCEGLIERESTI?",
    options: [
      { id: "A", text: "Qualcosa di molto esotico" },
      { id: "B", text: "Un nome da nobile" },
      { id: "C", text: "Un nome d'arte da DJ" },
      { id: "D", text: "Mi va bene il mio, purtroppo" }
    ]
  },
  {
    category: "ironic",
    text: "QUANTE PERSONE HAI STALKERATO SUI SOCIAL QUESTA SETTIMANA?",
    options: [
      { id: "A", text: "Nessuna, giuro" },
      { id: "B", text: "Solo il mio ex (e la sua nuova fiamma)" },
      { id: "C", text: "Tutti i presenti in questo locale" },
      { id: "D", text: "L'FBI dovrebbe assumermi" }
    ]
  },
  {
    category: "ironic",
    text: "COSA FAI SE TI SCOPRONO A GUARDARE UNA STORIA PER SBAGLIO?",
    options: [
      { id: "A", text: "Tolgo il follow e scappo" },
      { id: "B", text: "Dico che è stato il mio cane" },
      { id: "C", text: "Metto like a tutto per disorientare" },
      { id: "D", text: "Fingo di averlo fatto apposta" }
    ]
  },
  {
    category: "ironic",
    text: "IL TUO SPIRITO GUIDA QUANDO SEI AL BANCONE DEL BAR È...",
    options: [
      { id: "A", text: "Un avvoltoio (aspetto chi mi offre da bere)" },
      { id: "B", text: "Un leone (ordino sgomitando e con prepotenza)" },
      { id: "C", text: "Un bradipo (ci metto un'ora a scegliere il drink)" },
      { id: "D", text: "Un pavone (faccio il figo/a col barista)" }
    ]
  },
  {
    category: "ironic",
    text: "COME HAI CONVINTO L'AMICO PIGRO A VENIRE AL LOCALE STASERA?",
    options: [
      { id: "A", text: "'Dai che ti offro io il primo drink!'" },
      { id: "B", text: "'C'è il tuo ex/la tua ex, devi farti vedere in forma!'" },
      { id: "C", text: "L'ho minacciato psicologicamente" },
      { id: "D", text: "L'ho prelevato a forza dal divano" }
    ]
  },
  {
    category: "ironic",
    text: "COME REAGISCI QUANDO QUALCUNO TI FA UN COMPLIMENTO?",
    options: [
      { id: "A", text: "Lo accetto con estrema arroganza" },
      { id: "B", text: "Divento rosso e balbetto" },
      { id: "C", text: "Smonto il complimento dicendo che non è vero" },
      { id: "D", text: "Faccio subito un complimento finto in cambio" }
    ]
  },

  // --- SPICY (Vietato ai minori di rum) ---
  {
    category: "spicy",
    text: "SE IL CAPITANO DEL LOCALE TI CHIEDESSE DI FARGLI DA 'ASSISTENTE' PERSONALE PER LA NOTTE...",
    options: [
      { id: "A", text: "Obbedisco senza fare domande" },
      { id: "B", text: "Chiedo prima quali sono i benefit" },
      { id: "C", text: "Prendo io il comando della situazione" },
      { id: "D", text: "Solo se c'è da bere gratis" }
    ]
  },
  {
    category: "spicy",
    text: "COSA FARESTI AL CAPITANO SE NON CI FOSSERO REGOLE STASERA?",
    options: [
      { id: "A", text: "Lo rapirei per me" },
      { id: "B", text: "Un interrogatorio molto... intimo" },
      { id: "C", text: "Gli farei togliere quella divisa" },
      { id: "D", text: "Lo sfiderei a chi regge più shot" }
    ]
  },
  {
    category: "spicy",
    text: "LA TUA ARMA DI SEDUZIONE INFALLIBILE È...",
    options: [
      { id: "A", text: "Il contatto fisico 'casuale'" },
      { id: "B", text: "Messaggini ambigui e maliziosi" },
      { id: "C", text: "Saperci fare con le parole" },
      { id: "D", text: "Essere un totale mistero" }
    ]
  },
  {
    category: "spicy",
    text: "IL POSTO PIÙ STRANO DOVE L'HAI FATTO?",
    options: [
      { id: "A", text: "In macchina (il grande classico)" },
      { id: "B", text: "All'aperto (adoro il brivido)" },
      { id: "C", text: "In un bagno pubblico o in discoteca" },
      { id: "D", text: "Solo in camera da letto (tradizionale)" }
    ]
  },
  {
    category: "spicy",
    text: "QUAL È LA TUA 'RED FLAG' CHE PERÒ TI ATTRAE?",
    options: [
      { id: "A", text: "L'essere troppo sicuro di sé" },
      { id: "B", text: "Un pizzico di tossicità e gelosia" },
      { id: "C", text: "L'aria da cattivo ragazzo/ragazza" },
      { id: "D", text: "L'essere totalmente imprevedibile" }
    ]
  },
  {
    category: "spicy",
    text: "COSA NON DEVE MAI MANCARE IN UNA NOTTE DI PASSIONE?",
    options: [
      { id: "A", text: "La giusta playlist di sottofondo" },
      { id: "B", text: "Luce soffusa (o completamente al buio)" },
      { id: "C", text: "Parlare sporco" },
      { id: "D", text: "Farlo durare a lungo" }
    ]
  },
  {
    category: "spicy",
    text: "PREFERISCI ESSERE IL CACCIATORE O LA PREDA?",
    options: [
      { id: "A", text: "Cacciatore (prendo io l'iniziativa)" },
      { id: "B", text: "Preda (voglio essere conquistato)" },
      { id: "C", text: "Mi piace che i ruoli si invertano" },
      { id: "D", text: "Entrambi contemporaneamente" }
    ]
  },
  {
    category: "spicy",
    text: "IL TUO PENSIERO PIÙ SPINTO DURANTE LA SETTIMANA RIGUARDA...",
    options: [
      { id: "A", text: "Un collega o un conoscente 'vietato'" },
      { id: "B", text: "Qualcuno che ho appena conosciuto" },
      { id: "C", text: "Un ex che non riesco a dimenticare" },
      { id: "D", text: "Le mie fantasie personali" }
    ]
  },
  {
    category: "spicy",
    text: "COSA PENSI DEI RAPPORTI OCCASIONALI (UNA BOTTA E VIA)?",
    options: [
      { id: "A", text: "Uno sport nazionale, lo adoro" },
      { id: "B", text: "Solo se c'è un minimo di feeling" },
      { id: "C", text: "Non fanno per me, preferisco l'amore" },
      { id: "D", text: "Ne sto cercando uno per stasera" }
    ]
  },
  {
    category: "spicy",
    text: "QUANTO CONTA IL SESSO IN UNA RELAZIONE (DA 1 A 10)?",
    options: [
      { id: "A", text: "11 (è la cosa più importante)" },
      { id: "B", text: "8 (molto importante per l'equilibrio)" },
      { id: "C", text: "5 (basta che ci sia)" },
      { id: "D", text: "1 (sono un'anima pura e platonica)" }
    ]
  },
  {
    category: "spicy",
    text: "COSA TI FA SCATTARE LA SCINTILLA SOTTO LE LENZUOLA?",
    options: [
      { id: "A", text: "Prendere il controllo" },
      { id: "B", text: "Farsi dominare completamente" },
      { id: "C", text: "Sperimentare cose sempre nuove" },
      { id: "D", text: "L'intensità dello sguardo" }
    ]
  },
  {
    category: "spicy",
    text: "HAI MAI AVUTO FANTASIE SU QUALCUNO PRESENTE IN QUESTO LOCALE?",
    options: [
      { id: "A", text: "Sì, e spero di realizzarle stasera" },
      { id: "B", text: "Forse, se bevo un altro drink" },
      { id: "C", text: "No, sono concentrato solo sul bere" },
      { id: "D", text: "Ho fantasie su tutti, indistintamente" }
    ]
  },
  {
    category: "spicy",
    text: "COSA PENSI DI UN MÉNAGE À TROIS?",
    options: [
      { id: "A", text: "Già fatto, lo consiglio vivamente" },
      { id: "B", text: "Curioso, lo proverei con le persone giuste" },
      { id: "C", text: "Troppo affollato per i miei gusti" },
      { id: "D", text: "Solo se io sono l'unico centro dell'attenzione" }
    ]
  },
  {
    category: "spicy",
    text: "QUAL È IL TUO LIVELLO DI 'KINKY'?",
    options: [
      { id: "A", text: "Cose che '50 sfumature' spostati proprio" },
      { id: "B", text: "Mi piace sperimentare ma con limiti" },
      { id: "C", text: "Vaniglia tutta la vita" },
      { id: "D", text: "Cos'è kinky? Si mangia?" }
    ]
  },
  {
    category: "spicy",
    text: "IL GIOCO DI RUOLO CHE VORRESTI PROVARE?",
    options: [
      { id: "A", text: "Paziente e dottore" },
      { id: "B", text: "Il professore severo e l'alunno ribelle" },
      { id: "C", text: "Due estranei in un bar" },
      { id: "D", text: "L'interrogatorio della polizia" }
    ]
  }
];
