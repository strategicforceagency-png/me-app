import type { Course } from "./types";

/* ================================================================== */
/* LO STILE DEL GENTLEMAN INGLESE (anni '60-'70)                      */
/* ================================================================== */
export const inglese: Course = {
  id: "inglese",
  titolo: "Il gentleman inglese",
  sottotitolo: "Lo spirito, il guardaroba e le regole del gentiluomo britannico anni '60-'70",
  icona: "umbrella",
  lezioni: [
    {
      id: "spirito",
      titolo: "Lo spirito del gentleman",
      minuti: 5,
      intro: "Prima dei vestiti viene un modo di stare al mondo: misura, rispetto e una certa ironia su se stessi.",
      blocks: [
        { t: "p", text: "Il gentleman inglese degli anni '60 e '70 non cercava di farsi notare: cercava di essere sempre adeguato. Il suo stile nasceva da regole precise, portate con naturalezza, come se non ci avesse mai pensato." },
        {
          t: "list",
          items: [
            "**Understatement**: dire meno di quanto si potrebbe, mostrare meno di quanto si ha. Mai vantarsi di soldi, successi o conquiste.",
            "**Autocontrollo**: la calma nelle difficoltà è la prima eleganza. Si alza la voce raramente, mai in pubblico.",
            "**Fair play**: si vince senza umiliare e si perde senza lamentarsi. Vale nello sport, nel lavoro e nelle discussioni.",
            "**Autoironia**: sapere ridere di sé disarma chiunque e rende simpatici.",
            "**Parola data**: puntualità, impegni mantenuti, discrezione sulle confidenze ricevute.",
            "**Cortesia verso tutti**: si tratta il cameriere come il direttore. È lì che si vede il vero gentleman.",
          ],
        },
        { t: "tip", text: "\"Manners maketh man\": sono i modi a fare l'uomo. Un abito perfetto con modi sgarbati resta un costume." },
      ],
    },
    {
      id: "citta-campagna",
      titolo: "Città e campagna",
      minuti: 4,
      intro: "La regola britannica più famosa: in città si veste in un modo, in campagna in un altro.",
      blocks: [
        {
          t: "table",
          head: ["", "In città (lavoro, sera)", "In campagna (fine settimana)"],
          rows: [
            ["Colori", "Blu navy, grigio antracite, grigio medio", "Marroni, verdi, ruggine, beige: i colori della terra"],
            ["Tessuti", "Lisci e fini: fresco di lana, flanella pettinata", "Ruvidi e caldi: tweed, velluto a coste, moleskin"],
            ["Giacca", "Abito intero o blazer blu", "Giacca in tweed o giacca cerata"],
            ["Camicia", "Bianca o azzurra, collo francese", "Tattersall a quadretti, oxford button-down, flanella"],
            ["Cravatta", "Seta: regimental, piccoli disegni", "Lana, maglia di lana o niente cravatta"],
            ["Scarpe", "Oxford nera o marrone scuro, liscia", "Brogue marrone, derby, chukka, stivaletti"],
          ],
        },
        { t: "p", text: "La vecchia regola \"no brown in town\" voleva le scarpe marroni solo in campagna. Oggi il marrone scuro in città è accettato; resta però vero che la scarpa nera liscia è la più formale e la più cittadina." },
        { t: "tip", text: "Il blazer blu è il ponte tra i due mondi: con flanella grigia va in città, con chino e mocassini va al mare o in campagna." },
      ],
    },
    {
      id: "guardaroba-british",
      titolo: "Il guardaroba britannico",
      minuti: 6,
      intro: "I pezzi che definiscono lo stile anni '60-'70, adattati a oggi.",
      blocks: [
        { t: "h", text: "I capi chiave" },
        {
          t: "list",
          items: [
            "**Abito in flanella grigia**: il più britannico di tutti. Monopetto a due bottoni o doppiopetto, pantalone con pinces e risvolto.",
            "**Blazer blu**: con bottoni in metallo o in corno, da portare con flanella grigia o chino.",
            "**Giacca in tweed**: spina di pesce o Principe di Galles nei toni della terra, con toppe ai gomiti per il tempo libero.",
            "**Camicie di stile Jermyn Street**: bianche, azzurre, a righe sottili, collo francese di media apertura; polsino doppio per le occasioni.",
            "**Cravatte regimental e in maglia**: righe diagonali in seta per il lavoro, maglia di seta o lana per il tempo libero.",
            "**Maglieria**: girocollo in lana shetland, cardigan, dolcevita (molto anni '70) sotto la giacca.",
            "**Capispalla**: trench color sabbia, cappotto Chesterfield con collo in velluto, giacca cerata per la campagna.",
            "**Scarpe**: Oxford e brogue di tradizione inglese, chukka in camoscio, stivaletti Chelsea.",
          ],
        },
        { t: "h", text: "La silhouette anni '60-'70" },
        {
          t: "list",
          items: [
            "Anni '60: linea asciutta, giacca corta e sciancrata, revers stretti, cravatta sottile, pantalone senza pinces.",
            "Anni '70: revers e cravatte più larghi, pantaloni a vita alta con pinces e leggermente svasati, colori caldi, velluto.",
            "Oggi il compromesso migliore: vita alta con una pince, revers medi (8–9 cm), cravatta da 7–8 cm, giacca che copre il sedere.",
          ],
        },
        { t: "tip", text: "Le bretelle sono un dettaglio molto britannico: con i pantaloni a vita alta fanno cadere meglio la stoffa. Si attaccano con bottoni interni, mai con le pinze, e non si portano insieme alla cintura." },
      ],
    },
    {
      id: "tessuti-fantasie",
      titolo: "Tessuti e fantasie inglesi",
      minuti: 5,
      intro: "Saperli riconoscere ti permette di scegliere bene e di parlarne con il sarto.",
      blocks: [
        {
          t: "table",
          head: ["Nome", "Com'è", "Per cosa"],
          rows: [
            ["Flanella", "Lana morbida e leggermente pelosa, opaca", "Abiti e pantaloni grigi d'autunno e inverno"],
            ["Tweed", "Lana ruvida e robusta, spesso multicolore", "Giacche da campagna e da tempo libero"],
            ["Fresco di lana", "Lana leggera a trama aperta, traspirante", "Abiti da città in primavera ed estate"],
            ["Velluto a coste", "Cotone a coste in rilievo", "Pantaloni e giacche casual, anni '70"],
            ["Principe di Galles", "Quadri grandi formati da quadretti più piccoli", "Abiti e giacche, città e campagna"],
            ["Pied-de-poule", "Motivo a piccoli denti spezzati", "Giacche e cappotti"],
            ["Spina di pesce", "Righe a zig-zag come una lisca", "Tweed, cappotti, giacche"],
            ["Gessato", "Righe sottili e distanziate su fondo scuro", "Abiti da città, ambiente d'affari"],
            ["Tattersall", "Quadretti di due colori su fondo chiaro", "Camicie da campagna"],
          ],
        },
        { t: "tip", text: "Se abbini una giacca a fantasia, scegli camicia e cravatta più semplici: una protagonista per volta." },
      ],
    },
    {
      id: "fine-settimana",
      titolo: "Il fine settimana e la sera",
      minuti: 4,
      intro: "Il gentleman è elegante anche quando non lavora, e soprattutto quando la sera si fa formale.",
      blocks: [
        { t: "h", text: "Il fine settimana" },
        {
          t: "list",
          items: [
            "Pantaloni in velluto a coste o chino, camicia oxford, maglione girocollo o cardigan.",
            "Giacca cerata o in tweed, sciarpa di lana, scarpe scamosciate o stivaletti.",
            "Per lo sport il bianco è d'obbligo nella tradizione (tennis, cricket): pulito, essenziale, senza loghi vistosi.",
          ],
        },
        { t: "h", text: "La sera: lo smoking" },
        {
          t: "list",
          items: [
            "Nero o blu notte, revers a lancia o a scialle in raso, pantalone con banda laterale.",
            "Camicia bianca con pettorina, gemelli, papillon nero annodato a mano.",
            "Fascia in vita o gilet, calze nere di seta, Oxford nera lucida o in vernice.",
            "Niente orologio sportivo: uno sottile con cinturino nero, o nessuno.",
          ],
        },
        { t: "tip", text: "Black tie sull'invito significa smoking. Se non ne hai uno, il ripiego più dignitoso è un abito blu notte con cravatta nera: mai un abito qualunque." },
      ],
    },
  ],
};

