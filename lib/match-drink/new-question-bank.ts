import { MatchDrinkQuestion } from "./types";

export const NEW_QUESTION_BANK: Partial<MatchDrinkQuestion>[] = [
  // --- LIGHT (Ghiaccio Sottile) ---
  {
    category: "light",
    text: "IL TUO DRINK IDEALE PER INIZIARE LA SERATA È...",
    options: [
      { id: "A", text: "Analcolico (faccio l'autista)", traits: { timido: 3, fedele: 3 } },
      { id: "B", text: "Bollicine (per sentirmi importante)", traits: { orgoglioso: 4, romantico: 2 } },
      { id: "C", text: "Gin Tonic (un grande classico)", traits: { ironico: 4, diretto: 2 } },
      { id: "D", text: "Shot ignorante (si parte forte)", traits: { festaiolo: 4, caotico: 2 } }
    ]
  },
  {
    category: "light",
    text: "COSA NOTI PER PRIMO IN UNA PERSONA AL PRIMO SGUARDO?",
    options: [
      { id: "A", text: "Il sorriso contagioso", traits: { romantico: 5, timido: 1 } },
      { id: "B", text: "Lo sguardo profondo", traits: { investigatore: 5, fedele: 2 } },
      { id: "C", text: "Come si muove in pista", traits: { festaiolo: 3, pericoloso: 2 } },
      { id: "D", text: "Lo stile e come veste", traits: { orgoglioso: 4, diretto: 1 } }
    ]
  },
  {
    category: "light",
    text: "QUANTO TEMPO IMPIEGHI PER PREPARARTI PER UNA SERATA?",
    options: [
      { id: "A", text: "5 minuti e sono fuori", traits: { libero: 5, diretto: 2 } },
      { id: "B", text: "Mezz'ora (il tempo giusto)", traits: { ironico: 4, fedele: 2 } },
      { id: "C", text: "Un'ora (sono perfezionista)", traits: { orgoglioso: 4, geloso: 5 } },
      { id: "D", text: "Inizio a pensarci dal lunedì", traits: { investigatore: 5, romantico: 2 } }
    ]
  },
  {
    category: "light",
    text: "IL TUO SUPERPOTERE SOCIALE È...",
    options: [
      { id: "A", text: "Ridere a tutte le battute", traits: { timido: 4, ironico: 4 } },
      { id: "B", text: "Scomparire quando c'è da pagare", traits: { pericoloso: 4, caotico: 4 } },
      { id: "C", text: "Attaccare bottone con chiunque", traits: { festaiolo: 4, diretto: 3 } },
      { id: "D", text: "Dimenticare i nomi dopo 2 secondi", traits: { libero: 4, caotico: 3 } }
    ]
  },
  {
    category: "light",
    text: "SE POTESSI VIAGGIARE NEL TEMPO, DOVE ANDRESTI?",
    options: [
      { id: "A", text: "Nel futuro (per vedere i gadget)", traits: { investigatore: 6, libero: 2 } },
      { id: "B", text: "Anni '70 (mood disco e festa)", traits: { festaiolo: 5, caotico: 2 } },
      { id: "C", text: "Anni '90 (nostalgia pura)", traits: { romantico: 4, fedele: 3 } },
      { id: "D", text: "Ieri, per non bere quell'ultimo giro", traits: { ironico: 6, diretto: 2 } }
    ]
  },
  {
    category: "light",
    text: "QUALE CANZONE TI FA SALTARE SUL TAVOLO?",
    options: [
      { id: "A", text: "Reggaeton spinto", traits: { festaiolo: 4, pericoloso: 3 } },
      { id: "B", text: "Rock anni '80", traits: { orgoglioso: 3, diretto: 3 } },
      { id: "C", text: "La hit commerciale del momento", traits: { fedele: 4, timido: 2 } },
      { id: "D", text: "Le sigle dei cartoni (sono un bimbo dentro)", traits: { romantico: 4, ironico: 4 } }
    ]
  },
  {
    category: "light",
    text: "LA TUA VACANZA IDEALE È...",
    options: [
      { id: "A", text: "Relax totale in spiaggia", traits: { timido: 5, fedele: 3 } },
      { id: "B", text: "Avventura con zaino in spalla", traits: { libero: 5, caotico: 2 } },
      { id: "C", text: "Città d'arte e musei", traits: { investigatore: 6, orgoglioso: 2 } },
      { id: "D", text: "Party h24 senza dormire mai", traits: { festaiolo: 5, pericoloso: 3 } }
    ]
  },
  {
    category: "light",
    text: "IL TUO SPUNTINO PREFERITO DOPO LE 3 DI NOTTE?",
    options: [
      { id: "A", text: "Kebab completo di tutto", traits: { caotico: 5, diretto: 2 } },
      { id: "B", text: "Cornetto caldo appena sfornato", traits: { romantico: 4, timido: 2 } },
      { id: "C", text: "Pizza fredda avanzata", traits: { ironico: 5, libero: 3 } },
      { id: "D", text: "Nulla, continuo a bere", traits: { festaiolo: 5, pericoloso: 4 } }
    ]
  },
  {
    category: "light",
    text: "QUAL È IL TUO RAPPORTO CON IL TELEFONO DURANTE LA SERATA?",
    options: [
      { id: "A", text: "Sempre in mano per le storie", traits: { orgoglioso: 5, festaiolo: 2 } },
      { id: "B", text: "Lo perdo ogni 15 minuti", traits: { caotico: 5, libero: 3 } },
      { id: "C", text: "Rispondo dopo tre giorni", traits: { timido: 4, libero: 4 } },
      { id: "D", text: "Lo uso solo per chiamare il taxi", traits: { diretto: 5, fedele: 3 } }
    ]
  },
  {
    category: "light",
    text: "SE FOSSI UN ANIMALE, QUALE SARESTI?",
    options: [
      { id: "A", text: "Gatto pigro (ma elegante)", traits: { orgoglioso: 4, ironico: 4 } },
      { id: "B", text: "Lupo solitario", traits: { libero: 5, timido: 3 } },
      { id: "C", text: "Cucciolo iperattivo", traits: { romantico: 3, festaiolo: 4 } },
      { id: "D", text: "Gufo (vivo solo di notte)", traits: { investigatore: 6, pericoloso: 2 } }
    ]
  },
  {
    category: "light",
    text: "IL TUO TALENTO INUTILE È...",
    options: [
      { id: "A", text: "So tutte le canzoni a memoria", traits: { festaiolo: 3, romantico: 2 } },
      { id: "B", text: "Dormo ovunque e comunque", traits: { libero: 4, caotico: 2 } },
      { id: "C", text: "Faccio lo spelling al contrario", traits: { investigatore: 6, ironico: 3 } },
      { id: "D", text: "Trovo sempre parcheggio", traits: { orgoglioso: 3, diretto: 2 } }
    ]
  },
  {
    category: "light",
    text: "COSA NON MANCA MAI NEL TUO FRIGO?",
    options: [
      { id: "A", text: "Salse di ogni tipo", traits: { caotico: 3, ironico: 4 } },
      { id: "B", text: "Acqua tonica e ghiaccio", traits: { festaiolo: 4, diretto: 2 } },
      { id: "C", text: "Avanzi di asporto", traits: { libero: 3, timido: 2 } },
      { id: "D", text: "È perennemente vuoto", traits: { pericoloso: 3, caotico: 2 } }
    ]
  },
  {
    category: "light",
    text: "QUALE SERIE TV TI RAPPRESENTA DI PIÙ?",
    options: [
      { id: "A", text: "Sitcom divertente", traits: { ironico: 5, festaiolo: 2 } },
      { id: "B", text: "Drama pieno di intrighi", traits: { geloso: 6, investigatore: 5 } },
      { id: "C", text: "Fantasy fuori dal mondo", traits: { romantico: 4, timido: 2 } },
      { id: "D", text: "Crime (faccio il duro)", traits: { pericoloso: 5, diretto: 3 } }
    ]
  },
  {
    category: "light",
    text: "COME TI COMPORTI SE NON CONOSCI NESSUNO A UNA FESTA?",
    options: [
      { id: "A", text: "Mi presento a tutti", traits: { diretto: 4, festaiolo: 3 } },
      { id: "B", text: "Sto attaccato al telefono", traits: { timido: 5, libero: 2 } },
      { id: "C", text: "Punto subito il bar", traits: { caotico: 4, festaiolo: 3 } },
      { id: "D", text: "Cerco un cane da accarezzare", traits: { romantico: 5, fedele: 3 } }
    ]
  },
  {
    category: "light",
    text: "IL TUO GIOCO DA TAVOLO PREFERITO È...",
    options: [
      { id: "A", text: "Strategia pura (voglio vincere)", traits: { orgoglioso: 5, investigatore: 5 } },
      { id: "B", text: "Party game caciarone", traits: { festaiolo: 5, caotico: 4 } },
      { id: "C", text: "Classico intramontabile", traits: { fedele: 5, romantico: 2 } },
      { id: "D", text: "Odio i giochi da tavolo", traits: { diretto: 4, libero: 3 } }
    ]
  },

  // --- IRONIC (Pungenti e Sfacciate) ---
  {
    category: "ironic",
    text: "L'EX TI SCRIVE 'MI MANCHI' ALLE 3 DI NOTTE. COSA FAI?",
    options: [
      { id: "A", text: "Blocco immediato", traits: { diretto: 5, orgoglioso: 3 } },
      { id: "B", text: "Rispondo 'Chi sei?'", traits: { ironico: 6, orgoglioso: 4 } },
      { id: "C", text: "Ci casco e vado sotto casa", traits: { romantico: 5, caotico: 3 } },
      { id: "D", text: "Screenshot e invio al gruppo", traits: { investigatore: 6, geloso: 5 } }
    ]
  },
  {
    category: "ironic",
    text: "LA TUA FIGURA IMBARAZZANTE PIÙ FREQUENTE?",
    options: [
      { id: "A", text: "Salutare chi non conosco", traits: { timido: 4, caotico: 3 } },
      { id: "B", text: "Dimenticare i nomi subito", traits: { libero: 5, caotico: 2 } },
      { id: "C", text: "Inciampare sul nulla", traits: { caotico: 5, romantico: 2 } },
      { id: "D", text: "Messaggio alla persona sbagliata", traits: { pericoloso: 5, caotico: 4 } }
    ]
  },
  {
    category: "ironic",
    text: "COME SCAPPI DA QUALCUNO CHE CI PROVA MA NON TI PIACE?",
    options: [
      { id: "A", text: "Fingo un'emergenza bagno", traits: { timido: 5, ironico: 5 } },
      { id: "B", text: "Dico che sono impegnatissimo", traits: { diretto: 4, orgoglioso: 3 } },
      { id: "C", text: "Ballo malissimo per spaventarlo", traits: { caotico: 5, ironico: 6 } },
      { id: "D", text: "Chiamo gli amici in soccorso", traits: { fedele: 5, timido: 3 } }
    ]
  },
  {
    category: "ironic",
    text: "LA TUA MISSIONE PRINCIPALE DI STASERA È...",
    options: [
      { id: "A", text: "Finire tutto il bar", traits: { festaiolo: 5, caotico: 3 } },
      { id: "B", text: "Trovare la preda perfetta", traits: { pericoloso: 5, diretto: 4 } },
      { id: "C", text: "Fare invidia agli ex", traits: { orgoglioso: 5, geloso: 6 } },
      { id: "D", text: "Non cadere dai tacchi", traits: { timido: 3, ironico: 4 } }
    ]
  },
  {
    category: "ironic",
    text: "IL TUO PEGGIOR DIFETTO SECONDO GLI AMICI?",
    options: [
      { id: "A", text: "Ritardatario cronico", traits: { libero: 5, caotico: 3 } },
      { id: "B", text: "Troppo testardo", traits: { orgoglioso: 5, diretto: 4 } },
      { id: "C", text: "Parlo decisamente troppo", traits: { ironico: 5, festaiolo: 3 } },
      { id: "D", text: "Non rispondo mai ai messaggi", traits: { libero: 5, timido: 2 } }
    ]
  },
  {
    category: "ironic",
    text: "COSA C'È NELLA TUA CRONOLOGIA DI RICERCA?",
    options: [
      { id: "A", text: "Domande esistenziali assurde", traits: { investigatore: 6, caotico: 3 } },
      { id: "B", text: "Sintomi di malattie rare", traits: { timido: 4, fedele: 2 } },
      { id: "C", text: "Meme e video di gattini", traits: { romantico: 4, ironico: 4 } },
      { id: "D", text: "Gli ex dei miei amici", traits: { investigatore: 6, geloso: 5 } }
    ]
  },
  {
    category: "ironic",
    text: "SE POTESSI CAMBIARE NOME, COSA SCEGLIERESTI?",
    options: [
      { id: "A", text: "Un nome esotico e misterioso", traits: { pericoloso: 4, romantico: 3 } },
      { id: "B", text: "Un titolo nobiliare", traits: { orgoglioso: 5, fedele: 2 } },
      { id: "C", text: "Un nome d'arte da DJ", traits: { festaiolo: 4, libero: 3 } },
      { id: "D", text: "Mi va bene il mio, purtroppo", traits: { timido: 4, fedele: 3 } }
    ]
  },
  {
    category: "ironic",
    text: "QUANTE PERSONE HAI 'STUDIATO' SUI SOCIAL OGGI?",
    options: [
      { id: "A", text: "Nessuna, sono puro/a", traits: { fedele: 5, timido: 4 } },
      { id: "B", text: "Solo l'ex del mio ex", traits: { geloso: 6, investigatore: 5 } },
      { id: "C", text: "Tutti quelli in questo locale", traits: { investigatore: 6, pericoloso: 3 } },
      { id: "D", text: "L'FBI dovrebbe assumermi", traits: { investigatore: 6, ironico: 5 } }
    ]
  },
  {
    category: "ironic",
    text: "REAZIONE SE TI BECCANO A GUARDARE UNA STORIA PER SBAGLIO?",
    options: [
      { id: "A", text: "Lancio il telefono e scappo", traits: { timido: 5, caotico: 4 } },
      { id: "B", text: "Metto like a tutto per confondere", traits: { ironico: 6, investigatore: 5 } },
      { id: "C", text: "Fingo di averlo fatto apposta", traits: { orgoglioso: 5, diretto: 4 } },
      { id: "D", text: "Tolgo il follow e blocco", traits: { diretto: 5, geloso: 6 } }
    ]
  },
  {
    category: "ironic",
    text: "IL TUO SPIRITO GUIDA QUANDO SEI AL BANCONE?",
    options: [
      { id: "A", text: "Avvoltoio (aspetto l'offerta)", traits: { ironico: 5, libero: 3 } },
      { id: "B", text: "Leone (ordino con forza)", traits: { diretto: 5, orgoglioso: 4 } },
      { id: "C", text: "Bradipo (non so cosa scegliere)", traits: { timido: 4, caotico: 2 } },
      { id: "D", text: "Pavone (faccio il figo col barista)", traits: { orgoglioso: 5, festaiolo: 3 } }
    ]
  },
  {
    category: "ironic",
    text: "COME CONVINCI L'AMICO PIGRO A USCIRE STASERA?",
    options: [
      { id: "A", text: "'Ti offro tutto io!'", traits: { fedele: 4, festaiolo: 3 } },
      { id: "B", text: "'C'è la tua cotta al locale!'", traits: { romantico: 5, investigatore: 5 } },
      { id: "C", text: "Minacce psicologiche costanti", traits: { geloso: 6, pericoloso: 5 } },
      { id: "D", text: "Lo prelevo a forza da casa", traits: { diretto: 5, caotico: 4 } }
    ]
  },
  {
    category: "ironic",
    text: "REAZIONE A UN COMPLIMENTO INASPETTATO?",
    options: [
      { id: "A", text: "Lo accetto con arroganza", traits: { orgoglioso: 5, diretto: 3 } },
      { id: "B", text: "Arrossisco e balbetto", traits: { timido: 5, romantico: 3 } },
      { id: "C", text: "Dico che non è vero per niente", traits: { investigatore: 5, timido: 4 } },
      { id: "D", text: "Ne ricambio uno finto subito", traits: { ironico: 6, pericoloso: 2 } }
    ]
  },
  {
    category: "ironic",
    text: "IL TUO TRAVESTIMENTO DI CARNEVALE PIÙ FALLIMENTARE?",
    options: [
      { id: "A", text: "Qualcosa di troppo ingombrante", traits: { caotico: 4, festaiolo: 2 } },
      { id: "B", text: "Fatto all'ultimo con un sacchetto", traits: { libero: 5, ironico: 5 } },
      { id: "C", text: "Nessuno capiva chi fossi", traits: { investigatore: 6, timido: 3 } },
      { id: "D", text: "Non mi travesto, sono già strano", traits: { diretto: 4, orgoglioso: 3 } }
    ]
  },
  {
    category: "ironic",
    text: "COSA FAI SE IL BARISTA SBAGLIA IL TUO DRINK?",
    options: [
      { id: "A", text: "Lo bevo e sto zitto (timore)", traits: { timido: 5, fedele: 4 } },
      { id: "B", text: "Glielo faccio notare gentilmente", traits: { diretto: 4, fedele: 5 } },
      { id: "C", text: "Faccio una scena da film", traits: { orgoglioso: 5, caotico: 4 } },
      { id: "D", text: "Lo offro a un passante", traits: { festaiolo: 4, libero: 5 } }
    ]
  },
  {
    category: "ironic",
    text: "LA TUA SCUSA PREFERITA PER ANDARE VIA PRESTO?",
    options: [
      { id: "A", text: "'Devo dare da mangiare al gatto'", traits: { fedele: 5, ironico: 5 } },
      { id: "B", text: "'Ho un'alba domani mattina'", traits: { orgoglioso: 4, timido: 3 } },
      { id: "C", text: "'Mi sento poco bene' (finto)", traits: { ironico: 6, timido: 4 } },
      { id: "D", text: "Sparisco senza dire nulla", traits: { libero: 5, pericoloso: 4 } }
    ]
  },

  // --- SPICY (Vento in Poppa) ---
  {
    category: "spicy",
    text: "UNA NOTTE NELLA STIVA CON CHI TI PIACE: COSA SUCCEDE?",
    options: [
      { id: "A", text: "Chiacchiere e sguardi intensi", traits: { timido: 4, romantico: 5 } },
      { id: "B", text: "Un bacio rubato che toglie il fiato", traits: { romantico: 5, diretto: 4 } },
      { id: "C", text: "Quello che succede resta segreto", traits: { pericoloso: 5, investigatore: 5 } },
      { id: "D", text: "Finiremmo il rum prima di iniziare", traits: { festaiolo: 5, caotico: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "IL TUO SEGNALE SEGRETO PER FAR CAPIRE CHE TI PIACE QUALCUNO?",
    options: [
      { id: "A", text: "Sguardo fisso finché non cede", traits: { diretto: 5, pericoloso: 4 } },
      { id: "B", text: "Offrire un drink misterioso", traits: { ironico: 6, romantico: 3 } },
      { id: "C", text: "Contatto fisico 'casuale' in pista", traits: { festaiolo: 5, diretto: 4 } },
      { id: "D", text: "Messaggio in bottiglia via App", traits: { timido: 5, romantico: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "UN'AVVENTURA CON UNO SCONOSCIUTO: SÌ O NO?",
    options: [
      { id: "A", text: "Sì, adoro il brivido dell'ignoto", traits: { pericoloso: 5, libero: 5 } },
      { id: "B", text: "Mai, ho bisogno di feeling", traits: { fedele: 5, romantico: 4 } },
      { id: "C", text: "Solo se l'alcol decide per me", traits: { caotico: 5, festaiolo: 4 } },
      { id: "D", text: "Succede quasi ogni weekend", traits: { libero: 5, pericoloso: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "IL PECCATO CHE COMMETTERESTI VOLENTIERI STASERA?",
    options: [
      { id: "A", text: "Un bacio con la persona sbagliata", traits: { pericoloso: 5, romantico: 3 } },
      { id: "B", text: "Dire tutta la verità, anche la più cruda", traits: { diretto: 5, ironico: 5 } },
      { id: "C", text: "Sparire nel nulla con uno sconosciuto", traits: { libero: 5, caotico: 5 } },
      { id: "D", text: "Qualcosa di cui pentirmi... ma domani", traits: { festaiolo: 5, pericoloso: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "LA TUA ARMA DI SEDUZIONE INFALLIBILE È...",
    options: [
      { id: "A", text: "Il tocco 'accidentale' sulle spalle", traits: { diretto: 4, festaiolo: 3 } },
      { id: "B", text: "Messaggi ambigui e maliziosi", traits: { ironico: 6, investigatore: 6 } },
      { id: "C", text: "L'uso intelligente delle parole", traits: { orgoglioso: 4, ironico: 6 } },
      { id: "D", text: "L'essere un mistero totale", traits: { timido: 5, investigatore: 6 } }
    ]
  },
  {
    category: "spicy",
    text: "IL POSTO PIÙ STRANO DOVE L'HAI FATTO?",
    options: [
      { id: "A", text: "In macchina (un classico)", traits: { fedele: 3, romantico: 2 } },
      { id: "B", text: "All'aperto (adoro il rischio)", traits: { pericoloso: 5, libero: 5 } },
      { id: "C", text: "In un bagno pubblico affollato", traits: { caotico: 5, festaiolo: 4 } },
      { id: "D", text: "Solo in camera (tradizionalista)", traits: { timido: 5, fedele: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "UNA RED FLAG CHE PERÒ TI ATTRAE TANTISSIMO?",
    options: [
      { id: "A", text: "L'eccessiva sicurezza di sé", traits: { orgoglioso: 5, diretto: 4 } },
      { id: "B", text: "Un pizzico di gelosia tossica", traits: { geloso: 6, fedele: 3 } },
      { id: "C", text: "L'aria da cattivo ragazzo/ragazza", traits: { pericoloso: 5, investigatore: 5 } },
      { id: "D", text: "L'imprevedibilità totale", traits: { caotico: 5, libero: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "COSA NON DEVE MAI MANCARE IN UNA NOTTE DI PASSIONE?",
    options: [
      { id: "A", text: "La musica giusta in sottofondo", traits: { romantico: 5, festaiolo: 2 } },
      { id: "B", text: "Luce soffusa o buio totale", traits: { timido: 4, fedele: 3 } },
      { id: "C", text: "Parlare sporco", traits: { diretto: 5, ironico: 6 } },
      { id: "D", text: "Farlo durare fino all'alba", traits: { festaiolo: 4, pericoloso: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "PREFERISCI ESSERE IL CACCIATORE O LA PREDA?",
    options: [
      { id: "A", text: "Cacciatore (prendo l'iniziativa)", traits: { diretto: 5, orgoglioso: 4 } },
      { id: "B", text: "Preda (voglio essere conquistato)", traits: { timido: 5, romantico: 3 } },
      { id: "C", text: "Mi piace scambiare i ruoli", traits: { caotico: 4, ironico: 5 } },
      { id: "D", text: "Entrambi allo stesso tempo", traits: { libero: 4, festaiolo: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "HAI FANTASIE SU QUALCUNO PRESENTE ORA NEL LOCALE?",
    options: [
      { id: "A", text: "Sì, e spero di concludere stasera", traits: { diretto: 5, pericoloso: 5 } },
      { id: "B", text: "Forse, dopo un altro giro di drink", traits: { festaiolo: 4, ironico: 4 } },
      { id: "C", text: "No, sono qui solo per bere", traits: { timido: 5, fedele: 5 } },
      { id: "D", text: "Ho fantasie su tutti, indistintamente", traits: { caotico: 5, libero: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "COSA PENSI DEI RAPPORTI OCCASIONALI?",
    options: [
      { id: "A", text: "Lo sport nazionale preferito", traits: { libero: 5, festaiolo: 5 } },
      { id: "B", text: "Solo se c'è un minimo di attrazione", traits: { ironico: 5, romantico: 3 } },
      { id: "C", text: "Non fanno per me, cerco l'amore", traits: { fedele: 5, romantico: 5 } },
      { id: "D", text: "Ne cerco uno proprio adesso", traits: { pericoloso: 5, diretto: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "QUANTO CONTA L'ATTRAZIONE FISICA DA 1 A 10?",
    options: [
      { id: "A", text: "11 (è tutto)", traits: { orgoglioso: 5, diretto: 5 } },
      { id: "B", text: "8 (molto importante)", traits: { festaiolo: 4, ironico: 4 } },
      { id: "C", text: "5 (basta che ci sia)", traits: { fedele: 4, timido: 3 } },
      { id: "D", text: "1 (sono un'anima platonica)", traits: { romantico: 5, timido: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "COSA TI FA SCATTARE LA SCINTILLA SOTTO LE LENZUOLA?",
    options: [
      { id: "A", text: "Prendere il controllo totale", traits: { diretto: 5, orgoglioso: 5 } },
      { id: "B", text: "Lasciarsi dominare completamente", traits: { timido: 5, fedele: 4 } },
      { id: "C", text: "Sperimentare sempre cose nuove", traits: { caotico: 5, libero: 5 } },
      { id: "D", text: "L'intensità del contatto visivo", traits: { romantico: 5, investigatore: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "IL GIOCO DI RUOLO CHE VORRESTI PROVARE?",
    options: [
      { id: "A", text: "Paziente e dottore", traits: { geloso: 5, pericoloso: 4 } },
      { id: "B", text: "Professore e alunno ribelle", traits: { orgoglioso: 5, diretto: 4 } },
      { id: "C", text: "Due estranei in un bar", traits: { ironico: 6, romantico: 4 } },
      { id: "D", text: "L'interrogatorio della polizia", traits: { investigatore: 6, diretto: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "HAI MAI BACIATO LA PERSONA SBAGLIATA?",
    options: [
      { id: "A", text: "Più volte di quante vorrei ammettere", traits: { caotico: 5, libero: 4 } },
      { id: "B", text: "Mai, sono molto selettivo/a", traits: { orgoglioso: 5, fedele: 5 } },
      { id: "C", text: "Solo se spinto/a dagli amici", traits: { timido: 4, caotico: 3 } },
      { id: "D", text: "Ogni bacio è quello giusto al momento", traits: { festaiolo: 5, diretto: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "COSA CERCHI IN UN PARTNER PER UNA NOTTE?",
    options: [
      { id: "A", text: "Pura chimica fisica", traits: { diretto: 5, pericoloso: 5 } },
      { id: "B", text: "Qualcuno che mi faccia ridere", traits: { ironico: 6, romantico: 4 } },
      { id: "C", text: "Esperienza e sicurezza", traits: { orgoglioso: 5, investigatore: 5 } },
      { id: "D", text: "Qualcuno di totalmente opposto a me", traits: { caotico: 4, libero: 4 } }
    ]
  },
  {
    category: "spicy",
    text: "TI PIACE ESSERE DOMINATO O PRENDERE IL CONTROLLO?",
    options: [
      { id: "A", text: "Mi piace comandare io", traits: { diretto: 5, orgoglioso: 5 } },
      { id: "B", text: "Voglio che l'altro decida tutto", traits: { timido: 5, fedele: 4 } },
      { id: "C", text: "Dipende dal mood della serata", traits: { caotico: 5, ironico: 5 } },
      { id: "D", text: "Amo la parità assoluta", traits: { fedele: 5, romantico: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "IL MESSAGGIO PIÙ OSÉ CHE HAI MAI INVIATO?",
    options: [
      { id: "A", text: "Una foto decisamente esplicita", traits: { pericoloso: 5, diretto: 5 } },
      { id: "B", text: "Una proposta indecente a parole", traits: { ironico: 6, diretto: 4 } },
      { id: "C", text: "Un invito ambiguo ma chiaro", traits: { investigatore: 6, ironico: 5 } },
      { id: "D", text: "Non ho mai inviato nulla del genere", traits: { timido: 5, fedele: 5 } }
    ]
  },
  {
    category: "spicy",
    text: "REAZIONE SE TI PROPONGONO UNA COSA A TRE?",
    options: [
      { id: "A", text: "Accetto subito se le persone meritano", traits: { libero: 5, pericoloso: 5 } },
      { id: "B", text: "Ci penso seriamente", traits: { investigatore: 5, caotico: 3 } },
      { id: "C", text: "Troppo affollato, sono geloso/a", traits: { geloso: 7, fedele: 4 } },
      { id: "D", text: "Solo se sono io il centro di tutto", traits: { orgoglioso: 5, festaiolo: 3 } }
    ]
  },
  {
    category: "spicy",
    text: "IL TUO LIVELLO DI AUDACIA STASERA DA 1 A 10?",
    options: [
      { id: "A", text: "10 (sono pronto a tutto)", traits: { diretto: 5, festaiolo: 5 } },
      { id: "B", text: "7 (aspetto l'occasione giusta)", traits: { ironico: 5, investigatore: 5 } },
      { id: "C", text: "4 (voglio solo divertirmi)", traits: { libero: 4, caotico: 2 } },
      { id: "D", text: "1 (sono qui per fare da spettatore)", traits: { timido: 5, fedele: 4 } }
    ]
  }
];
