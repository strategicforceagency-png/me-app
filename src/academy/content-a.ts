import type { Course } from "./types";

/* ================================================================== */
/* 1. VESTIRSI BENE                                                    */
/* ================================================================== */
export const vestirsi: Course = {
  id: "vestirsi",
  titolo: "Vestirsi bene",
  sottotitolo: "Vestibilità, dress code, colori e il guardaroba che funziona",
  icona: "shirt",
  lezioni: [
    {
      id: "vestibilita",
      titolo: "La vestibilità perfetta",
      minuti: 6,
      intro: "Un capo da 80 € che ti sta perfetto batte un capo da 800 € della taglia sbagliata. La vestibilità è la prima regola dell'eleganza.",
      blocks: [
        { t: "fig", fig: { k: "jacketFit", caption: "I 5 punti da controllare in una giacca" } },
        { t: "h", text: "La giacca" },
        {
          t: "steps",
          items: [
            { titolo: "Spalle", text: "La cucitura finisce esattamente dove finisce la tua spalla. Se vedi un avvallamento sotto la spalla è grande, se tira è piccola. Le spalle non si sistemano dal sarto: sceglile bene in negozio." },
            { titolo: "Collo", text: "Il collo della giacca appoggia su quello della camicia, senza staccarsi quando ti muovi. Della camicia devono vedersi circa 1–1,5 cm sopra il bavero." },
            { titolo: "Maniche", text: "Con le braccia lungo i fianchi deve uscire circa 1 cm di polsino della camicia (tra 0,5 e 1,5 cm, a seconda dei gusti). Si accorciano facilmente dal sarto." },
            { titolo: "Bottone", text: "Chiuso, il bottone non deve formare una X di pieghe sul petto. Se tira, la giacca è stretta." },
            { titolo: "Lunghezza", text: "Deve coprire il sedere. Con le braccia rilassate, l'orlo arriva circa all'altezza delle nocche." },
          ],
        },
        { t: "h", text: "La camicia" },
        {
          t: "list",
          items: [
            "Collo: chiuso, ci passano due dita, non di più.",
            "Spalle: cucitura sull'osso della spalla.",
            "Polsino: arriva all'attaccatura del pollice; aderente quanto basta per non scivolare sulla mano.",
            "Busto: niente vele sui fianchi né bottoni che tirano. Se esce dai pantaloni quando alzi le braccia, è corta.",
          ],
        },
        { t: "h", text: "Il pantalone" },
        {
          t: "list",
          items: [
            "Vita: sta su da solo senza cintura; la cintura completa, non sostiene.",
            "Cavallo: niente pieghe a ventaglio né tessuto che cade.",
            "Lunghezza (\"break\"): oggi si porta senza piega o con una piega leggera sulla scarpa. Mai il tessuto accumulato a fisarmonica.",
          ],
        },
        { t: "tip", text: "Il sarto è il tuo miglior alleato: orli, maniche e fianchi costano poco e cambiano tutto. Spalle e lunghezza della giacca invece vanno giuste in partenza." },
      ],
      fonti: [
        { titolo: "T.M. Lewin – How a suit should fit", url: "https://tmlewin.co.uk/blogs/the-fitting-room/how-a-suit-should-fit" },
        { titolo: "Savile Row Co – How a dress shirt should fit", url: "https://savilerowco.com/blogs/news/how-a-mens-formal-shirt-should-fit" },
        { titolo: "QuiFinanza – Il galateo dell'uomo elegante", url: "https://quifinanza.it/info-utili/galateo-uomo-elegante/137875/amp/" },
      ],
    },
    {
      id: "dress-code",
      titolo: "I dress code dalla A alla Z",
      minuti: 5,
      intro: "Leggere bene l'invito ti evita di essere l'unico in jeans o l'unico in smoking.",
      blocks: [
        {
          t: "table",
          head: ["Dress code", "Cosa indossare", "Scarpe"],
          rows: [
            ["White tie (Cravatta bianca)", "Frac nero, gilet e papillon bianchi. Rarissimo: gala di Stato, balli ufficiali", "Vernice nera"],
            ["Black tie (Cravatta nera)", "Smoking nero o blu notte, camicia bianca, papillon nero annodato a mano, fascia o gilet (mai entrambi)", "Oxford nera lucida o vernice"],
            ["Formale / Cerimonia", "Abito scuro (blu, grigio antracite), camicia bianca, cravatta", "Oxford nera o marrone scuro"],
            ["Business formal", "Abito blu o grigio, camicia bianca o azzurra, cravatta sobria", "Oxford o derby nera/marrone scuro"],
            ["Business casual", "Giacca senza cravatta, pantalone in lana o chino, camicia o maglia fine", "Derby, mocassino, monk"],
            ["Smart casual", "Jeans scuro o chino, camicia, polo in maglia o maglione; giacca facoltativa", "Mocassino, chelsea, sneaker pulita in pelle"],
            ["Casual", "Libero, ma curato: capi puliti e della tua taglia", "Sneaker, scarpe in camoscio"],
          ],
        },
        { t: "tip", text: "Nel dubbio vestiti un gradino sopra il richiesto: puoi sempre togliere la cravatta, non puoi aggiungerla." },
        { t: "h", text: "Indizi nell'invito" },
        {
          t: "list",
          items: [
            "Orario: la sera (tradizionalmente dopo le 18, o dal tramonto) l'abito si scurisce (blu notte, antracite); lo smoking è solo da sera.",
            "Luogo: in spiaggia o in campagna lino, cotone e colori chiari; in città e al chiuso lana e toni scuri.",
            "Matrimonio di giorno: abito chiaro o blu, mai il nero (in Italia è tradizionalmente da sera o da lutto).",
          ],
        },
      ],
      fonti: [
        { titolo: "Wikipedia – Black tie", url: "https://en.wikipedia.org/wiki/Black_tie" },
        { titolo: "Wikipedia – White tie", url: "https://en.wikipedia.org/wiki/White_tie" },
        { titolo: "Gieves & Hawkes – A gentleman's guide to black tie", url: "https://www.gievesandhawkes.com/blogs/journal/a-gentlemans-guide-to-black-tie" },
        { titolo: "VelvetStyle – Cosa non indossare a un matrimonio", url: "https://www.velvetstyle.it/2024/06/19/10-cose-da-non-indossare-mai-ad-un-matrimonio-non-commettere-mai-questi-errori" },
      ],
    },
    {
      id: "colori",
      titolo: "Colori, fantasie e abbinamenti",
      minuti: 5,
      intro: "Con pochi principi puoi abbinare qualsiasi cosa senza pensarci troppo.",
      blocks: [
        { t: "h", text: "La base neutra" },
        { t: "p", text: "Blu navy, grigio (dal perla all'antracite), bianco, azzurro, beige/cammello e marrone si abbinano tutti tra loro. Costruisci l'80% del guardaroba su questi colori, poi aggiungi un accento." },
        { t: "h", text: "La regola dei tre colori" },
        { t: "p", text: "Massimo tre colori principali per outfit (le sfumature dello stesso colore valgono come uno). Esempio: blu (abito) + bianco (camicia) + bordeaux (cravatta)." },
        { t: "h", text: "Fantasie" },
        {
          t: "list",
          items: [
            "Una fantasia è sempre sicura, due vanno bene, tre richiedono esperienza.",
            "Se abbini due fantasie, cambia la scala: riga sottile sulla camicia + cravatta a disegno più grande.",
            "Il capo più vicino al viso (camicia, cravatta) guida lo sguardo: lì va il colore che ti valorizza.",
          ],
        },
        {
          t: "dodont",
          si: ["Cintura dello stesso colore delle scarpe", "Metalli coordinati (orologio, fibbia, gemelli)", "Contrasto medio tra giacca e pantalone se spezzato"],
          no: ["Giacca e pantalone di due grigi o due blu simili (sembra un abito sbagliato)", "Calzini bianchi con abito", "Camicia nera con cravatta nera di giorno"],
        },
      ],
      fonti: [
        { titolo: "Permanent Style – Density of pattern", url: "https://www.permanentstyle.com/2008/12/density-of-pattern.html" },
        { titolo: "Gentleman's Gazette – Pairing belts, shoes and metals", url: "https://www.gentlemansgazette.com/pair-belts-shoes-metal/" },
      ],
    },
    {
      id: "bottoni",
      titolo: "I bottoni della giacca",
      minuti: 3,
      intro: "Una regola semplice che tradisce subito chi non la conosce.",
      blocks: [
        { t: "fig", fig: { k: "buttons", caption: "Quali bottoni allacciare" } },
        {
          t: "list",
          items: [
            "Due bottoni: allacci quello in alto, mai quello in basso.",
            "Tre bottoni: quello centrale sempre, quello in alto a scelta, quello in basso mai (\"a volte, sempre, mai\").",
            "Un bottone: sempre allacciato quando sei in piedi.",
            "Doppiopetto: allacciato quando sei in piedi (bottone di vita e bottone interno); il bottone in basso di solito resta aperto.",
            "Gilet: tutti allacciati tranne l'ultimo (salvo i gilet tagliati per essere chiusi del tutto, come molti con il fondo dritto).",
          ],
        },
        { t: "tip", text: "Quando ti siedi slaccia la giacca monopetto; riallacciala quando ti alzi. Il doppiopetto per tradizione resta chiuso anche da seduti, ma non è una regola rigida: c'è chi lo slaccia per comodità." },
      ],
      fonti: [
        { titolo: "Permanent Style – Button the waist button", url: "https://www.permanentstyle.com/?p=718" },
        { titolo: "Art of Manliness – Sometimes, always, never", url: "https://www.artofmanliness.com/style/clothing/the-sometimes-always-never-3-button-rule/" },
        { titolo: "Put This On – Double-breasted when seated?", url: "https://putthison.com/?p=12698" },
        { titolo: "Mental Floss – Origine della regola dei bottoni", url: "https://www.mentalfloss.com/culture/fashion-beauty/whats-origin-sometimes-always-never-rule-buttoning-suit" },
      ],
    },
    {
      id: "capsula",
      titolo: "Il guardaroba capsula",
      minuti: 5,
      intro: "Venti capi ben scelti valgono più di cento capi a caso: ogni pezzo si abbina con quasi tutti gli altri.",
      blocks: [
        {
          t: "table",
          head: ["Categoria", "I capi essenziali"],
          rows: [
            ["Abiti e giacche", "Abito blu navy, abito grigio medio, blazer blu, giacca spezzata in lana o tweed"],
            ["Camicie", "2 bianche, 2 azzurre, 1 oxford button-down, 1 in lino per l'estate"],
            ["Maglieria", "Girocollo blu e grigio in merino, dolcevita, cardigan, polo in maglia"],
            ["Pantaloni", "Grigio in flanella, 2 chino (beige e blu), jeans scuro senza lavaggi"],
            ["Capispalla", "Cappotto blu o cammello, trench o giubbotto in camoscio"],
            ["Scarpe", "Oxford nera, derby o brogue marrone scuro, mocassino, sneaker in pelle bianca"],
            ["Accessori", "Cintura nera e marrone, 3–4 cravatte, pochette bianca, orologio sobrio"],
          ],
        },
        { t: "tip", text: "Prima di comprare chiediti: \"Con quanti capi che ho già lo posso abbinare?\". Se la risposta è meno di tre, lascialo in negozio. La sezione Stile di Habitus lo calcola per te." },
      ],
      fonti: [
        { titolo: "Permanent Style – The staples of a good wardrobe", url: "https://www.permanentstyle.com/2014/08/the-staples-of-a-good-wardrobe.html" },
        { titolo: "Gentleman's Gazette – 10 items every man should own", url: "https://www.gentlemansgazette.com/10-mens-clothing-must-haves/" },
      ],
    },
  ],
};

