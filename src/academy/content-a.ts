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
            { titolo: "Maniche", text: "Con le braccia lungo i fianchi deve uscire 1–1,5 cm di polsino della camicia. Si accorciano facilmente dal sarto." },
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
            ["Black tie (Cravatta nera)", "Smoking nero o blu notte, camicia bianca, papillon nero annodato a mano, fascia o gilet", "Oxford nera lucida o vernice"],
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
            "Orario: dopo le 19 l'abito si scurisce (blu notte, antracite, nero per lo smoking).",
            "Luogo: in spiaggia o in campagna lino, cotone e colori chiari; in città e al chiuso lana e toni scuri.",
            "Matrimonio di giorno: abito chiaro o blu, mai il nero (in Italia è tradizionalmente da sera o da lutto).",
          ],
        },
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
            "Doppiopetto: sempre allacciato; il bottone in basso di solito resta aperto.",
            "Gilet: tutti allacciati tranne l'ultimo.",
          ],
        },
        { t: "tip", text: "Quando ti siedi slaccia la giacca monopetto; riallacciala quando ti alzi. Il doppiopetto invece resta chiuso." },
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
            "Ristorante e locali pubblici: secondo il galateo italiano l'uomo entra per primo, per farsi strada e accogliere; poi si scosta.",
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
            "Di' il tuo nome e cognome, chiaramente. Ripeti il nome dell'altro: \"Piacere, Giulia\" ti aiuta a ricordarlo.",
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
            "Bicchieri: a destra, in alto. Il più grande è per l'acqua.",
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
        { t: "tip", text: "Il brindisi: si alza il calice guardando negli occhi; nelle occasioni formali i bicchieri non si toccano. Mai brindare con l'acqua." },
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
            ["Classico o stretto (punte vicine)", "Semplice (Four-in-hand) o Pratt"],
            ["Francese o italiano (aperto)", "Mezzo Windsor"],
            ["Molto aperto (cutaway)", "Windsor"],
            ["Button-down", "Semplice, con cravatta in maglia o lana"],
          ],
        },
      ],
    },
    {
      id: "nodo-semplice",
      titolo: "Nodo semplice (Four-in-hand)",
      minuti: 3,
      intro: "Il più usato al mondo: stretto, leggermente asimmetrico, va bene quasi sempre.",
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
            { text: "Regola il papillon sulla misura del tuo collo. Mettilo con il lato sinistro più lungo di circa 4 cm." },
            { text: "Incrocia il lato lungo sopra il corto e portalo su da sotto, attraverso il collo, come il primo passaggio di un nodo." },
            { text: "Piega il lato corto (quello in basso) a metà nella sua parte larga e mettilo orizzontale: è la parte frontale del fiocco." },
            { text: "Lascia cadere il lato lungo davanti, sopra il centro del fiocco." },
            { text: "Piega il lato lungo a metà, nella sua parte larga, e spingilo dietro la parte frontale, attraverso l'anello che si è formato dietro." },
            { text: "Sistema tirando delicatamente le pieghe dei due lati fino a che il fiocco è stretto e bilanciato." },
          ],
        },
        { t: "tip", text: "Esercitati attorno alla gamba (sulla coscia), con la stessa logica di un fiocco delle scarpe. Dopo tre volte ti viene da solo." },
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
            ["Dritta (TV)", "Piega in 4, poi a misura del taschino; sporge 1–1,5 cm, linea orizzontale", "Business, cerimonie, smoking (in lino bianco)"],
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
    },
    {
      id: "gemelli",
      titolo: "Gemelli e fermacravatta",
      minuti: 4,
      intro: "Piccoli gioielli maschili: si portano con sobrietà.",
      blocks: [
        { t: "p", text: "I gemelli si usano solo con il polsino doppio (\"alla francese\") o con camicie predisposte con due asole. Il polsino si piega su se stesso e i due lembi si uniscono affiancati, lato interno contro lato interno, non sovrapposti come un normale polsino." },
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
    },
  ],
};
