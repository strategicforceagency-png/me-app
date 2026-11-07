import type { Course } from "./types";

/* ================================================================== */
/* 4. GROOMING E APPUNTAMENTI                                          */
/* ================================================================== */
export const grooming: Course = {
  id: "grooming",
  titolo: "Grooming e appuntamenti",
  sottotitolo: "Rasatura, barba, profumo, puntualità e il primo appuntamento",
  icona: "scissors",
  lezioni: [
    {
      id: "rasatura",
      titolo: "La rasatura perfetta",
      minuti: 5,
      intro: "Pelle liscia e senza irritazioni: il segreto è nella preparazione, non nella lama.",
      blocks: [
        {
          t: "steps",
          items: [
            { titolo: "Ammorbidisci", text: "Radi subito dopo la doccia calda, o tieni un asciugamano caldo sul viso per 1–2 minuti. Il pelo bagnato si taglia con metà della fatica." },
            { titolo: "Pre-barba (facoltativo)", text: "Qualche goccia di olio pre-barba se hai la pelle sensibile: crea uno strato protettivo." },
            { titolo: "Insapona", text: "Sapone o crema da barba montati con il pennello, a movimenti circolari per 1–2 minuti: solleva il pelo e idrata. La schiuma da bomboletta funziona, ma è meno protettiva." },
            { titolo: "Primo passaggio: secondo il verso del pelo", text: "Lama nuova e affilata, nessuna pressione: lascia lavorare il peso del rasoio. Passa la mano sul viso per capire in che direzione cresce il pelo (cambia tra guance e collo). Sciacqua la lama spesso." },
            { titolo: "Secondo passaggio (se serve)", text: "Rinsapona e passa di traverso. Il contropelo dà il risultato più liscio, ma solo se la pelle non è sensibile." },
            { titolo: "Acqua fredda", text: "Sciacqua con acqua fredda per chiudere i pori." },
            { titolo: "Dopobarba", text: "Un balsamo senza alcol per lenire e idratare. Su piccoli tagli usa la pietra d'allume o la matita emostatica." },
          ],
        },
        {
          t: "dodont",
          si: ["Cambiare spesso la lama (ogni 5–7 rasature)", "Tendere la pelle con l'altra mano nei punti difficili", "Radersi la sera prima di un evento se tendi ad arrossarti"],
          no: ["Radersi a secco", "Premere forte", "Ripassare molte volte sullo stesso punto senza sapone"],
        },
        { t: "tip", text: "Se hai spesso peli incarniti o irritazioni forti, prova un rasoio a una lama (di sicurezza) e il solo verso del pelo. Se il problema persiste, chiedi a un dermatologo." },
      ],
    },
    {
      id: "barba",
      titolo: "La barba curata",
      minuti: 4,
      intro: "Una barba curata è elegante quanto una rasatura perfetta. Una trascurata, mai.",
      blocks: [
        { t: "fig", fig: { k: "beard", caption: "La linea del collo" } },
        {
          t: "steps",
          items: [
            { titolo: "Rifila a secco", text: "Il pelo bagnato sembra più lungo: rifila sempre con la barba asciutta e pettinata." },
            { titolo: "Collo", text: "Immagina una curva che va da sotto un orecchio all'altro, passando circa due dita sopra il pomo d'Adamo. Sotto quella linea si rade tutto." },
            { titolo: "Guance", text: "Segui la linea naturale, al massimo abbassala di poco. Una linea troppo bassa e dritta sembra disegnata." },
            { titolo: "Baffi", text: "Non devono coprire il labbro superiore: rifinisci con le forbicine." },
            { titolo: "Cura", text: "Lava la barba con un detergente delicato, poi qualche goccia di olio o balsamo da barba. Pettina sempre nella stessa direzione." },
          ],
        },
        { t: "tip", text: "Rifinitura ogni 3–5 giorni, taglio generale ogni 2–3 settimane. Un barbiere una volta al mese per mantenere la forma." },
      ],
    },
    {
      id: "puntualita",
      titolo: "Puntualità: quando arrivare",
      minuti: 4,
      intro: "Arrivare in orario non sempre significa arrivare all'ora scritta. Ecco cosa si aspettano gli altri, evento per evento.",
      blocks: [
        {
          t: "fig",
          fig: {
            k: "punctuality",
            p: {
              rows: [
                { e: "Colloquio di lavoro", from: -10, to: -5 },
                { e: "Riunione di lavoro", from: -5, to: 0 },
                { e: "Primo appuntamento", from: -5, to: 0 },
                { e: "Cena al ristorante", from: -3, to: 0 },
                { e: "Cena a casa di altri", from: 5, to: 15 },
                { e: "Festa / aperitivo", from: 15, to: 30 },
                { e: "Matrimonio (rito)", from: -20, to: -15 },
                { e: "Funerale", from: -15, to: -10 },
                { e: "Teatro / opera", from: -20, to: -15 },
                { e: "Visita medica", from: -10, to: -5 },
              ],
            },
            caption: "Barre dorate: arriva prima. Barre grigie: arriva leggermente dopo.",
          },
        },
        {
          t: "table",
          head: ["Evento", "Quando arrivare", "Perché"],
          rows: [
            ["Colloquio di lavoro", "5–10 min prima", "Troppo presto mette a disagio chi ti riceve; in ritardo è quasi sempre fatale"],
            ["Riunione di lavoro", "Puntuale, collegato 2 min prima se online", "Il tempo degli altri è prezioso"],
            ["Primo appuntamento", "5 min prima", "Meglio che sia tu ad aspettare lei, non il contrario"],
            ["Cena al ristorante", "All'orario prenotato", "Il tavolo è tenuto per te; dopo 15 minuti puoi perderlo"],
            ["Cena a casa di altri", "5–15 min dopo, mai prima", "Il \"quarto d'ora accademico\" lascia ai padroni di casa gli ultimi ritocchi"],
            ["Festa in casa / aperitivo", "15–30 min dopo", "Arrivare all'orario esatto significa spesso aiutare a sistemare"],
            ["Matrimonio", "15–20 min prima del rito", "Mai entrare dopo la sposa"],
            ["Funerale", "10–15 min prima", "Per un saluto discreto ai familiari prima della funzione"],
            ["Teatro, opera, concerto", "15–20 min prima", "A spettacolo iniziato spesso si entra solo all'intervallo"],
            ["Cinema", "5–10 min prima", "Prima della fine della pubblicità"],
          ],
        },
        { t: "tip", text: "Se tardi anche di soli 10 minuti, avvisa prima dell'orario, non dopo. Arrivato, una scusa breve e sincera: senza giustificazioni lunghe." },
      ],
    },
    {
      id: "appuntamento",
      titolo: "Il primo appuntamento",
      minuti: 5,
      intro: "L'obiettivo non è impressionare: è far stare bene l'altra persona. Il resto viene da sé.",
      blocks: [
        { t: "h", text: "Prima" },
        {
          t: "list",
          items: [
            "Proponi tu un posto preciso e un orario: \"Ti va un aperitivo da X giovedì alle 19:30?\". Una proposta chiara è già galanteria.",
            "Scegli un luogo dove si può parlare: niente musica troppo alta. Prenota se serve.",
            "Vestiti un gradino sopra il necessario e cura i dettagli: scarpe pulite, unghie in ordine, profumo leggero.",
            "Conferma il giorno stesso con un messaggio breve.",
          ],
        },
        { t: "h", text: "Durante" },
        {
          t: "list",
          items: [
            "Arriva qualche minuto prima. Alzati quando arriva.",
            "Telefono in tasca, silenzioso. Guardalo solo per un'emergenza, chiedendo scusa.",
            "Fai domande e ascolta davvero le risposte. Parla di te senza monopolizzare.",
            "Evita al primo incontro: ex, soldi, lamentele, politica in modo acceso.",
            "Sul conto: offri con discrezione; se lei preferisce dividere, accetta con un sorriso.",
          ],
        },
        { t: "h", text: "Dopo" },
        {
          t: "list",
          items: [
            "Accompagnala o assicurati che rientri tranquilla: \"Scrivimi quando sei a casa\".",
            "Un messaggio la sera stessa o il giorno dopo per ringraziare della serata.",
            "Rispetta sempre i suoi tempi e le sue scelte: un \"no\" o un \"non ora\" si accetta con eleganza.",
          ],
        },
      ],
    },
    {
      id: "profumo",
      titolo: "Profumo e cura personale",
      minuti: 4,
      intro: "Il profumo si deve scoprire avvicinandosi, non sentire dall'altra parte della stanza.",
      blocks: [
        {
          t: "list",
          items: [
            "2–3 spruzzi al massimo: collo (ai lati) e polsi, o petto sotto la camicia.",
            "Non strofinare i polsi: rompi le note e il profumo dura meno.",
            "Spruzza su pelle pulita e idratata: dura di più.",
            "Eau de toilette di giorno e d'estate, eau de parfum la sera e d'inverno.",
            "Un profumo \"firma\" da usare spesso, e uno per la sera o le occasioni speciali.",
            "Conserva le bottiglie al buio e lontano dal calore: luce e caldo le rovinano.",
          ],
        },
        { t: "h", text: "La routine minima" },
        {
          t: "table",
          head: ["Quando", "Cosa"],
          rows: [
            ["Ogni giorno", "Detergente viso, crema idratante (con protezione solare d'estate), deodorante, labbra idratate"],
            ["Ogni settimana", "Unghie corte e pulite, scrub viso leggero, sopracciglia e naso in ordine"],
            ["Ogni mese", "Taglio di capelli e barba dal barbiere"],
          ],
        },
      ],
    },
  ],
};