/* ================================================================== */
/* 2. GALANTERIA E GALATEO                                             */
/* ================================================================== */
export const galateo: Course = {
  id: "galateo",
  titolo: "Galanteria e galateo",
  sottotitolo: "Gesti, presentazioni, la tavola e le buone maniere di oggi",
  icona: "sparkles",
  lezioni: [
    {
      id: "galanteria-basi",
      titolo: "I gesti della galanteria",
      minuti: 6,
      intro: "La galanteria non è un rituale antiquato: è attenzione verso l'altro. Fatta con naturalezza, senza ostentarla.",
      blocks: [
        {
          t: "list",
          items: [
            "Porta: aprila e tienila, lasciando passare prima lei (o chiunque arrivi dopo di te). Con le porte girevoli entri prima tu per avviarla.",
            "Ristorante e locali pubblici: secondo il galateo italiano classico l'uomo entra per primo, per farsi strada e accogliere; poi si scosta. Per alcuni esperti oggi la regola è più semplice: entra prima chi invita.",
            "Cappotto: aiutala a toglierlo e a indossarlo, tenendolo aperto all'altezza giusta.",
            "Sedia: scostala e accompagnala mentre si siede. Il posto migliore (vista sulla sala o sul panorama) è il suo.",
            "Per strada: tradizionalmente l'uomo cammina sul lato della strada.",
            "Scale: in salita resti un gradino dietro, in discesa un gradino avanti, pronto a sorreggerla.",
            "Ombrello: lo tieni tu, inclinato verso di lei.",
            "Auto: aprirle la portiera è un gesto che fa sempre effetto.",
          ],
        },
        { t: "tip", text: "Galanteria e rispetto vanno insieme: se lei preferisce fare da sé, non insistere. Il gesto conta, non il controllo." },
        {
          t: "dodont",
          si: ["Alzarti quando una persona arriva al tavolo", "Ascoltare senza interrompere", "Ricordare un dettaglio che ti ha raccontato"],
          no: ["Ostentare i gesti per farti notare", "Commentare l'aspetto fisico in modo pesante", "Guardare il telefono mentre ti parla"],
        },
      ],
      fonti: [
        { titolo: "Dissapore – ABC del galateo", url: "https://www.dissapore.com/grande-notizia/se-vuoi-sapere-tutto-di-una-persona-mangiaci-insieme-almeno-una-volta-abc-del-galateo/" },
        { titolo: "L'Unione Sarda – Il galateo secondo S. Briatore", url: "https://www.unionesarda.it/cultura/il-galateo-in-salsa-sarda-conosci-le-regole-oqxdlab5" },
        { titolo: "Gentleman's Gazette – How to walk like a gentleman", url: "https://www.gentlemansgazette.com/walk-like-a-gentleman/" },
        { titolo: "Miss Manners – Le scale (Spokesman-Review)", url: "https://www.spokesman.com/stories/2006/dec/08/woman-worries-man-is-checking-out-the-scenery" },
      ],
    },
    {
      id: "presentazioni",
      titolo: "Presentazioni, saluti e strette di mano",
      minuti: 4,
      intro: "I primi cinque secondi decidono la prima impressione.",
      blocks: [
        { t: "h", text: "Chi si presenta a chi" },
        {
          t: "list",
          items: [
            "Si presenta l'uomo alla donna, il più giovane al più anziano, chi ha un ruolo minore a chi ha un ruolo maggiore.",
            "A porgere la mano per primo è la donna, la persona più anziana o quella di grado più alto.",
            "Ci si alza sempre quando si viene presentati (le eccezioni sono solo per età o salute).",
            "Di' il tuo nome e cognome, chiaramente. Ripeti il nome dell'altro: \"Buonasera, Giulia\" o \"Molto lieto, Giulia\" ti aiuta a ricordarlo. Il galateo classico sconsiglia \"piacere\" (oggi è tollerato); si recupera al congedo: \"È stato un piacere\".",
          ],
        },
        { t: "h", text: "La stretta di mano" },
        {
          t: "steps",
          items: [
            { text: "Mano asciutta, avvicinati e guarda negli occhi." },
            { text: "Stringi con decisione, palmo contro palmo: né mano molle né morsa." },
            { text: "Due o tre secondi, una o due scosse leggere, poi lascia." },
            { text: "Sorridi. L'altra mano resta fuori dalla tasca." },
          ],
        },
        { t: "tip", text: "Il \"lei\" si usa con chi non conosci, con le persone più grandi e nel lavoro finché non è l'altro a proporre il \"tu\"." },
      ],
      fonti: [
        { titolo: "Velvet Mag – Bon ton delle presentazioni", url: "https://velvetmag.it/2023/02/26/bon-ton-delle-presentazioni-non-si-dice-mai-piacere" },
        { titolo: "Studenti.it – Perché dire \"piacere\" è un errore", url: "https://www.studenti.it/dire-piacere-errore-galateo-come-presentarsi-bon-ton.html" },
        { titolo: "Emily Post – Etiquette for a great handshake", url: "https://emilypost.com/advice/etiquette-for-a-great-handshake" },
      ],
    },
    {
      id: "tavola",
      titolo: "A tavola",
      minuti: 7,
      intro: "Sapersi muovere a tavola dice molto di te: a una cena di lavoro come a un primo appuntamento.",
      blocks: [
        { t: "fig", fig: { k: "table", caption: "L'apparecchiatura classica" } },
        {
          t: "list",
          items: [
            "Posate: forchette a sinistra, coltelli e cucchiaio a destra. Si usano dall'esterno verso il piatto, una coppia per portata. Quelle sopra il piatto sono per il dolce.",
            "Bicchieri: a destra, in alto, in ordine d'uso. Nell'apparecchiatura italiana il più grande è di solito quello dell'acqua.",
            "Pane: piattino in alto a sinistra. Il pane si spezza con le mani, un boccone alla volta, mai col coltello.",
            "Tovagliolo: appena seduto, piegato a metà sulle gambe. Si usa per tamponare le labbra prima di bere. A fine pasto lo lasci a sinistra del piatto, senza ripiegarlo.",
          ],
        },
        { t: "fig", fig: { k: "cutlery", caption: "Come comunicare con le posate" } },
        {
          t: "dodont",
          si: ["Aspettare che tutti siano serviti prima di iniziare", "Portare il cibo alla bocca, non la bocca al piatto", "Mani sul tavolo (polsi appoggiati), gomiti giù"],
          no: ["Il telefono sul tavolo", "Tagliare tutta la carne in anticipo", "Il coltello in bocca o usato per il pesce (c'è la sua posata)", "Parlare con la bocca piena"],
        },
        { t: "tip", text: "Il brindisi: si alza il calice, tenuto per lo stelo, guardando negli occhi; per il galateo i bicchieri non si toccano (il tintinnio si tollera solo tra amici). Brindare con l'acqua si evita per tradizione, ma è una superstizione più che una regola di galateo." },
      ],
      fonti: [
        { titolo: "Neff – Apparecchiare secondo il galateo", url: "https://www.neff-home.com/it/the-ingredient/tips-tricks/come-si-apparecchia-la-tavola-secondo-il-galateo" },
        { titolo: "Vorwerk – Galateo a tavola", url: "https://www.vorwerk.com/it/it/c/home/idee-e-ricette/magazine/bimby/lifestyle/galateo-a-tavola-regole-di-bon-ton" },
        { titolo: "Il Post – Come si brinda", url: "https://www.ilpost.it/2023/12/31/brindisi-capodanno-brindare/" },
        { titolo: "Dissapore – ABC del galateo", url: "https://www.dissapore.com/grande-notizia/se-vuoi-sapere-tutto-di-una-persona-mangiaci-insieme-almeno-una-volta-abc-del-galateo/" },
      ],
    },
    {
      id: "conto-regali",
      titolo: "Il conto, i regali e i ringraziamenti",
      minuti: 4,
      intro: "Le situazioni più delicate si gestiscono con discrezione.",
      blocks: [
        { t: "h", text: "Il conto" },
        {
          t: "list",
          items: [
            "Chi invita paga: è la regola più semplice e più attuale.",
            "Al primo appuntamento offrire è un gesto apprezzato; se lei insiste per dividere, rispetta la scelta senza discutere.",
            "Paga con discrezione: alzati con una scusa e salda alla cassa, così il conto non arriva mai al tavolo.",
            "Mancia in Italia: non obbligatoria. Per un servizio ottimo lascia il 5–10% o arrotonda.",
          ],
        },
        { t: "h", text: "Se sei invitato a casa" },
        {
          t: "list",
          items: [
            "Non arrivare mai a mani vuote: una bottiglia di vino, dei dolci di qualità o dei fiori.",
            "Fiori: in numero dispari e preferibilmente inviati prima o il giorno dopo; evita i crisantemi (in Italia sono legati ai defunti).",
            "Il vino che porti è un regalo: non aspettarti che venga aperto quella sera.",
            "Il giorno dopo un messaggio o una chiamata per ringraziare.",
          ],
        },
      ],
      fonti: [
        { titolo: "Visit Italy – Mance in Italia", url: "https://www.visititaly.eu/it/magazine/cosa-fare-in-italia/mance-in-italia-quando-quanto" },
        { titolo: "Emily Post – All about hosting gifts", url: "https://emilypost.substack.com/p/etiquette-today-all-about-hosting" },
        { titolo: "greenMe – Crisantemo, il fiore dei morti", url: "https://www.greenme.it/?p=816803" },
      ],
    },
    {
      id: "digitale",
      titolo: "Buone maniere digitali",
      minuti: 3,
      intro: "Il galateo vale anche su WhatsApp, al telefono e sui social.",
      blocks: [
        {
          t: "dodont",
          si: [
            "Telefono in tasca o in borsa durante cene e appuntamenti",
            "Rispondere ai messaggi entro la giornata, anche solo per dire \"ti rispondo domani\"",
            "Chiedere \"posso chiamarti?\" prima di una chiamata non programmata di lavoro",
            "Vocali brevi, solo con chi li gradisce",
          ],
          no: [
            "Vocali di più minuti nel lavoro",
            "Messaggi dopo le 21 per questioni non urgenti",
            "Vivavoce in pubblico",
            "Pubblicare foto di altri senza chiedere",
          ],
        },
      ],
      fonti: [
        { titolo: "Emily Post – Il cellulare in pubblico", url: "https://emilypost.com/advice/answering-your-cell-phone-in-public" },
        { titolo: "Washington Post (via Boston.com) – Phone call etiquette", url: "https://www.boston.com/news/national-news/2023/09/25/the-new-phone-call-etiquette-text-first-and-never-leave-a-voice-mail/" },
        { titolo: "AARP – Speakerphone etiquette", url: "https://www.aarp.org/family-relationships/modern-manners-speakerphone-etiquette/" },
      ],
    },
  ],
};

