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
            { titolo: "Ammorbidisci", text: "Radi subito dopo la doccia calda, o tieni un asciugamano caldo sul viso per 1–2 minuti. Il pelo bagnato e ammorbidito si taglia con molta meno fatica." },
            { titolo: "Pre-barba (facoltativo)", text: "Qualche goccia di olio pre-barba se hai la pelle sensibile: crea uno strato protettivo." },
            { titolo: "Insapona", text: "Sapone o crema da barba montati con il pennello, a movimenti circolari per 1–2 minuti: solleva il pelo e idrata. La schiuma da bomboletta funziona, ma è meno protettiva." },
            { titolo: "Primo passaggio: secondo il verso del pelo", text: "Lama nuova e affilata, nessuna pressione: lascia lavorare il peso del rasoio. Passa la mano sul viso per capire in che direzione cresce il pelo (cambia tra guance e collo). Sciacqua la lama spesso." },
            { titolo: "Secondo passaggio (se serve)", text: "Rinsapona e passa di traverso. Il contropelo dà il risultato più liscio, ma i dermatologi lo sconsigliano a chi ha pelle sensibile o peli incarniti: il verso del pelo resta la scelta più sicura." },
            { titolo: "Acqua fresca", text: "Sciacqua con acqua fresca e tampona con l'asciugamano: dà sollievo alla pelle (i pori, in realtà, non si aprono né si chiudono con la temperatura)." },
            { titolo: "Dopobarba", text: "Un balsamo senza alcol per lenire e idratare. Su piccoli tagli usa la pietra d'allume o la matita emostatica." },
          ],
        },
        {
          t: "dodont",
          si: ["Cambiare spesso la lama (ogni 5–7 rasature)", "Tendere la pelle con l'altra mano nei punti difficili", "Radersi la sera prima di un evento se tendi ad arrossarti"],
          no: ["Radersi a secco", "Premere forte", "Ripassare molte volte sullo stesso punto senza sapone"],
        },
        { t: "tip", text: "Se hai spesso peli incarniti o irritazioni forti, prova un rasoio a una o due lame, un solo passaggio nel verso del pelo senza tendere la pelle, e radi meno spesso (anche un rasoio elettrico aiuta). Se il problema persiste, chiedi a un dermatologo." },
      ],
      fonti: [
        { titolo: "AAD – How to shave", url: "https://www.aad.org/media/news-releases/tips-for-men-how-to-shave" },
        { titolo: "AAD – Skin care tips for men", url: "https://aad.org/skin-care-basics/skin-care-for-men" },
        { titolo: "PCDS – Pseudofolliculite della barba", url: "https://www.pcds.org.uk/patient-info-leaflets/psuedofolliculitis" },
        { titolo: "Skincare.com – Does warm water open pores?", url: "https://www.skincare.com/article/do-pores-open-with-warm-water" },
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
      fonti: [
        { titolo: "AAD – Come curare la barba", url: "https://aad.org/public/everyday-care/skin-care-secrets/face/healthy-beard" },
        { titolo: "Wahl – How to trim a beard neckline", url: "https://eu.wahl.com/how-to-trim-neckline-for-beard" },
        { titolo: "Braun – How to shape a beard neckline", url: "https://in.braun.com/en-in/male-grooming/the-world-of-styling-and-trimming/how-to-trim-shape-beard-neckline" },
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
                { e: "Colloquio di lavoro", from: -15, to: -10 },
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
            ["Colloquio di lavoro", "10–15 min prima, non di più", "Il tempo per registrarti e ricomporti; troppo presto mette a disagio chi ti riceve, in ritardo è quasi sempre fatale"],
            ["Riunione di lavoro", "Puntuale, collegato 2 min prima se online", "Il tempo degli altri è prezioso"],
            ["Primo appuntamento", "5 min prima", "Meglio che sia tu ad aspettare lei, non il contrario"],
            ["Cena al ristorante", "All'orario prenotato", "Il tavolo è tenuto per te; dopo 15 minuti puoi perderlo"],
            ["Cena a casa di altri", "5–15 min dopo, mai prima", "Qualche minuto di margine lascia ai padroni di casa gli ultimi ritocchi (le guide anglosassoni dicono puntuali o pochi minuti dopo: mai oltre i 10–15)"],
            ["Festa in casa / aperitivo", "15–30 min dopo", "Arrivare all'orario esatto significa spesso aiutare a sistemare"],
            ["Matrimonio", "15–20 min prima del rito", "Mai entrare dopo la sposa"],
            ["Funerale", "10–15 min prima", "Per un saluto discreto ai familiari prima della funzione"],
            ["Teatro, opera, concerto", "15–20 min prima", "A spettacolo iniziato spesso si entra solo all'intervallo"],
            ["Cinema", "5–10 min prima", "Prima della fine della pubblicità"],
          ],
        },
        { t: "tip", text: "Se tardi anche di soli 10 minuti, avvisa prima dell'orario, non dopo. Arrivato, una scusa breve e sincera: senza giustificazioni lunghe." },
      ],
      fonti: [
        { titolo: "World Economic Forum – Quando arrivare al colloquio", url: "https://www.weforum.org/stories/jobs-and-the-future-of-work/the-perfect-time-to-show-up-for-a-job-interview/" },
        { titolo: "The Muse – The etiquette rules of being on time", url: "https://www.themuse.com/advice/the-etiquette-rules-of-being-on-time" },
        { titolo: "Art of Manliness – When you can be late", url: "https://www.artofmanliness.com/social/etiquette/5-times-when-you-can-and-even-should-be-late/" },
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
            "Sul conto: di norma paga chi ha invitato, quindi offri con discrezione; se lei preferisce dividere, accetta con un sorriso.",
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
      fonti: [
        { titolo: "Debrett's – It's a date", url: "https://debretts.com/its-a-date/" },
        { titolo: "Art of Manliness – Puntualità e appuntamenti al ristorante", url: "https://www.artofmanliness.com/social/etiquette/5-times-when-you-can-and-even-should-be-late/" },
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
            "Non strofinare i polsi: l'attrito altera lo sviluppo delle note e il profumo dura meno.",
            "Spruzza su pelle pulita e idratata (anche subito dopo la doccia): dura di più.",
            "Eau de toilette (più leggera) di giorno e d'estate, eau de parfum (più concentrata) la sera e d'inverno. È un'indicazione di massima: la durata dipende soprattutto dalla composizione.",
            "Un profumo \"firma\" da usare spesso, e uno per la sera o le occasioni speciali.",
            "Conserva le bottiglie al buio, al fresco e fuori dal bagno: luce, caldo e umidità le rovinano.",
          ],
        },
        { t: "h", text: "La routine minima" },
        {
          t: "table",
          head: ["Quando", "Cosa"],
          rows: [
            ["Ogni giorno", "Detergente viso delicato, crema idratante, protezione solare SPF 30+ sulla pelle esposta tutto l'anno (non solo d'estate), deodorante, labbra idratate"],
            ["Ogni settimana", "Unghie corte e pulite, scrub viso leggero (1–2 volte, se la pelle lo tollera), sopracciglia e naso in ordine"],
            ["Ogni mese", "Taglio di capelli e barba dal barbiere"],
          ],
        },
      ],
      fonti: [
        { titolo: "The Gentleman's Journal – How to apply cologne", url: "https://www.thegentlemansjournal.com/article/how-to-apply-cologne" },
        { titolo: "Marie Claire UK – EDT vs EDP secondo i profumieri", url: "https://www.marieclaire.co.uk/beauty/fragrance/difference-between-eau-de-toilette-and-eau-de-parfum" },
        { titolo: "AAD – Sunscreen FAQs", url: "https://www.aad.org/sun-protection/sunscreen-faqs" },
        { titolo: "AAD – Skin care tips for men", url: "https://aad.org/skin-care-basics/skin-care-for-men" },
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
            ["Oxford", "Allacciatura chiusa: i quartieri con gli occhielli sono cuciti sotto la tomaia", "Abito, cerimonia, smoking (nera lucida)"],
            ["Brogue / semi-brogue", "Oxford o derby con decorazioni a fori: full brogue con puntale a coda di rondine (wingtip), semi-brogue con puntale dritto e medaglione", "Business, spezzato, più informale dell'Oxford liscia"],
            ["Derby", "Allacciatura aperta: i quartieri sono cuciti sopra la tomaia", "Business casual, spezzato, anche con jeans"],
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
      fonti: [
        { titolo: "He Spoke Style – Oxford vs derby", url: "https://hespokestyle.com/oxford-vs-derby-difference/" },
        { titolo: "MasterClass – Guida alle brogue", url: "https://www.masterclass.com/articles/brogue-shoe-guide" },
        { titolo: "Gentleman's Gazette – Scarpe da smoking classiche", url: "https://www.gentlemansgazette.com/tuxedo-black-tie-guide/classic/black-patent-oxfords-pumps/" },
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
            ["Smoking", "Oxford nera liscia, in vernice o in vitello a specchio; il pump da sera è l'opzione più classica", "Derby, brogue, monk, suole spesse"],
            ["Chino e blazer", "Mocassino, derby, monk, chelsea", "Oxford nera lucida"],
            ["Jeans scuro", "Derby, chelsea, mocassino, sneaker in pelle", "Scarpe da cerimonia"],
          ],
        },
        { t: "tip", text: "La cintura segue sempre il colore e la finitura delle scarpe: lucida con lucida, camoscio con camoscio o tessuto." },
      ],
      fonti: [
        { titolo: "Gentleman's Gazette – Scarpe da smoking classiche", url: "https://www.gentlemansgazette.com/tuxedo-black-tie-guide/classic/black-patent-oxfords-pumps/" },
        { titolo: "Gentleman's Gazette – Tuxedo shoes & accessories", url: "https://www.gentlemansgazette.com/tuxedo-black-tie-guide/contemporary/shoes-accessories-outerwear/" },
        { titolo: "Suits Expert – How to wear a belt", url: "https://www.suitsexpert.com/blog/how-to-wear-belt/" },
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
            "Materiali: filo di Scozia (cotone fine) in primavera-estate, lana merino in inverno, seta nera (o filo di Scozia e lana finissimi) con lo smoking.",
            "Calze colorate o a fantasia: in contesti casual o business casual, richiamando un colore dell'outfit.",
            "Mocassini e sneaker d'estate: fantasmini invisibili. L'effetto è caviglia nuda, pulito.",
            "Calze bianche sportive: solo con sneaker sportive e abbigliamento sportivo.",
          ],
        },
      ],
      fonti: [
        { titolo: "Permanent Style – The colour of socks", url: "https://www.permanentstyle.com/2007/12/the-colour-of-socks.html" },
        { titolo: "Permanent Style – The perfect socks", url: "https://www.permanentstyle.com/2014/11/the-perfect-socks-permanent-style-x-william-abraham.html" },
        { titolo: "Gentleman's Gazette – Calze e scarpe da smoking", url: "https://www.gentlemansgazette.com/tuxedo-black-tie-guide/classic/black-patent-oxfords-pumps/" },
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
            { titolo: "Cera", text: "Con il panno avvolto sulle dita, stendi strati sottili di cera su punta e tallone (le parti rigide). Mai sulle zone che si piegano: lo strato di cera rigido si crepa." },
            { titolo: "Specchiatura (facoltativa)", text: "Una goccia d'acqua e poca cera, piccoli cerchi leggeri sulla punta. Ripeti 4–5 strati: compare l'effetto specchio." },
            { titolo: "Finisci", text: "Una passata con un panno pulito, rimetti i lacci. Fatto." },
          ],
        },
        { t: "tip", text: "Camoscio: niente crema né cera. Spazzola in crêpe per ravvivare il pelo (quella in ottone solo sullo sporco ostinato e con delicatezza: può rovinarlo), gomma per le macchie e spray impermeabilizzante prima di usarle e poi periodicamente." },
      ],
      fonti: [
        { titolo: "Kirby Allison – How to mirror shine shoes", url: "https://kirbyallison.com/blogs/shoe-care-guide/how-to-mirror-shine-shoes" },
        { titolo: "A Fine Pair of Shoes – Suede & nubuck care guide", url: "https://afinepairofshoes.co.uk/pages/suede-nubuck-care-guide" },
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
            "Alterna le scarpe: ogni paio ha bisogno di almeno un giorno di riposo per asciugare l'umidità del piede.",
            "Tendiscarpe in cedro subito dopo averle tolte: mantengono la forma e assorbono l'umidità.",
            "Usa sempre il calzante: schiacciare il tallone rovina il contrafforte.",
            "Bagnate: asciugale a temperatura ambiente, lontano da termosifoni e fonti di calore, con la carta di giornale e poi i tendiscarpe.",
            "Le scarpe con cucitura Goodyear si risuolano più volte dal calzolaio; anche le Blake, ma con più difficoltà e servono calzolai attrezzati. Con rotazione e cura, un buon paio dura dieci anni e più.",
          ],
        },
      ],
      fonti: [
        { titolo: "Oliver Sweeney – Shoe care tips", url: "https://oliversweeney.com/pages/care-tips" },
        { titolo: "The Gentleman's Journal – Come curare le scarpe in pelle", url: "https://www.thegentlemansjournal.com/article/properly-care-leather-shoe" },
        { titolo: "Permanent Style – In defence of Blake construction", url: "https://www.permanentstyle.com/2009/04/in-defence-of-blake-construction.html" },
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
            ["Dress watch", "Cassa sottile, di solito 34–40 mm in proporzione al polso, quadrante pulito, cinturino in pelle", "Abito, cerimonie, sera"],
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
            "Uno solo, di solito sul polso della mano non dominante.",
          ],
        },
      ],
      fonti: [
        { titolo: "Suits Expert – How to choose a dress watch", url: "https://www.suitsexpert.com/blog/how-to-choose-dress-watch/" },
        { titolo: "Mr Porter – Choosing the right watch size", url: "https://www.mrporter.com/en-no/journal/watches/expert-tips-choosing-watch-size-case-diameters-1308240" },
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
            ["Tondo", "Rettangolari e squadrate, più larghe che alte", "Montature tonde e piccole"],
            ["Quadrato", "Tonde, ovali, panto, più larghe che alte", "Squadrate e spigolose"],
            ["Ovale", "Quasi tutte, purché larghe almeno quanto il viso", "Montature troppo grandi"],
            ["Cuore (fronte larga)", "Leggere o senza montatura, più marcate in basso; anche aviator o cat-eye morbide", "Montature pesanti in alto"],
            ["Allungato", "Montature alte (con più profondità), con aste o dettagli che allargano il viso", "Montature strette e sottili"],
          ],
        },
        {
          t: "list",
          items: [
            "La larghezza della montatura è circa quella del viso.",
            "Le sopracciglia si vedono appena sopra la montatura.",
            "Gli occhiali da sole si tolgono quando parli con qualcuno e al chiuso (salvo motivi medici).",
          ],
        },
      ],
      fonti: [
        { titolo: "Henry Ford Health – Match your frames to your face shape", url: "https://www.henryford.com/optimeyes/frames/match-your-frames-to-your-face-shape" },
        { titolo: "Diane Gottsman – Sunglasses etiquette", url: "https://dianegottsman.com/2012/05/04/sunglasses-etiquette-the-dos-and-donts/" },
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
            "Più sottile con l'abito (circa 3–3,5 cm), più larga con jeans e chino (fino a 4 cm e oltre).",
            "Fibbia sobria, metallo coordinato con orologio e gemelli.",
            "Allacciata, la punta supera il primo passante senza arrivare al secondo.",
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
      fonti: [
        { titolo: "Suits Expert – How to wear a belt", url: "https://www.suitsexpert.com/blog/how-to-wear-belt/" },
        { titolo: "Permanent Style – Wallets", url: "https://www.permanentstyle.com/2013/01/wallets-reader-question.html" },
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
          no: ["Più anelli vistosi insieme", "Bracciali rumorosi in ufficio", "Catene in vista con l'abito", "Mescolare oro giallo, rosa e argento (regola classica; oggi c'è chi la allenta, ma con l'abito resta la scelta più sicura)"],
        },
      ],
      fonti: [
        { titolo: "Art of Manliness – Ring finger symbolism", url: "https://www.artofmanliness.com/style/accessories/ring-finger-symbolism/" },
        { titolo: "Suits Expert – Metalli coordinati (cintura e accessori)", url: "https://www.suitsexpert.com/blog/how-to-wear-belt/" },
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
            "Cappello: fedora o coppola, a seconda dello stile. Si toglie al chiuso, a tavola e nei luoghi di culto (dove la tradizione religiosa non chieda il contrario).",
            "Guanti in pelle con il cappotto: per stringere la mano è più cortese toglierli (oggi la regola è meno rigida, ma resta un gesto di riguardo).",
          ],
        },
      ],
      fonti: [
        { titolo: "Permanent Style – Take off your hat indoors", url: "https://www.permanentstyle.com/2026/04/take-off-your-hat-indoors-the-sliding-scale-of-etiquette.html" },
        { titolo: "Gentleman's Gazette – Men's hat etiquette", url: "https://www.gentlemansgazette.com/mens-hat-etiquette-guide/" },
        { titolo: "Mr Porter – How to tie a scarf", url: "https://www.mrporter.com/en-it/journal/fashion/how-to-tie-a-scarf-691732" },
        { titolo: "Swaine – Gentleman's etiquette: umbrellas", url: "https://swaine.london/blogs/journal/gentlemans-etiquette-umbrellas" },
      ],
    },
  ],
};