/* ================================================================== */
/* 5. SCARPE E CALZE                                                   */
/* ================================================================== */
export const scarpe: Course = {
  id: "scarpe",
  titolo: "Scarpe e calze",
  sottotitolo: "Modelli, abbinamenti, calze giuste e come lucidarle",
  icona: "footprints",
  lezioni: [
    {
      id: "modelli-scarpe",
      titolo: "I modelli e la formalità",
      minuti: 5,
      intro: "Le scarpe dicono quanto sei elegante prima di tutto il resto. Ecco la scala, dal più formale al più informale.",
      blocks: [
        { t: "fig", fig: { k: "shoes" } },
        {
          t: "table",
          head: ["Modello", "Cosa la distingue", "Quando"],
          rows: [
            ["Oxford", "Allacciatura chiusa: i lembi dei lacci sono cuciti sotto la tomaia", "Abito, cerimonia, smoking (nera lucida)"],
            ["Brogue / semi-brogue", "Oxford o derby con decorazioni a fori (coda di rondine)", "Business, spezzato, più informale dell'Oxford liscia"],
            ["Derby", "Allacciatura aperta: i lembi sono cuciti sopra la tomaia", "Business casual, spezzato, anche con jeans"],
            ["Monk strap", "Fibbia (singola o doppia) al posto dei lacci", "Business casual, abito di carattere"],
            ["Mocassino", "Senza lacci: penny, con nappine (tassel) o con morsetto", "Smart casual, estate, anche con abito leggero"],
            ["Chelsea boot", "Stivaletto con elastici laterali", "Autunno-inverno, jeans, flanella, spezzati"],
            ["Sneaker in pelle", "Minimal, bianca o tinta unita", "Casual e smart casual; mai con abito formale"],
          ],
        },
        { t: "h", text: "Colori" },
        {
          t: "list",
          items: [
            "Nero: la più formale. Sera, abiti scuri, cerimonie.",
            "Marrone scuro: la più versatile. Con blu, grigio, beige.",
            "Bordeaux (oxblood): elegante e meno prevedibile, sta bene con blu e grigio.",
            "Marrone chiaro e cuoio: informali, per abiti chiari e il tempo libero.",
            "Scamosciato: sempre più informale della pelle liscia dello stesso colore.",
          ],
        },
      ],
    },
    {
      id: "scarpe-abito",
      titolo: "Quali scarpe con quale abito",
      minuti: 3,
      intro: "La tabella da tenere a mente quando ti vesti.",
      blocks: [
        {
          t: "table",
          head: ["Indossi", "Scarpe ideali", "Da evitare"],
          rows: [
            ["Abito blu navy", "Nera, marrone scuro, bordeaux", "Marrone chiaro a una cerimonia"],
            ["Abito grigio antracite", "Nera, bordeaux", "Cuoio chiaro"],
            ["Abito grigio medio/chiaro", "Marrone scuro, bordeaux, nera", "Sneaker"],
            ["Abito beige o lino chiaro", "Marrone chiaro, mocassino in camoscio", "Nera lucida"],
            ["Smoking", "Oxford nera lucida o in vernice", "Qualsiasi altro modello"],
            ["Chino e blazer", "Mocassino, derby, monk, chelsea", "Oxford nera lucida"],
            ["Jeans scuro", "Derby, chelsea, mocassino, sneaker in pelle", "Scarpe da cerimonia"],
          ],
        },
        { t: "tip", text: "La cintura segue sempre il colore e la finitura delle scarpe: lucida con lucida, camoscio con camoscio o tessuto." },
      ],
    },
    {
      id: "calze",
      titolo: "Le calze giuste",
      minuti: 3,
      intro: "Il dettaglio che si vede quando ti siedi. E che rovina un abito perfetto se sbagliato.",
      blocks: [
        { t: "fig", fig: { k: "socks" } },
        {
          t: "list",
          items: [
            "Abbina le calze ai pantaloni, non alle scarpe: crei una linea continua che allunga la figura. In alternativa un tono più scuro dei pantaloni.",
            "Con l'abito calze lunghe (al polpaccio o gambaletto): accavallando le gambe non deve mai vedersi la pelle.",
            "Materiali: filo di Scozia (cotone fine) in primavera-estate, lana merino in inverno, seta nera con lo smoking.",
            "Calze colorate o a fantasia: in contesti casual o business casual, richiamando un colore dell'outfit.",
            "Mocassini e sneaker d'estate: fantasmini invisibili. L'effetto è caviglia nuda, pulito.",
            "Calze bianche sportive: solo con sneaker sportive e abbigliamento sportivo.",
          ],
        },
      ],
    },
    {
      id: "lucidare",
      titolo: "Lucidare le scarpe",
      minuti: 6,
      intro: "Venti minuti ogni due settimane e le tue scarpe dureranno anni. E si vedrà.",
      blocks: [
        { t: "h", text: "Cosa ti serve" },
        { t: "list", items: ["Tendiscarpe in legno di cedro", "Spazzola in crine di cavallo", "Panni di cotone (vanno bene vecchie t-shirt)", "Crema nutriente del colore delle scarpe", "Cera (lucido in pasta) dello stesso colore o neutra"] },
        {
          t: "steps",
          items: [
            { titolo: "Prepara", text: "Togli i lacci e inserisci i tendiscarpe: la pelle tesa si lavora meglio." },
            { titolo: "Pulisci", text: "Spazzola via la polvere, poi passa un panno appena umido sullo sporco. Lascia asciugare." },
            { titolo: "Nutri", text: "Stendi poca crema con un panno a movimenti circolari su tutta la tomaia. Lascia assorbire 10–15 minuti." },
            { titolo: "Spazzola", text: "Spazzola con energia e movimenti rapidi: la crema si distribuisce e la pelle inizia a brillare." },
            { titolo: "Cera", text: "Con il panno avvolto sulle dita, stendi strati sottili di cera su punta e tallone (le parti rigide). Mai sulle zone che si piegano: si crepa." },
            { titolo: "Specchiatura (facoltativa)", text: "Una goccia d'acqua e poca cera, piccoli cerchi leggeri sulla punta. Ripeti 4–5 strati: compare l'effetto specchio." },
            { titolo: "Finisci", text: "Una passata con un panno pulito, rimetti i lacci. Fatto." },
          ],
        },
        { t: "tip", text: "Camoscio: niente crema né cera. Spazzola in gomma o ottone, gomma per le macchie e spray impermeabilizzante prima di usarle." },
      ],
    },
    {
      id: "cura-scarpe",
      titolo: "Cura e durata",
      minuti: 3,
      intro: "Le buone scarpe si risuolano, non si buttano.",
      blocks: [
        {
          t: "list",
          items: [
            "Alterna le scarpe: ogni paio ha bisogno di 24 ore per asciugare l'umidità del piede.",
            "Tendiscarpe in cedro subito dopo averle tolte: mantengono la forma e assorbono l'umidità.",
            "Usa sempre il calzante: schiacciare il tallone rovina il contrafforte.",
            "Bagnate: asciugale lontano da termosifoni e fonti di calore, con i tendiscarpe o la carta di giornale.",
            "Le scarpe con cucitura Goodyear o Blake si risuolano dal calzolaio: un buon paio dura dieci anni e più.",
          ],
        },
      ],
    },
  ],
};