/* ================================================================== */
/* IL VOCABOLARIO DEL GENTILUOMO                                       */
/* ================================================================== */
export const vocabolario: Course = {
  id: "vocabolario",
  titolo: "Il vocabolario del gentiluomo",
  sottotitolo: "Registro, parole da evitare, cortesia, conversazione e scrittura",
  icona: "feather",
  lezioni: [
    {
      id: "registro",
      titolo: "Registro e tono",
      minuti: 4,
      intro: "Lo stesso messaggio cambia valore a seconda di come lo dici. Il gentleman sa adattarsi senza perdere se stesso.",
      blocks: [
        {
          t: "table",
          head: ["Registro", "Quando", "Esempio"],
          rows: [
            ["Formale", "Clienti, superiori, persone più grandi, prime conoscenze", "\"Buongiorno, la ringrazio per il tempo che mi dedica.\""],
            ["Cordiale", "Colleghi, conoscenti, situazioni sociali", "\"Ciao Marco, grazie mille per ieri, è stato un piacere.\""],
            ["Informale", "Amici e famiglia", "\"Grande serata ieri, rifacciamola presto!\""],
          ],
        },
        { t: "h", text: "La voce" },
        {
          t: "list",
          items: [
            "Ritmo: più lento di come ti viene naturale. Chi parla piano sembra sicuro.",
            "Volume: quello che serve a chi ti ascolta, non alla sala intera.",
            "Pause: una pausa prima di un concetto importante lo fa pesare di più.",
            "Chiusura delle frasi: tono che scende alla fine, non che sale come una domanda.",
          ],
        },
        { t: "tip", text: "Il \"lei\" si mantiene finché l'altro non propone il \"tu\". Proporlo spetta alla persona più anziana o di ruolo più alto." },
      ],
    },
    {
      id: "parole-da-evitare",
      titolo: "Intercalari, parolacce e anglicismi",
      minuti: 6,
      intro: "Le parole che riempiono i silenzi svuotano il discorso. Toglierle è il modo più rapido per sembrare più autorevole.",
      blocks: [
        { t: "h", text: "Come eliminarli in tre passi" },
        {
          t: "steps",
          items: [
            { titolo: "Consapevolezza", text: "Registra un vocale di due minuti e analizzalo nel Laboratorio del linguaggio: scoprirai quali intercalari usi e quante volte." },
            { titolo: "Sostituzione", text: "Al posto dell'intercalare fai una breve pausa. Il silenzio di un secondo non lo nota nessuno; il \"cioè\" sì." },
            { titolo: "Allenamento", text: "Scegli un intercalare a settimana e fai attenzione solo a quello. In un mese ne avrai eliminati quattro." },
          ],
        },
        {
          t: "table",
          head: ["Invece di", "Prova con"],
          rows: [
            ["Cioè, tipo, praticamente, sostanzialmente", "Una pausa; oppure \"ovvero\", \"ad esempio\", \"in sostanza\" quando servono davvero"],
            ["Assolutamente sì", "Certamente, senz'altro"],
            ["Nel senso che…", "Intendo dire che…"],
            ["Feedback", "Riscontro, parere"],
            ["Meeting, call", "Riunione, chiamata"],
            ["Deadline", "Scadenza"],
            ["Location", "Luogo, posto"],
            ["Ok, ok, ok", "D'accordo, va bene, perfetto"],
          ],
        },
        { t: "h", text: "Le parolacce" },
        { t: "p", text: "Un gentleman le conosce ma le usa quasi mai, e mai davanti a chi non conosce bene, a clienti, a donne appena conosciute o a bambini. Quando la frustrazione sale, una frase pacata è molto più potente: \"Questo non è accettabile\" pesa più di qualsiasi imprecazione." },
        { t: "tip", text: "Gli anglicismi non sono vietati: alcuni sono entrati nella lingua (sport, computer). Il problema è usarli quando esiste una parola italiana più chiara: suona come voler sembrare importanti." },
      ],
    },
    {
      id: "cortesia",
      titolo: "Le formule di cortesia",
      minuti: 4,
      intro: "Poche parole, usate bene, cambiano il modo in cui le persone ti percepiscono.",
      blocks: [
        {
          t: "list",
          items: [
            "**Il condizionale di cortesia**: \"Vorrei\" invece di \"voglio\", \"Le dispiacerebbe…?\" invece di \"Può…?\".",
            "**Per cortesia / per favore**: sempre, anche con chi ti serve un caffè.",
            "**La ringrazio / grazie mille**: ringrazia per cose precise (\"Grazie per avermi aspettato\"), non in modo generico.",
            "**Mi permetta / se mi permetti**: per correggere, aggiungere o dissentire senza ferire.",
            "**Mi scusi se la interrompo**: quando devi proprio interrompere.",
            "**Con piacere**: al posto di \"figurati\" o \"niente\" quando qualcuno ti ringrazia.",
          ],
        },
        { t: "h", text: "Scusarsi bene" },
        {
          t: "steps",
          items: [
            { text: "Riconosci l'errore in modo preciso: \"Sono arrivato in ritardo e ti ho fatto aspettare.\"" },
            { text: "Scusati senza \"ma\": il \"ma\" cancella tutto quello che viene prima." },
            { text: "Proponi come rimediare: \"La prossima volta ti avviso prima.\"" },
          ],
        },
      ],
    },
    {
      id: "conversazione",
      titolo: "L'arte della conversazione",
      minuti: 6,
      intro: "Il miglior conversatore non è chi parla meglio, ma chi fa sentire interessante l'altro.",
      blocks: [
        {
          t: "list",
          items: [
            "**Ascolta per capire, non per rispondere**: guarda la persona, annuisci, non preparare la tua frase mentre parla.",
            "**Domande aperte**: \"Com'è nata questa passione?\" invece di \"Ti piace?\".",
            "**Ricorda i nomi**: ripetilo subito (\"Piacere, Andrea\") e usalo una volta durante la conversazione.",
            "**Regola del 50/50**: parla circa metà del tempo. Se racconti, sii breve e arriva al punto.",
            "**Complimenti sinceri e specifici**: su una scelta, non sull'aspetto fisico (\"Bella scelta di vino\").",
            "**Riprendi i dettagli**: \"Mi dicevi che stavi per partire: com'è andata?\" vale più di dieci domande nuove.",
          ],
        },
        {
          t: "dodont",
          si: ["Viaggi, libri, film, cucina, sport, progetti", "Domande sulla sua storia e le sue passioni", "Umorismo leggero e autoironia"],
          no: ["Soldi e stipendi", "Politica e religione al primo incontro", "Malattie e lamentele", "Pettegolezzi su persone assenti"],
        },
        { t: "h", text: "Chiudere con eleganza" },
        { t: "p", text: "Non sparire nel nulla: \"È stato davvero un piacere parlare con te, ora vado a salutare i padroni di casa\". Una frase chiara, un sorriso, una stretta di mano." },
      ],
    },
    {
      id: "scrivere",
      titolo: "Scrivere con eleganza",
      minuti: 5,
      intro: "Email, messaggi e biglietti: anche per iscritto si vede chi sei.",
      blocks: [
        { t: "h", text: "L'email" },
        {
          t: "steps",
          items: [
            { titolo: "Oggetto", text: "Chiaro e specifico: \"Proposta incontro – giovedì 14\" e non \"Info\"." },
            { titolo: "Saluto", text: "\"Gentile Dott. Rossi,\" nel formale; \"Buongiorno Marco,\" nel cordiale." },
            { titolo: "Corpo", text: "Tre paragrafi al massimo: perché scrivi, cosa chiedi o proponi, il prossimo passo." },
            { titolo: "Chiusura", text: "\"Cordiali saluti\" o \"Un caro saluto\"; poi nome, cognome e recapito." },
          ],
        },
        {
          t: "dodont",
          si: ["Rileggere sempre prima di inviare", "Rispondere entro 24 ore, anche solo per confermare", "Frasi brevi, un concetto per frase"],
          no: ["Tutto maiuscolo (equivale a urlare)", "Punti esclamativi a raffica", "Emoji nelle email di lavoro", "Vocali di più minuti"],
        },
        { t: "h", text: "Il biglietto scritto a mano" },
        { t: "p", text: "Dopo una cena, un regalo o un favore importante, un biglietto a mano è il gesto più raro e più apprezzato. Bastano tre frasi: ringrazia per la cosa precisa, aggiungi un dettaglio personale, chiudi con un augurio." },
        { t: "tip", text: "Esempio: \"Cara Giulia, grazie per la splendida cena di sabato. Il tuo risotto lo ricorderemo a lungo. A presto, Manuel.\"" },
      ],
    },
  ],
};
