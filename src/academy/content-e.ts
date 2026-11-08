import type { Course } from "./types";

/* ================================================================== */
/* PROFUMI                                                             */
/* ================================================================== */
export const profumi: Course = {
  id: "profumi",
  titolo: "Profumi",
  sottotitolo: "Leggere un profumo, sceglierlo, indossarlo con misura e costruire il proprio guardaroba olfattivo",
  icona: "spray",
  lezioni: [
    {
      id: "come-e-fatto",
      titolo: "Come è fatto un profumo",
      minuti: 6,
      intro: "Note di testa, cuore e fondo, e le grandi famiglie olfattive: il vocabolario minimo per capire cosa ti piace e spiegarlo in profumeria.",
      blocks: [
        { t: "p", text: "Un profumo cambia nel tempo sulla pelle. Le materie più volatili si sentono subito e svaniscono presto, quelle più pesanti restano per ore. Per descriverlo si usa da sempre l'immagine della **piramide olfattiva**." },
        {
          t: "table",
          head: ["Livello", "Quando si sente", "Note tipiche"],
          rows: [
            ["Testa", "I primi 10–20 minuti", "Agrumi (bergamotto, limone), erbe aromatiche, spezie fresche"],
            ["Cuore", "Da mezz'ora a qualche ora", "Fiori (iris, lavanda, geranio), spezie calde, note verdi"],
            ["Fondo", "Ore, a volte fino al giorno dopo", "Legni (cedro, sandalo, vetiver), muschi, ambra, vaniglia, cuoio"],
          ],
        },
        { t: "tip", text: "Molti profumi moderni sono \"lineari\": cambiano poco dall'inizio alla fine. Per questo un profumo va giudicato dopo un'ora, mai al primo spruzzo." },
        { t: "h", text: "Le famiglie olfattive" },
        { t: "p", text: "La classificazione più usata dai professionisti è la **ruota delle fragranze** di Michael Edwards, che divide i profumi in quattro grandi famiglie, ciascuna con sottofamiglie." },
        {
          t: "list",
          items: [
            "**Fresca**: agrumata (le colonie), aromatica (lavanda, rosmarino), acquatica, verde. La più facile da portare di giorno e d'estate.",
            "**Floreale**: dai fiori puri a quelli più cipriati come l'iris, molto usato nella profumeria maschile classica.",
            "**Ambrata** (un tempo detta \"orientale\"): resine, vaniglia, spezie calde. Avvolgente, da sera e da inverno.",
            "**Legnosa**: vetiver, cedro, sandalo, patchouli, muschio di quercia e cuoio. Il cuore della profumeria maschile.",
          ],
        },
        { t: "p", text: "Due nomi storici tornano spesso: la **fougère** (\"felce\": lavanda, cumarina e muschio di quercia, da cui discendono molti classici da barbiere) e lo **chypre** (bergamotto, labdano, muschio di quercia: elegante, asciutto, adulto)." },
        { t: "tip", text: "Esercizio: annota i tre profumi che ti sono piaciuti di più nella vita e cerca la loro famiglia. Quasi sempre ne viene fuori un filo comune: è il punto di partenza del tuo guardaroba olfattivo." },
      ],
      fonti: [
        { titolo: "Fragrances of the World – La ruota delle fragranze di Michael Edwards", url: "https://www.fragrancesoftheworld.com/" },
        { titolo: "Rituals – Guida alle famiglie olfattive", url: "https://www.rituals.com/en-gb/mag/home-and-lifestyle/a-deep-dive-into-fragrance-families-3pdTDq11bKzL2B3NW3W1xP" },
        { titolo: "Scent Beauty – Fragrance families explained", url: "https://scentbeauty.com/blogs/scent-101/scent-101-fragrance-families-explained" },
      ],
    },
    {
      id: "concentrazioni",
      titolo: "Colonia, toilette, parfum",
      minuti: 4,
      intro: "Cosa cambia davvero tra eau de cologne, eau de toilette, eau de parfum ed extrait, e perché il prezzo non dice tutto.",
      blocks: [
        { t: "p", text: "Il nome indica, in modo approssimativo, quanta essenza è disciolta nell'alcol. Non esiste una legge che fissi le percentuali: ogni maison fa a modo suo, quindi i valori sono indicativi." },
        {
          t: "table",
          head: ["Nome", "Essenza (indicativa)", "Carattere"],
          rows: [
            ["Eau fraîche / Eau de Cologne", "circa 1–5%", "Leggera, rinfrescante, dura poco: perfetta d'estate e dopo la doccia"],
            ["Eau de Toilette", "circa 5–15%", "Il formato classico maschile: presente ma discreto"],
            ["Eau de Parfum", "circa 15–20%", "Più ricca e duratura, scia più ampia"],
            ["Parfum / Extrait", "circa 20–30% e oltre", "Densa e vicina alla pelle: poche gocce bastano"],
          ],
        },
        {
          t: "list",
          items: [
            "**Più concentrato non vuol dire più forte**: un extrait spesso resta vicino alla pelle, mentre certe toilette \"proiettano\" di più.",
            "La stessa fragranza in versione EdT ed EdP può avere **note diverse**, non solo intensità diversa: provale entrambe.",
            "La durata dipende anche dalla tua pelle (la pelle secca trattiene meno), dal clima e dalle materie prime: gli agrumi svaniscono presto in qualunque concentrazione.",
          ],
        },
      ],
      fonti: [
        { titolo: "Scento – Perfume concentrations explained", url: "https://scento.com/blog/perfume-concentrations-explained-from-edt-to-extrait" },
        { titolo: "Fragplace – EDT vs EDP vs Parfum vs Cologne", url: "https://fragplace.com/blog/understanding-fragrance-concentrations-edt-vs-edp-vs-parfum-vs-cologne" },
      ],
    },
    {
      id: "indossarlo",
      titolo: "Indossarlo con misura",
      minuti: 5,
      intro: "Il profumo di un gentleman si scopre avvicinandosi, non entra nella stanza prima di lui.",
      blocks: [
        {
          t: "steps",
          items: [
            { titolo: "Dopo la doccia", text: "Sulla pelle pulita e asciutta. Una crema neutra prima aiuta la pelle secca a trattenere il profumo." },
            { titolo: "Dove", text: "Base del collo, petto, dietro le orecchie, interno dei polsi: zone calde che diffondono lentamente." },
            { titolo: "Quanto", text: "Da 2 a 4 spruzzi per una eau de toilette, 1–2 per una eau de parfum, una goccia per un extrait. Se dopo dieci minuti non lo senti più, non è svanito: ti sei abituato tu." },
            { titolo: "Senza strofinare", text: "Lascialo asciugare da solo: sfregare i polsi scalda e affretta le note di testa." },
            { titolo: "Sui vestiti, con cautela", text: "Sulla lana dura a lungo, ma può macchiare seta e tessuti chiari: spruzza da una spanna di distanza o all'interno della giacca." },
          ],
        },
        { t: "h", text: "Il galateo del profumo" },
        {
          t: "dodont",
          si: ["Più leggero in ufficio, in palestra, in ospedale e nei luoghi chiusi", "Un profumo che si sente solo durante un abbraccio o una stretta di mano", "A cena, scie discrete: il cibo e il vino devono profumare più di te", "Rinnovarlo a metà giornata solo se è una colonia"],
          no: ["Spruzzare in ascensore o in auto con altri", "Coprire il sudore invece di lavarsi", "Mescolare profumo, deodorante e dopobarba profumati diversi: sceglili neutri o della stessa linea", "Usare il profumo di sera per il colloquio di lavoro del mattino"],
        },
      ],
      fonti: [
        { titolo: "Fashion-Era – How to apply perfume", url: "https://fashion-era.com/perfumes/how-to-apply-perfume" },
        { titolo: "Typology – Come usare correttamente il profumo", url: "https://us.typology.com/library/how-to-use-perfume-correctly" },
      ],
    },
    {
      id: "stagioni-occasioni",
      titolo: "Stagioni e occasioni",
      minuti: 4,
      intro: "Come i vestiti, anche i profumi hanno un peso: leggero d'estate e di giorno, più strutturato d'inverno e di sera.",
      blocks: [
        {
          t: "table",
          head: ["Momento", "Famiglie adatte", "Esempi di note"],
          rows: [
            ["Estate, giorno", "Fresca agrumata, aromatica, acquatica", "Bergamotto, neroli, limone, verbena, rosmarino"],
            ["Ufficio", "Legnosa leggera, floreale cipriata, aromatica", "Iris, vetiver, tè, cedro, lavanda"],
            ["Sera e appuntamenti", "Legnosa, ambrata, chypre", "Sandalo, ambra, vaniglia secca, spezie, cuoio"],
            ["Inverno", "Ambrata, legnosa scura, cuoio, tabacco", "Tabacco, oud leggero, incenso, fava tonka"],
            ["Cerimonie", "Classici eleganti e discreti", "Fougère, chypre, iris"],
          ],
        },
        { t: "tip", text: "Con il caldo i profumi si amplificano: d'estate dimezza le dosi dei profumi invernali, oppure passa alle colonie." },
      ],
      fonti: [{ titolo: "Everfumed – Fragrance families and when to wear them", url: "https://everfumed.com/?p=58142" }],
    },
    {
      id: "guardaroba-olfattivo",
      titolo: "Il guardaroba olfattivo",
      minuti: 5,
      intro: "Non servono trenta flaconi: bastano una firma e pochi profumi che coprono le tue giornate.",
      blocks: [
        {
          t: "list",
          items: [
            "**La firma**: il profumo che le persone associano a te. Versatile, adatto all'ufficio e alla sera.",
            "**Il fresco**: una colonia o un agrumato per l'estate e il weekend.",
            "**Il serale**: più caldo e profondo, per cene e inverno.",
            "**Facoltativi**: uno sportivo leggero, uno da grandi occasioni.",
          ],
        },
        { t: "h", text: "Comprare con la testa" },
        {
          t: "list",
          items: [
            "Prima di un flacone grande, prova per **qualche giorno** un campione o un decant (piccole quantità travasate e vendute da negozi specializzati).",
            "Conta il **costo per spruzzo**: un flacone da 100 ml contiene più o meno mille spruzzi.",
            "Diffida dei prezzi troppo bassi online: i falsi sono comuni. Compra da profumerie autorizzate o dal sito della maison.",
            "Le formule cambiano: per rispettare le norme di sicurezza dell'IFRA (l'associazione internazionale dei profumi) alcune materie, come il muschio di quercia, sono state limitate. Un classico di oggi può essere diverso da quello di trent'anni fa.",
          ],
        },
      ],
      fonti: [{ titolo: "IFRA – International Fragrance Association", url: "https://ifrafragrance.org/" }],
    },
    {
      id: "provare-comprare",
      titolo: "Provare un profumo",
      minuti: 4,
      intro: "In profumeria si sbaglia quasi sempre per fretta: ecco come provare senza farsi confondere.",
      blocks: [
        {
          t: "steps",
          items: [
            { titolo: "Scremare sulla mouillette", text: "Le strisce di carta servono a scartare: annusale dopo qualche secondo, non appena spruzzate." },
            { titolo: "Al massimo tre", text: "Dopo tre o quattro profumi il naso si stanca e tutto si confonde." },
            { titolo: "Sulla pelle solo i finalisti", text: "Uno per polso. Esci dal negozio." },
            { titolo: "Aspetta", text: "Annusa dopo mezz'ora e dopo tre ore: il fondo è quello che porterai tutto il giorno." },
            { titolo: "Decidi il giorno dopo", text: "Se ci ripensi ancora, è quello giusto." },
          ],
        },
        { t: "tip", text: "I chicchi di caffè in profumeria servono a poco: per \"pulire\" il naso è meglio annusare la propria pelle pulita o uscire all'aria aperta." },
      ],
      fonti: [{ titolo: "Cyprus Mail – Consigli per provare e applicare il profumo", url: "https://archive.cyprus-mail.com/?p=347479" }],
    },
    {
      id: "conservare",
      titolo: "Conservarlo",
      minuti: 3,
      intro: "Luce, calore e aria sono i nemici del profumo: il bagno è il posto peggiore dove tenerlo.",
      blocks: [
        {
          t: "list",
          items: [
            "Nella sua scatola, in un armadio o in un cassetto: buio e temperatura stabile.",
            "Lontano dal bagno (vapore e sbalzi di temperatura) e dal davanzale.",
            "Tieni il tappo chiuso: l'ossigeno ossida le note di testa.",
            "Molti profumi restano integri per anni se conservati bene; quelli agrumati invecchiano prima. Segnali di decadimento: odore acido o di smalto all'apertura, colore molto più scuro.",
          ],
        },
      ],
      fonti: [{ titolo: "Scento – Guida alle concentrazioni e alla conservazione", url: "https://scento.com/blog/perfume-concentrations-explained-from-edt-to-extrait" }],
    },
    {
      id: "classici",
      titolo: "Le case e i classici del gentleman",
      minuti: 6,
      intro: "Da Jermyn Street a Firenze: le case storiche e alcuni profumi maschili che hanno fatto scuola.",
      blocks: [
        { t: "h", text: "Le case storiche" },
        {
          t: "table",
          head: ["Casa", "Dove e quando", "Perché conta"],
          rows: [
            ["Floris", "Londra, Jermyn Street, dal 1730", "Profumiere dei gentiluomini di St James's: No. 89 è un classico da barbiere inglese"],
            ["Penhaligon's", "Londra, dal 1870", "Nata da un barbiere di corte; Blenheim Bouquet (1902) è agrumato, pulito, intramontabile"],
            ["Geo. F. Trumper", "Londra, Mayfair, dal 1875", "Barbiere e profumiere: colonie e acque da toeletta"],
            ["Truefitt & Hill", "Londra, dal 1805", "Tra i barbieri più antichi del mondo"],
            ["Officina Profumo-Farmaceutica di Santa Maria Novella", "Firenze, aperta al pubblico dal 1612", "Antica spezieria dei frati domenicani, colonie e acque storiche"],
            ["Acqua di Parma", "Parma, dal 1916", "La Colonia: agrumi italiani, lavanda, rosmarino; un'eleganza molto italiana"],
          ],
        },
        { t: "h", text: "Alcuni classici maschili" },
        {
          t: "list",
          items: [
            "**Guerlain Vétiver** (1959): vetiver asciutto e pulito, da ufficio e da abito.",
            "**Dior Eau Sauvage** (1966): agrumi e aromatiche, il fresco elegante per eccellenza.",
            "**Chanel Pour Monsieur** (1955): chypre agrumato, sobrio e adulto.",
            "**Acqua di Parma Colonia** (1916): la colonia italiana classica.",
            "**Penhaligon's Blenheim Bouquet** (1902): agrumi e pino, molto inglese.",
          ],
        },
        { t: "tip", text: "Annusare i classici educa il naso: anche se poi sceglierai altro, capirai meglio da dove viene la profumeria moderna." },
      ],
      fonti: [
        { titolo: "Floris London", url: "https://www.florislondon.com/" },
        { titolo: "Penhaligon's", url: "https://www.penhaligons.com/" },
        { titolo: "Officina Profumo-Farmaceutica di Santa Maria Novella", url: "https://www.smnovella.com/" },
        { titolo: "Acqua di Parma", url: "https://www.acquadiparma.com/" },
      ],
    },
  ],
};