/* ================================================================== */
/* 3. CRAVATTE E DETTAGLI                                              */
/* ================================================================== */
export const cravatte: Course = {
  id: "cravatte",
  titolo: "Cravatte, pochette e gemelli",
  sottotitolo: "I nodi passo passo e i dettagli che fanno la differenza",
  icona: "tie",
  lezioni: [
    {
      id: "cravatta-scelta",
      titolo: "Scegliere e portare la cravatta",
      minuti: 4,
      intro: "Prima del nodo: lunghezza, larghezza e il nodo giusto per il tuo colletto.",
      blocks: [
        { t: "fig", fig: { k: "tieLength", caption: "Lunghezza e fermacravatta" } },
        {
          t: "list",
          items: [
            "Lunghezza: la punta tocca la fibbia della cintura. Più corta o più lunga si nota subito.",
            "Larghezza: proporzionata ai revers della giacca. Lo standard è 7–8,5 cm; più stretta su giacche con revers sottili.",
            "La parte stretta non deve sporgere sotto quella larga: infilala nel passante sul retro.",
            "Fossetta: la piccola piega sotto il nodo. Si crea premendo col dito mentre stringi.",
          ],
        },
        { t: "fig", fig: { k: "knots", caption: "Il nodo va scelto in base al colletto" } },
        {
          t: "table",
          head: ["Colletto", "Nodo consigliato"],
          rows: [
            ["Classico o stretto (punte vicine)", "Semplice (Four-in-hand)"],
            ["Francese o italiano (aperto)", "Mezzo Windsor o Pratt"],
            ["Molto aperto (cutaway)", "Windsor (per alcuni anche il Pratt)"],
            ["Button-down", "Semplice, con cravatta in maglia o lana"],
          ],
        },
      ],
      fonti: [
        { titolo: "Effortless Gent – The perfect fit: ties", url: "https://effortlessgent.com/perfect-fit-ties/" },
        { titolo: "Real Men Real Style – Tie width guide", url: "https://www.realmenrealstyle.com/tie-width-guide/" },
        { titolo: "Wikipedia – Windsor knot", url: "https://en.wikipedia.org/wiki/Windsor_knot" },
        { titolo: "Gentleman's Gazette – Pratt (Shelby) knot", url: "https://www.gentlemansgazette.com/pratt-knott-shelby-knot-how-to-tie/" },
      ],
    },
    {
      id: "nodo-semplice",
      titolo: "Nodo semplice (Four-in-hand)",
      minuti: 3,
      intro: "Probabilmente il nodo più usato al mondo: stretto, leggermente asimmetrico, va bene quasi sempre.",
      blocks: [
        {
          t: "steps",
          items: [
            { text: "Cravatta intorno al collo, colletto alzato. La parte larga a destra, più bassa di circa 30 cm della stretta.", fig: { k: "tie", p: { pose: "start" } } },
            { text: "Incrocia la parte larga davanti alla stretta, verso sinistra.", fig: { k: "tie", p: { pose: "cross" } } },
            { text: "Passala dietro la parte stretta, tornando a destra.", fig: { k: "tie", p: { pose: "behind" } } },
            { text: "Ripassala davanti, da destra a sinistra: hai formato la fascia del nodo.", fig: { k: "tie", p: { pose: "front" } } },
            { text: "Portala su, da sotto, dentro l'anello attorno al collo.", fig: { k: "tie", p: { pose: "up" } } },
            { text: "Infilala giù dentro la fascia frontale e tira. Tieni ferma la parte stretta e fai scorrere il nodo verso il collo, creando la fossetta.", fig: { k: "tie", p: { pose: "done" } } },
          ],
        },
        { t: "tip", text: "Se la punta viene troppo lunga, rifai il nodo partendo con la parte larga più in alto di 2–3 cm. Al secondo tentativo sarà perfetta." },
      ],
      fonti: [
        { titolo: "Wikipedia – Four-in-hand knot", url: "https://en.wikipedia.org/wiki/Four-in-hand_knot" },
        { titolo: "Animated Knots – Four-in-hand", url: "https://www.animatedknots.com/tie-a-four-in-hand-necktie-knot" },
      ],
    },
    {
      id: "mezzo-windsor",
      titolo: "Mezzo Windsor",
      minuti: 4,
      intro: "Simmetrico, di media grandezza: il nodo più versatile per l'ufficio e le cerimonie.",
      blocks: [
        {
          t: "steps",
          items: [
            { text: "Parte larga a destra, più bassa di circa 30 cm.", fig: { k: "tie", p: { pose: "start" } } },
            { text: "Incrocia la parte larga davanti alla stretta, verso sinistra.", fig: { k: "tie", p: { pose: "cross" } } },
            { text: "Passala dietro la parte stretta verso destra.", fig: { k: "tie", p: { pose: "behind" } } },
            { text: "Portala su verso il collo e falla scendere dentro l'anello, dal davanti, sul lato destro.", fig: { k: "tie", p: { pose: "loopR" } } },
            { text: "Ripassala davanti al nodo, da destra a sinistra.", fig: { k: "tie", p: { pose: "front" } } },
            { text: "Portala su da sotto, dentro l'anello del collo.", fig: { k: "tie", p: { pose: "up" } } },
            { text: "Infilala giù nella fascia frontale e stringi con calma, modellando la fossetta.", fig: { k: "tie", p: { pose: "done-wide" } } },
          ],
        },
      ],
      fonti: [
        { titolo: "Wikipedia – Half-Windsor knot", url: "https://en.wikipedia.org/wiki/Half-Windsor_knot" },
        { titolo: "Eton – How to tie a half Windsor", url: "https://www.etonshirts.com/journal/guides/how-to-tie-a-half-windsor-knot" },
        { titolo: "Mr Porter – How to tie a half-Windsor", url: "https://www.mrporter.com/en-pl/journal/fashion/how-to-tie-a-half-windsor-knot-681706" },
      ],
    },
    {
      id: "windsor",
      titolo: "Windsor",
      minuti: 4,
      intro: "Il nodo largo e triangolare: per colletti molto aperti e occasioni formali. Richiede una cravatta un po' più lunga.",
      blocks: [
        {
          t: "steps",
          items: [
            { text: "Parte larga a destra, più bassa di circa 35 cm.", fig: { k: "tie", p: { pose: "start" } } },
            { text: "Incrocia la parte larga davanti alla stretta, verso sinistra.", fig: { k: "tie", p: { pose: "cross" } } },
            { text: "Portala su da sotto nell'anello del collo e falla scendere a sinistra.", fig: { k: "tie", p: { pose: "loopL" } } },
            { text: "Passala dietro la parte stretta, verso destra.", fig: { k: "tie", p: { pose: "behind" } } },
            { text: "Portala su verso il collo e falla scendere dentro l'anello sul lato destro.", fig: { k: "tie", p: { pose: "loopR" } } },
            { text: "Ripassala davanti al nodo, da destra a sinistra.", fig: { k: "tie", p: { pose: "front" } } },
            { text: "Su da sotto, dentro l'anello del collo.", fig: { k: "tie", p: { pose: "up" } } },
            { text: "Giù nella fascia frontale. Stringi gradualmente: il Windsor si modella, non si tira di colpo.", fig: { k: "tie", p: { pose: "done-wide" } } },
          ],
        },
        { t: "tip", text: "Il Windsor su un colletto stretto sembra schiacciato: in quel caso torna al nodo semplice." },
      ],
      fonti: [
        { titolo: "Wikipedia – Windsor knot", url: "https://en.wikipedia.org/wiki/Windsor_knot" },
        { titolo: "The Knots Manual – Windsor knot", url: "https://theknotsmanual.com/necktie-knots/windsor/" },
      ],
    },
    {
      id: "pratt",
      titolo: "Nodo Pratt",
      minuti: 3,
      intro: "Pulito e simmetrico, una via di mezzo tra semplice e mezzo Windsor. Si parte con la cravatta rovesciata.",
      blocks: [
        {
          t: "steps",
          items: [
            { text: "Cravatta al collo con la cucitura verso l'esterno (rovesciata), parte larga a destra.", fig: { k: "tie", p: { pose: "start-seam" } } },
            { text: "Passa la parte larga sotto la stretta, verso sinistra.", fig: { k: "tie", p: { pose: "under" } } },
            { text: "Portala su, dentro l'anello del collo, e falla scendere: ora la cucitura è nascosta.", fig: { k: "tie", p: { pose: "loopL" } } },
            { text: "Ripassala davanti al nodo, da sinistra verso destra, coprendolo tutto.", fig: { k: "tie", p: { pose: "frontR" } } },
            { text: "Su da sotto nell'anello del collo.", fig: { k: "tie", p: { pose: "up" } } },
            { text: "Giù nella fascia frontale e stringi.", fig: { k: "tie", p: { pose: "done" } } },
          ],
        },
      ],
      fonti: [
        { titolo: "Wikipedia – Pratt knot", url: "https://en.wikipedia.org/wiki/Pratt_knot" },
        { titolo: "Gentleman's Gazette – Pratt (Shelby) knot", url: "https://www.gentlemansgazette.com/pratt-knott-shelby-knot-how-to-tie/" },
      ],
    },
    {
      id: "papillon",
      titolo: "Il papillon da annodare",
      minuti: 4,
      intro: "Con lo smoking il papillon si annoda a mano: quella leggera imperfezione è il segno di classe.",
      blocks: [
        { t: "fig", fig: { k: "bowtie" } },
        {
          t: "steps",
          items: [
            { text: "Regola il papillon sulla misura del tuo collo. Mettilo con il lato sinistro più lungo di qualche centimetro (in genere 3–5 cm)." },
            { text: "Incrocia il lato lungo sopra il corto e portalo su da sotto, attraverso il collo, come il primo passaggio di un nodo." },
            { text: "Piega il lato corto (quello in basso) a metà nella sua parte larga e mettilo orizzontale: è la parte frontale del fiocco." },
            { text: "Lascia cadere il lato lungo davanti, sopra il centro del fiocco." },
            { text: "Piega il lato lungo a metà, nella sua parte larga, e spingilo dietro la parte frontale, attraverso l'anello che si è formato dietro." },
            { text: "Sistema tirando delicatamente le pieghe dei due lati fino a che il fiocco è stretto e bilanciato." },
          ],
        },
        { t: "tip", text: "Esercitati attorno alla gamba (sulla coscia), con la stessa logica di un fiocco delle scarpe. Dopo tre volte ti viene da solo." },
      ],
      fonti: [
        { titolo: "Art of Manliness – How to tie a bow tie", url: "https://www.artofmanliness.com/style/accessories/how-to-tie-a-bow/" },
        { titolo: "The Tie Bar – How to tie a bow tie", url: "https://www.thetiebar.com/how-to-tie/bow-tie" },
        { titolo: "Gieves & Hawkes – A gentleman's guide to black tie", url: "https://www.gievesandhawkes.com/blogs/journal/a-gentlemans-guide-to-black-tie" },
      ],
    },
    {
      id: "pochette",
      titolo: "La pochette: 4 pieghe",
      minuti: 4,
      intro: "Il dettaglio che trasforma una giacca qualunque in una giacca elegante.",
      blocks: [
        { t: "fig", fig: { k: "pocket" } },
        {
          t: "table",
          head: ["Piega", "Come si fa", "Quando"],
          rows: [
            ["Dritta (TV)", "Piega in 4, poi a misura del taschino; sporge 1–1,5 cm, linea orizzontale", "Business, cerimonie, smoking (bianca, in lino o seta)"],
            ["Una punta", "Piega a triangolo, porta gli angoli laterali al centro e infila", "Classica e versatile"],
            ["Tre punte", "Triangolo, poi angoli laterali sollevati sfalsati ai lati della punta centrale", "Cerimonie, eventi formali"],
            ["A sbuffo", "Prendi il fazzoletto dal centro, chiudi la mano e infila le punte nel taschino", "Seta, informale-elegante, sera"],
          ],
        },
        {
          t: "dodont",
          si: ["Pochette bianca in lino: sta bene con tutto", "Richiamare un colore della cravatta o della camicia", "Lino e cotone per pieghe nette, seta per lo sbuffo"],
          no: ["Pochette e cravatta identiche (set coordinato)", "Pochette troppo sporgente", "Pochette con giacche da lavoro molto tecniche o sportive"],
        },
      ],
      fonti: [
        { titolo: "Turnbull & Asser – How to fold a pocket square", url: "https://turnbullandasser.com/blogs/off-the-cuff/how-to-fold-a-pocket-square" },
        { titolo: "Real Men Real Style – How to fold a pocket square", url: "https://www.realmenrealstyle.com/how-to-fold-a-pocket-square/" },
        { titolo: "QuiFinanza – Il galateo dell'uomo elegante", url: "https://quifinanza.it/info-utili/galateo-uomo-elegante/137875/amp/" },
      ],
    },
    {
      id: "gemelli",
      titolo: "Gemelli e fermacravatta",
      minuti: 4,
      intro: "Piccoli gioielli maschili: si portano con sobrietà.",
      blocks: [
        { t: "p", text: "I gemelli si usano solo con il polsino doppio (\"alla francese\") o con camicie predisposte con due asole. Il polsino si piega su se stesso e di solito i due lembi si uniscono affiancati \"a bacio\", lato interno contro lato interno; la chiusura sovrapposta, come un normale polsino, esiste ma è meno classica." },
        { t: "fig", fig: { k: "frenchCuff" } },
        { t: "fig", fig: { k: "cufflinks", caption: "I tipi di gemelli" } },
        {
          t: "table",
          head: ["Tipo", "Formalità"],
          rows: [
            ["A catenella", "Il più classico ed elegante"],
            ["A barretta girevole", "Il più pratico, va bene sempre"],
            ["Fissi", "Eleganti, semplici da mettere"],
            ["Nodi di seta", "Informali, perfetti per il business casual"],
          ],
        },
        { t: "h", text: "Il fermacravatta" },
        {
          t: "list",
          items: [
            "Si mette tra il terzo e il quarto bottone della camicia.",
            "Pinza entrambe le parti della cravatta e la camicia sottostante.",
            "Non deve essere più largo della cravatta (idealmente circa 3/4).",
            "Stesso metallo di gemelli e orologio.",
          ],
        },
      ],
      fonti: [
        { titolo: "Real Men Real Style – Guide to cufflinks", url: "https://www.realmenrealstyle.com/ultimate-guide-cufflinks/" },
        { titolo: "The Tie Bar – Tie bar placement rules", url: "https://www.thetiebar.com/blogs/faqs/tie-bar-placement-rules" },
        { titolo: "Gentleman's Gazette – Pairing belts, shoes and metals", url: "https://www.gentlemansgazette.com/pair-belts-shoes-metal/" },
      ],
    },
  ],
};