/* ================================================================== */
/* 6. ACCESSORI                                                        */
/* ================================================================== */
export const accessori: Course = {
  id: "accessori",
  titolo: "Accessori",
  sottotitolo: "Orologio, occhiali, pelletteria e gioielli maschili",
  icona: "watch",
  lezioni: [
    {
      id: "orologio",
      titolo: "L'orologio",
      minuti: 4,
      intro: "Per molti uomini è l'unico gioiello: sceglilo con cura.",
      blocks: [
        {
          t: "table",
          head: ["Tipo", "Caratteristiche", "Quando"],
          rows: [
            ["Dress watch", "Cassa sottile 36–40 mm, quadrante pulito, cinturino in pelle", "Abito, cerimonie, sera"],
            ["Sportivo / subacqueo", "Acciaio, lunetta, bracciale metallico o in caucciù", "Casual, smart casual, tempo libero"],
            ["Field / pilota", "Quadrante leggibile, cinturino in pelle o tessuto", "Casual e business casual"],
            ["Smartwatch", "Funzionale", "Sport e quotidiano, meno con l'abito"],
          ],
        },
        {
          t: "list",
          items: [
            "Con l'abito l'orologio deve stare sotto il polsino della camicia: casse sottili.",
            "Cinturino in pelle coordinato a scarpe e cintura (nero con nero, marrone con marrone).",
            "Metalli coerenti: acciaio con fibbia e gemelli argentati, oro con oro.",
            "Uno solo, sul polso della mano non dominante.",
          ],
        },
      ],
    },
    {
      id: "occhiali",
      titolo: "Occhiali per la forma del viso",
      minuti: 4,
      intro: "La regola è il contrasto: la montatura bilancia i tratti del viso.",
      blocks: [
        { t: "fig", fig: { k: "faces", caption: "Forma del viso e montatura consigliata" } },
        {
          t: "table",
          head: ["Viso", "Montature consigliate", "Da evitare"],
          rows: [
            ["Tondo", "Rettangolari e squadrate, ponte alto", "Montature tonde e piccole"],
            ["Quadrato", "Tonde, ovali, panto", "Squadrate e spigolose"],
            ["Ovale", "Quasi tutte, purché proporzionate", "Montature troppo grandi"],
            ["Cuore (fronte larga)", "Aviator, montature più marcate in basso, leggere", "Montature pesanti in alto"],
            ["Allungato", "Montature alte, oversize, con ponte basso", "Montature strette e sottili"],
          ],
        },
        {
          t: "list",
          items: [
            "La larghezza della montatura è circa quella del viso.",
            "Le sopracciglia si vedono appena sopra la montatura.",
            "Gli occhiali da sole si tolgono quando parli con qualcuno e al chiuso.",
          ],
        },
      ],
    },
    {
      id: "pelletteria",
      titolo: "Cintura, portafoglio e pelletteria",
      minuti: 4,
      intro: "Pelle buona, forme semplici, colori coordinati.",
      blocks: [
        { t: "h", text: "La cintura" },
        {
          t: "list",
          items: [
            "Stesso colore e finitura delle scarpe.",
            "Larghezza 3–3,5 cm con l'abito, fino a 4 cm con jeans e chino.",
            "Fibbia sobria, metallo coordinato con orologio e gemelli.",
            "Allacciata, la punta arriva al primo passante.",
            "Con le bretelle non si porta la cintura.",
          ],
        },
        { t: "h", text: "Portafoglio e altro" },
        {
          t: "list",
          items: [
            "Sottile: un portafoglio gonfio deforma la tasca e la linea della giacca.",
            "Porta carte per la tasca interna della giacca; il portafoglio non va nella tasca posteriore dei pantaloni dell'abito.",
            "Borsa da lavoro: cartella in pelle o borsa morbida; lo zaino solo in contesti casual.",
            "Pelle di qualità e pochi pezzi: invecchiano bene e durano.",
          ],
        },
      ],
    },
    {
      id: "gioielli",
      titolo: "Gioielli maschili",
      minuti: 3,
      intro: "Regola d'oro: meno è meglio. Ogni pezzo deve avere un senso.",
      blocks: [
        {
          t: "dodont",
          si: [
            "Fede o anello con sigillo, al massimo uno per mano",
            "Un bracciale sobrio in pelle o metallo, sul polso libero dall'orologio",
            "Collane sottili sotto la camicia nei contesti formali",
            "Metalli coerenti tra loro",
          ],
          no: ["Più anelli vistosi insieme", "Bracciali rumorosi in ufficio", "Catene in vista con l'abito", "Mescolare oro giallo, rosa e argento"],
        },
      ],
    },
    {
      id: "ombrello-cappello",
      titolo: "Ombrello, sciarpa e cappello",
      minuti: 3,
      intro: "Gli accessori del cattivo tempo sono anche accessori di stile.",
      blocks: [
        {
          t: "list",
          items: [
            "Ombrello: lungo a bastone, in tinta unita scura, con il cappotto e l'abito. Quello pieghevole per la borsa.",
            "Si chiude prima di entrare, mai aperto al chiuso. Bagnato, va nel portaombrelli.",
            "Sciarpa: in lana o cashmere, in tinta unita o con fantasia discreta; il nodo parigino (piegata a metà e infilata nell'asola) è il più pulito.",
            "Cappello: fedora o coppola, a seconda dello stile. Si toglie al chiuso, a tavola e nei luoghi di culto.",
            "Guanti in pelle con il cappotto: si tolgono per stringere la mano.",
          ],
        },
      ],
    },
  ],
};