/* ================================================================== */
/* PELLETTERIA                                                         */
/* ================================================================== */
export const pelletteria: Course = {
  id: "pelletteria",
  titolo: "Borse e pelletteria",
  sottotitolo: "24 ore, cartelle, borse da viaggio, cinture e piccola pelletteria: riconoscere la qualità e farla durare",
  icona: "briefcase",
  lezioni: [
    {
      id: "conoscere-pelle",
      titolo: "Riconoscere una buona pelle",
      minuti: 6,
      intro: "Pieno fiore, crosta, rigenerata: le parole sull'etichetta e i segni che rivelano la qualità prima del prezzo.",
      blocks: [
        {
          t: "table",
          head: ["Tipo", "Cos'è", "Come invecchia"],
          rows: [
            ["Pieno fiore (full grain)", "Lo strato esterno integro, con la grana naturale", "Il migliore: sviluppa patina e dura decenni"],
            ["Fiore corretto (top grain)", "Fiore levigato e rifinito per uniformarlo", "Buono, più regolare ma meno vivo"],
            ["Crosta (split)", "Lo strato interno, spesso goffrato o scamosciato", "Più debole; ottima solo come scamosciato ben fatto"],
            ["Pelle rigenerata (bonded)", "Scarti di pelle macinati e incollati", "Si sfalda presto: da evitare"],
          ],
        },
        { t: "p", text: "In Italia il **decreto legislativo 68/2020** riserva i termini \"pelle\" e \"cuoio\" ai materiali ottenuti davvero da pelle animale conciata: i materiali sintetici o vegetali non possono chiamarsi pelle. Diffida comunque della scritta \"vera pelle\" usata come unico argomento di vendita: dice che è pelle, non che è buona." },
        { t: "h", text: "Concia vegetale e al cromo" },
        {
          t: "list",
          items: [
            "**Al cromo**: la più diffusa. Pelle morbida, colori uniformi, resiste bene all'acqua.",
            "**Vegetale**: con tannini naturali, lenta e artigianale (la Toscana ne è una capitale). Più rigida all'inizio, profumata, si scurisce e prende una patina bellissima.",
          ],
        },
        { t: "h", text: "I segni della qualità" },
        {
          t: "dodont",
          si: ["Cuciture fitte, regolari, a punto sellaio (due aghi: se un punto si rompe non si disfa tutto)", "Bordi lisci, tinti o ripiegati con cura", "Ferramenta pesante, in ottone pieno o acciaio", "Odore di pelle, non di chimica", "Fodera ben fissata"],
          no: ["Bordi gommosi che si spaccano", "Superficie plastificata e lucida in modo uniforme", "Cerniere leggere che si inceppano", "Loghi grandi al posto della qualità"],
        },
      ],
      fonti: [
        { titolo: "Certifico – Decreto legislativo 9 giugno 2020, n. 68 (cuoio, pelle, pelliccia)", url: "https://certifico.com/news/news-consumer/decreto-legislativo-9-giugno-2020-n-68" },
        { titolo: "Camera di Commercio di Bologna – Uso dei termini pelle, cuoio e pelliccia", url: "https://www.bo.camcom.gov.it/print/3097" },
        { titolo: "Will Leather Goods – Full grain, top grain e genuine leather", url: "https://willleathergoods.com/blogs/from-wills-desk/full-grain-top-grain-vs-genuine-leather" },
        { titolo: "Buffalo Jackson – Bonded vs genuine leather", url: "https://buffalojackson.com/blogs/insight/bonded-leather-vs-genuine-leather" },
      ],
    },
    {
      id: "borse-lavoro",
      titolo: "24 ore, cartella e borse da lavoro",
      minuti: 6,
      intro: "Ogni borsa ha il suo grado di formalità: sceglierla bene completa l'abito quanto le scarpe.",
      blocks: [
        {
          t: "table",
          head: ["Borsa", "Com'è", "Con cosa"],
          rows: [
            ["24 ore (attaché case)", "Rigida, squadrata, apertura a scatto: nata per un viaggio d'affari di un giorno", "Abito formale, ambienti istituzionali"],
            ["Cartella (briefcase)", "Morbida o semirigida, manici e spesso tracolla staccabile", "Abito e giacca: la più versatile"],
            ["Porta documenti", "Sottile, senza manici, si porta sotto il braccio", "Riunioni, abito, look minimale"],
            ["Messenger", "A tracolla, più informale", "Smart casual"],
            ["Zaino in pelle", "Pulito, senza loghi vistosi", "Smart casual e spostamenti in bici o a piedi"],
          ],
        },
        {
          t: "list",
          items: [
            "**Colore**: marrone scuro e nero sono i più versatili; il cuoio chiaro è più estivo e informale.",
            "**Abbinamento**: stessa famiglia di colore di scarpe e cintura, non per forza identica.",
            "**Dimensione**: proporzionata al corpo e a quello che porti; una borsa enorme e vuota appesantisce la figura.",
            "**Con l'abito portala a mano**: la tracolla stropiccia la spalla della giacca e ne deforma la linea.",
            "Svuotala ogni sera: una borsa gonfia perde forma in pochi mesi.",
          ],
        },
        { t: "h", text: "Viaggio" },
        { t: "p", text: "Per il fine settimana, il **borsone** (holdall o duffle) in pelle, o in tela con finiture in pelle, è il compagno classico del gentleman: entra nella cappelliera dell'aereo e accompagna bene sia il blazer sia il cappotto." },
      ],
      fonti: [
        { titolo: "Floto – Come curare una borsa in pelle", url: "https://floto.com/blogs/news/4-steps-to-care-for-your-leather-briefcase" },
        { titolo: "Kirby Allison – Caring for leather bags and briefcases", url: "https://help.kirbyallison.com/en-US/caring-for-leather-bags-and-briefcases-866069" },
      ],
    },
    {
      id: "cintura",
      titolo: "La cintura",
      minuti: 4,
      intro: "Piccola, ma sempre in vista: larghezza, fibbia e colore dicono molto dell'attenzione ai dettagli.",
      blocks: [
        {
          t: "table",
          head: ["Occasione", "Larghezza", "Stile"],
          rows: [
            ["Abito", "Circa 3–3,5 cm", "Pelle liscia o leggermente martellata, fibbia piccola e semplice"],
            ["Smart casual", "Circa 3,5 cm", "Scamosciato, pelle con grana, intrecciata"],
            ["Casual", "3,5–4 cm", "Tela, cuoio grezzo, intrecciata elastica"],
          ],
        },
        {
          t: "list",
          items: [
            "**Colore**: segue le scarpe (nero con nero, marrone con marrone, tonalità vicine).",
            "**Metallo**: la fibbia si accorda con orologio, gemelli e fermacravatta (argento con acciaio, oro con oro).",
            "**Misura**: deve chiudersi sul foro centrale, senza una coda lunga oltre il primo passante.",
            "**Bretelle o cintura, mai entrambe**: i pantaloni da abito più classici hanno bottoni per le bretelle e niente passanti.",
            "Con un gilet o un abito ben tagliato in vita, le bretelle fanno cadere meglio il pantalone.",
          ],
        },
      ],
      fonti: [
        { titolo: "Mr Porter – How to choose the right belt", url: "https://www.mrporter.com/daily/how-to-choose-the-right-belt/1326" },
        { titolo: "Garmany – Belt rules 101", url: "https://www.garmany.com/buckle-up-belt-rules-101/" },
      ],
    },
    {
      id: "piccola-pelletteria",
      titolo: "Portafoglio e piccola pelletteria",
      minuti: 4,
      intro: "Portafoglio, porta carte, portachiavi, porta biglietti da visita: sottili, ordinati, coordinati.",
      blocks: [
        {
          t: "list",
          items: [
            "**Portafoglio** a libro sottile: dentro il necessario, niente scontrini. Un portafoglio gonfio deforma la giacca e i pantaloni.",
            "**Mai nella tasca posteriore** dei pantaloni da abito: rovina la linea e la seduta. Va nella tasca interna della giacca.",
            "**Porta carte** per i giorni leggeri: tre o quattro carte e qualche banconota piegata.",
            "**Porta biglietti da visita**: offrire un biglietto pulito da un astuccio in pelle è un piccolo gesto di stile.",
            "**Portachiavi** in pelle, non un mazzo da custode: le chiavi pesanti bucano le tasche.",
          ],
        },
        { t: "tip", text: "Scegli un solo colore per la piccola pelletteria (marrone scuro o nero): si abbina a tutto e sembra pensata, non accumulata." },
      ],
      fonti: [{ titolo: "Will Leather Goods – Guida alla pelle", url: "https://willleathergoods.com/blogs/from-wills-desk/full-grain-top-grain-vs-genuine-leather" }],
    },
    {
      id: "cura-pelle",
      titolo: "Prendersene cura",
      minuti: 4,
      intro: "Una borsa di buona pelle curata dura una vita e migliora con gli anni.",
      blocks: [
        {
          t: "steps",
          items: [
            { titolo: "Ogni settimana", text: "Spolvera con un panno morbido e asciutto." },
            { titolo: "Ogni 3–6 mesi", text: "Un velo di crema o balsamo nutriente adatto alla pelle liscia, provato prima in un angolo nascosto. Lascia assorbire e lucida con il panno." },
            { titolo: "Se si bagna", text: "Tampona e lascia asciugare a temperatura ambiente, imbottita di carta, mai vicino a termosifoni o al sole." },
            { titolo: "Scamosciato", text: "Spazzola apposita, gomma per le macchie, impermeabilizzante spray prima dell'uso." },
            { titolo: "Quando non la usi", text: "Imbottita per tenerne la forma, in un sacchetto di cotone traspirante, mai nella plastica." },
          ],
        },
        { t: "tip", text: "La patina, cioè l'insieme di piccoli segni e sfumature che la pelle prende con l'uso, è un valore: non cercare di cancellarla." },
      ],
      fonti: [
        { titolo: "Buffalo Jackson – Leather bag care", url: "https://buffalojackson.com/blogs/insight/leather-bag-care" },
        { titolo: "Sage Brown – Leather care guide", url: "https://sagebrown.co.uk/blogs/news/leather-care-guide-how-to-look-after-your-leather-bags-and-accessories" },
      ],
    },
    {
      id: "comprare-pelletteria",
      titolo: "Comprare bene, con ogni budget",
      minuti: 4,
      intro: "Dove vale la pena spendere, dove si può risparmiare e dove cercare.",
      blocks: [
        {
          t: "table",
          head: ["Priorità", "Perché", "Consiglio"],
          rows: [
            ["Borsa da lavoro", "La usi ogni giorno ed è sempre in vista", "Spendi qui: pieno fiore e cuciture buone"],
            ["Cintura", "Costa poco in più per una qualità molto superiore", "Una nera e una marrone in pelle piena per l'abito"],
            ["Portafoglio", "Si consuma e si vede poco", "Qualità media va bene, purché sottile"],
            ["Borsone da viaggio", "Si usa meno spesso", "Anche tela e pelle: più leggero e meno caro"],
          ],
        },
        {
          t: "list",
          items: [
            "Gli **artigiani italiani** (Firenze e la Toscana per la concia vegetale, ma anche piccoli laboratori nella tua città) offrono spesso qualità migliore dei marchi a parità di prezzo.",
            "**Usato e vintage**: una buona cartella in pelle piena, rinfrescata da un artigiano, può costare un terzo del nuovo.",
            "Fai i conti con il **costo per uso**: una borsa da 300 € usata ogni giorno per dieci anni costa meno di dieci centesimi al giorno.",
          ],
        },
      ],
      fonti: [{ titolo: "Tanner Bates – Not all leather is created equal", url: "https://www.tannerbates.co.uk/blogs/news/not-all-leather-is-created-equal-dont-get-caught-out" }],
    },
  ],
};
