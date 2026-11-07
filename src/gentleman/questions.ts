export type Q =
  | { id: string; tipo: "single"; domanda: string; aiuto?: string; opzioni: string[] }
  | { id: string; tipo: "multi"; domanda: string; aiuto?: string; opzioni: string[]; max?: number }
  | { id: string; tipo: "scale"; domanda: string; aiuto?: string; min: string; max: string }
  | { id: string; tipo: "number"; domanda: string; aiuto?: string; unita: string; minimo: number; massimo: number; predefinito: number }
  | { id: string; tipo: "text"; domanda: string; aiuto?: string; placeholder: string; facoltativa?: boolean };

export type Section = { id: string; titolo: string; intro: string; domande: Q[] };
export type Answers = Record<string, string | string[] | number>;

export const SEZIONI: Section[] = [
  {
    id: "chi",
    titolo: "Chi sei",
    intro: "Partiamo dalla tua vita di tutti i giorni.",
    domande: [
      { id: "eta", tipo: "single", domanda: "Quanti anni hai?", opzioni: ["18–24", "25–34", "35–44", "45–54", "55 o più"] },
      {
        id: "lavoro",
        tipo: "single",
        domanda: "Che lavoro fai?",
        opzioni: ["Ufficio / azienda", "Vendite e contatto con clienti", "Imprenditore o libero professionista", "Lavoro creativo", "Lavoro operativo o manuale", "Studente", "Altro"],
      },
      {
        id: "ambienti",
        tipo: "multi",
        domanda: "Dove passi la tua settimana?",
        aiuto: "Scegli tutto quello che vale per te.",
        opzioni: ["In ufficio", "In smart working", "Riunioni e appuntamenti con clienti", "Cene ed eventi", "In viaggio", "Con la famiglia e i bambini", "In palestra o facendo sport"],
      },
      { id: "luogo", tipo: "single", domanda: "Dove vivi?", opzioni: ["In città", "In provincia", "Al mare", "In montagna o in campagna"] },
    ],
  },
  {
    id: "vita",
    titolo: "La tua vita reale",
    intro: "Un percorso funziona solo se entra nelle tue giornate vere. Qui conta l'onestà.",
    domande: [
      { id: "casa", tipo: "single", domanda: "In casa oggi…", opzioni: ["Vivo da solo", "In coppia, senza figli", "Con un neonato o un bimbo piccolo", "Con figli in età scolare", "Con figli grandi", "Con i miei genitori o coinquilini"] },
      { id: "giornate_piene", tipo: "single", domanda: "Quante giornate a settimana sono piene dalla mattina alla sera?", opzioni: ["Nessuna o quasi", "1–2", "3–4", "Praticamente tutte"] },
      { id: "momento_libero", tipo: "multi", domanda: "Quando hai davvero un po' di tempo per te?", aiuto: "Scegli tutto quello che vale.", opzioni: ["Presto la mattina", "In pausa pranzo", "Nel tardo pomeriggio", "La sera tardi", "Nel fine settimana", "Quasi mai"] },
      { id: "sonno_prevedibile", tipo: "scale", domanda: "Quanto è regolare il tuo sonno in questo periodo?", aiuto: "Risvegli notturni, turni, bambini, viaggi…", min: "Imprevedibile", max: "Regolarissimo" },
      { id: "energia", tipo: "scale", domanda: "Com'è la tua energia media durante la giornata?", min: "Sempre a terra", max: "Sempre carico" },
      { id: "stress", tipo: "scale", domanda: "Quanto stress senti in questo periodo?", min: "Pochissimo", max: "Moltissimo" },
      { id: "costanza", tipo: "single", domanda: "Quando inizi qualcosa di nuovo, di solito…", opzioni: ["Parto forte e mollo dopo poco", "Vado a periodi", "Sono costante se ho un piano chiaro", "Sono costante sempre"] },
      { id: "impegni_fissi", tipo: "text", domanda: "Impegni fissi o vincoli che il percorso deve rispettare?", placeholder: "Es. call alle 9 ogni giorno, sabato con la famiglia, viaggio di lavoro ogni mese…", facoltativa: true },
    ],
  },
  {
    id: "stile",
    titolo: "Il tuo stile oggi",
    intro: "Nessun giudizio: serve a capire da dove partiamo.",
    domande: [
      { id: "stile_oggi", tipo: "single", domanda: "Come ti vesti di solito?", opzioni: ["Sportivo e comodo", "Casual ma curato", "Business", "Elegante", "Non ci penso molto"] },
      { id: "giacca", tipo: "single", domanda: "Quanto spesso indossi una giacca?", opzioni: ["Mai", "Una o due volte al mese", "Ogni settimana", "Quasi ogni giorno"] },
      {
        id: "difficolta",
        tipo: "multi",
        domanda: "Cosa ti mette più in difficoltà nel vestirti?",
        opzioni: ["Abbinare colori e capi", "Trovare la taglia e la vestibilità giuste", "Non ho i capi giusti", "Capire cosa mettere nelle occasioni", "Ho poco tempo la mattina", "Il budget"],
      },
      { id: "budget", tipo: "single", domanda: "Quanto puoi investire nel guardaroba ogni mese?", aiuto: "Comprese le riparazioni dal sarto e dal calzolaio.", opzioni: ["Meno di 50 €", "50–100 €", "100–300 €", "300–600 €", "Più di 600 €"] },
      { id: "approccio_acquisti", tipo: "single", domanda: "Preferisci…", opzioni: ["Pochi capi di qualità, anche se ci metto di più", "Più capi a prezzo contenuto", "Un mix: qualità dove conta, risparmio sul resto"] },
      { id: "dove_compri", tipo: "multi", domanda: "Dove compri oggi?", opzioni: ["Catene di moda (Zara, H&M, Uniqlo…)", "Outlet e saldi", "Negozi di marca", "Online", "Usato e vintage", "Sartoria o su misura"] },
      { id: "artigiani", tipo: "multi", domanda: "Hai già degli artigiani di fiducia?", opzioni: ["Un sarto", "Un camiciaio", "Un calzolaio", "Un barbiere", "Nessuno"] },
    ],
  },
  {
    id: "portamento",
    titolo: "Portamento e galateo",
    intro: "Come ti muovi tra le persone.",
    domande: [
      { id: "agio", tipo: "scale", domanda: "Quanto ti senti a tuo agio in situazioni formali (cene importanti, eventi, incontri di lavoro)?", min: "Per niente", max: "Completamente" },
      { id: "carattere", tipo: "single", domanda: "Ti definiresti…", opzioni: ["Riservato", "Equilibrato", "Espansivo"] },
      {
        id: "situazioni",
        tipo: "multi",
        domanda: "In quali situazioni vorresti essere più sicuro?",
        opzioni: ["Cene formali e galateo a tavola", "Primi appuntamenti", "Parlare in pubblico", "Presentazioni e networking", "Puntualità e uso del telefono", "Gestire i conflitti con calma", "Conversazione e small talk"],
      },
      { id: "galateo", tipo: "scale", domanda: "Quanto conosci le regole del galateo?", min: "Quasi nulla", max: "Molto bene" },
    ],
  },
  {
    id: "linguaggio",
    titolo: "Linguaggio",
    intro: "Un gentleman si riconosce da come parla, prima ancora che da come si veste.",
    domande: [
      { id: "parlare", tipo: "scale", domanda: "Quanto sei soddisfatto di come ti esprimi a voce?", min: "Per niente", max: "Molto" },
      {
        id: "linguaggio_difetti",
        tipo: "multi",
        domanda: "Quali di queste cose ti riconosci?",
        aiuto: "Sii onesto: nessuno lo vedrà.",
        opzioni: [
          "Uso intercalari (cioè, tipo, praticamente, sostanzialmente…)",
          "Dico parolacce spesso",
          "Uso molto dialetto o slang",
          "Uso tanti anglicismi",
          "Ho un vocabolario ristretto, ripeto le stesse parole",
          "Parlo troppo veloce",
          "Faccio fatica a scrivere email e messaggi formali",
          "Nessuna di queste",
        ],
      },
      { id: "registro", tipo: "single", domanda: "Quando parli con un cliente o una persona importante…", opzioni: ["Mi viene naturale un registro formale", "Mi adatto, ma con fatica", "Resto informale come sempre"] },
      { id: "conversazione", tipo: "scale", domanda: "Quanto ti senti a tuo agio a sostenere una conversazione con uno sconosciuto?", min: "Per niente", max: "Completamente" },
    ],
  },
  {
    id: "fisico",
    titolo: "Fisico",
    intro: "Un gentleman si porta bene anche fisicamente.",
    domande: [
      { id: "altezza", tipo: "number", domanda: "Quanto sei alto?", unita: "cm", minimo: 150, massimo: 210, predefinito: 178 },
      { id: "peso", tipo: "number", domanda: "Quanto pesi?", unita: "kg", minimo: 45, massimo: 160, predefinito: 78 },
      { id: "attivita", tipo: "single", domanda: "Quanto ti alleni oggi?", opzioni: ["Per niente", "Mi muovo poco", "1–2 volte a settimana", "3–4 volte a settimana", "5 o più volte"] },
      {
        id: "obiettivo_fisico",
        tipo: "single",
        domanda: "Qual è il tuo obiettivo fisico principale?",
        opzioni: ["Perdere grasso", "Mettere massa muscolare", "Tonificare (ricomposizione)", "Diventare più forte", "Postura e mobilità", "Mantenermi in forma"],
      },
      { id: "giorni", tipo: "single", domanda: "Quanti giorni a settimana puoi allenarti?", opzioni: ["2", "3", "4", "5"] },
      { id: "durata", tipo: "single", domanda: "Quanto tempo per ogni allenamento?", opzioni: ["30 minuti", "45 minuti", "60 minuti", "75 minuti o più"] },
      { id: "attrezzatura", tipo: "single", domanda: "Dove ti alleni?", opzioni: ["Palestra completa", "A casa con manubri e panca", "Solo corpo libero", "Un po' e un po'"] },
      { id: "limitazioni", tipo: "text", domanda: "Hai infortuni o limitazioni fisiche da considerare?", placeholder: "Es. fastidio alla spalla destra, ginocchio operato…", facoltativa: true },
    ],
  },
  {
    id: "salute",
    titolo: "Salute e abitudini",
    intro: "Le abitudini sono il vero abito del gentleman.",
    domande: [
      { id: "sonno", tipo: "single", domanda: "Quanto dormi di solito?", opzioni: ["Meno di 6 ore", "6–7 ore", "7–8 ore", "Più di 8 ore"] },
      { id: "alimentazione", tipo: "single", domanda: "Come mangi?", opzioni: ["In modo disordinato", "Abbastanza equilibrato", "Con molta attenzione"] },
      {
        id: "abitudini",
        tipo: "multi",
        domanda: "Quali abitudini vorresti migliorare?",
        opzioni: ["Sonno", "Alcol", "Fumo", "Zuccheri e cibo spazzatura", "Telefono e social", "Bere più acqua", "Routine del mattino", "Leggere di più"],
      },
      { id: "grooming", tipo: "single", domanda: "Il tuo viso oggi", opzioni: ["Rasato", "Barba corta", "Barba lunga", "Baffi"] },
      { id: "cura", tipo: "single", domanda: "La tua routine di cura personale", opzioni: ["Praticamente nessuna", "Le basi", "Curata"] },
    ],
  },
  {
    id: "mente",
    titolo: "Mente e cultura",
    intro: "Un gentleman ha qualcosa da dire.",
    domande: [
      {
        id: "interessi",
        tipo: "multi",
        domanda: "Cosa ti incuriosisce?",
        opzioni: ["Lettura", "Musica jazz o classica", "Vino e whisky", "Cucina", "Viaggi", "Arte e cinema", "Sport classici (tennis, golf, vela)", "Auto e motori", "Storia"],
      },
      { id: "libri", tipo: "single", domanda: "Quanti libri leggi in un anno?", opzioni: ["Nessuno", "1–3", "4–10", "Più di 10"] },
    ],
  },
  {
    id: "obiettivi",
    titolo: "Chi vuoi diventare",
    intro: "L'ultima parte, la più importante.",
    domande: [
      {
        id: "priorita",
        tipo: "multi",
        max: 3,
        domanda: "Su cosa vuoi lavorare per primo?",
        aiuto: "Massimo 3.",
        opzioni: ["Stile e guardaroba", "Portamento e galateo", "Linguaggio e conversazione", "Fisico", "Salute e abitudini", "Grooming", "Mente e cultura"],
      },
      { id: "tempo", tipo: "single", domanda: "Quanto tempo al giorno puoi dedicare al percorso (oltre all'allenamento)?", opzioni: ["10 minuti", "20 minuti", "30 minuti", "Un'ora o più"] },
      { id: "visione", tipo: "text", domanda: "Tra un anno, cosa vuoi che dicano di te le persone che ti incontrano?", placeholder: "Es. che sono elegante senza sforzo, affidabile, in forma…" },
    ],
  },
];

export const ALL_QUESTIONS = SEZIONI.flatMap((s) => s.domande.map((q) => ({ ...q, sezione: s })));
