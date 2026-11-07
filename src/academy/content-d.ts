import type { Course } from "./types";

/* ================================================================== */
/* GALATEO DI COPPIA                                                  */
/* ================================================================== */
export const coppia: Course = {
  id: "coppia",
  titolo: "Galateo di coppia",
  sottotitolo: "Dal primo invito alla vita insieme: come corteggiare, frequentarsi, amarsi e, se serve, lasciarsi con stile",
  icona: "heart",
  lezioni: [
    /* ------------------------------------------------------------ */
    {
      id: "primo-appuntamento",
      titolo: "Il primo appuntamento",
      minuti: 7,
      intro: "Invitare bene, scegliere il posto giusto, arrivare in orario e saper chiudere la serata: il primo appuntamento è un piccolo esame di stile, non di seduzione.",
      blocks: [
        { t: "p", text: "Il gentleman degli anni '60 non improvvisava: proponeva un programma chiaro, si presentava curato e metteva l'altra persona a suo agio. Oggi le regole sono più libere, ma il principio è lo stesso: **chi invita si prende cura della serata**. In queste lezioni parlo spesso di \"lei\" per comodità: i principi valgono per qualsiasi coppia." },
        { t: "h", text: "Invitare" },
        {
          t: "list",
          items: [
            "**Con quanto anticipo**: per un caffè o un aperitivo bastano due o tre giorni; per una cena del sabato chiedi entro mercoledì. L'invito per la sera stessa sa di ripiego.",
            "**Come**: a voce o con una telefonata è il massimo; un messaggio va benissimo se vi siete conosciuti in chat o lei preferisce scrivere. In ogni caso, **proposta concreta**: giorno, ora, posto.",
            "**Formula semplice**: “Mi piacerebbe rivederti. Ti va un aperitivo giovedì verso le sette, da [posto]?” Meglio di “Prima o poi usciamo?”.",
            "**Lascia una porta aperta**: “Se giovedì non va, dimmi tu un giorno che ti è comodo.” Così un no al giorno non diventa un no a te.",
          ],
        },
        { t: "h", text: "Scegliere il posto" },
        { t: "p", text: "In Italia il primo incontro è spesso leggero: un caffè, un aperitivo, una passeggiata, un gelato. La cena vera arriva più spesso al secondo o terzo appuntamento. Scegli un posto che conosci, dove si parla senza urlare e da cui è facile andare via se la serata non decolla." },
        {
          t: "dodont",
          si: ["Un locale tranquillo che hai già provato", "Un orario che lasci spazio per allungare (o chiudere) con naturalezza", "Un posto comodo da raggiungere anche per lei", "Prenotare, se serve: un tavolo pronto vale più di mille parole"],
          no: ["Il ristorante stellato per impressionare: mette pressione a entrambi", "Cinema o concerto: due ore senza parlarsi", "Casa tua come prima proposta", "Il locale dove tutti ti conoscono e ti salutano"],
        },
        { t: "h", text: "Puntualità" },
        {
          t: "fig",
          fig: {
            k: "punctuality",
            p: {
              rows: [
                { e: "Primo appuntamento", from: -5, to: 0 },
                { e: "Se passi a prenderla", from: -2, to: 0 },
                { e: "Cena a casa di altri", from: 5, to: 10 },
              ],
            },
            caption: "Al primo appuntamento arrivi tu per primo",
          },
        },
        { t: "p", text: "Arrivare qualche minuto prima ti permette di scegliere il tavolo e di accoglierla, invece di farti cercare. Se sei in ritardo, avvisa **prima** dell'orario, non dopo: “Scusami, sono bloccato nel traffico, arrivo per le 19:15. Ti ho prenotato al tavolo a nome mio.”" },
        { t: "h", text: "Cosa indossare" },
        {
          t: "list",
          items: [
            "Un gradino sopra il locale, mai due: per un aperitivo, chino o pantalone di lana, camicia o polo in maglia, giacca destrutturata o blazer; scarpe pulite (mocassino, derby, sneaker in pelle minimale).",
            "Niente che richieda attenzione: loghi grandi, profumo eccessivo, accessori vistosi.",
            "Cura dei dettagli: barba o rasatura fresca, unghie in ordine, scarpe lucide. Sono le cose che si notano davvero.",
          ],
        },
        { t: "h", text: "La conversazione" },
        {
          t: "list",
          items: [
            "**Domande aperte**: “Cosa ti ha fatto scegliere il tuo lavoro?” rende più di “Ti piace il tuo lavoro?”.",
            "**Ascolta e rilancia**: riprendi un dettaglio che ha detto prima. È il complimento più elegante.",
            "**Equilibrio**: se ti accorgi che parli da dieci minuti, fermati e restituisci la parola.",
            "**Argomenti da evitare**: le ex, i soldi che guadagni, lamentele sul lavoro, politica in tono polemico.",
            "**Telefono**: in tasca, silenzioso, schermo mai sul tavolo.",
          ],
        },
        { t: "h", text: "Chi paga" },
        { t: "p", text: "È il punto più discusso, e non esiste una regola scolpita nel marmo. Ecco le tre scuole, tutte rispettabili:" },
        {
          t: "table",
          head: ["Approccio", "Regola", "Quando funziona"],
          rows: [
            ["Tradizione", "Paga l'uomo, almeno la prima volta", "Coppie che amano la galanteria classica; ancora diffusa in Italia"],
            ["Chi invita paga", "Paga chi ha proposto l'uscita, chiunque sia (è la posizione dell'Emily Post Institute)", "Sempre, ed è la più neutra per qualsiasi coppia"],
            ["Alla pari", "Alla romana o un giro a testa", "Dal secondo incontro in poi, o se lei lo propone con convinzione"],
          ],
        },
        {
          t: "list",
          items: [
            "Se hai invitato tu, **offri con naturalezza**, senza farne un caso: “Questa volta offro io, mi ha fatto piacere invitarti.”",
            "Il modo più elegante: alzati con una scusa e paga alla cassa prima che arrivi il conto al tavolo.",
            "Se lei insiste per dividere, **non trasformarlo in una battaglia**: “Va bene, allora il prossimo lo offro io.” Hai appena proposto un secondo incontro.",
            "Non usare il conto come test di carattere, in nessuna direzione.",
          ],
        },
        { t: "h", text: "Salutarsi" },
        {
          t: "list",
          items: [
            "Accompagnala alla macchina, al taxi o alla metro; se rientra a piedi di sera, offriti di accompagnarla fino a casa (senza pretendere di salire).",
            "Saluto sincero e breve: “Sono stato davvero bene, grazie della serata.”",
            "Bacio o abbraccio solo se i segnali sono chiari e reciproci. Nel dubbio, una stretta di mano calda o due baci sulle guance sono sempre corretti.",
          ],
        },
        { t: "tip", text: "Chiedile di scriverti quando è arrivata a casa. È un gesto semplice, protettivo senza essere invadente, e ti dà un pretesto naturale per il primo messaggio." },
      ],
      fonti: [
        { titolo: "CNBC – Lizzie Post (Emily Post Institute) su chi paga al primo appuntamento", url: "https://www.cnbc.com/2018/03/09/lizzy-post-settles-the-question-of-who-should-pay-on-a-1st-date.html" },
        { titolo: "Dissapore – Invito al ristorante: le regole del galateo contemporaneo", url: "https://www.dissapore.com/ristoranti/invito-a-cena-regole-doro-galateo/" },
        { titolo: "Think in Italian – Dating etiquette in Italy", url: "https://www.thinkinitalian.com/dating-etiquette-in-italy/" },
        { titolo: "CNBC – Who should pay for the first date? Experts weigh in", url: "https://www.cnbc.com/2024/04/16/who-should-pay-for-the-first-date-experts-weigh-in.html" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "dopo-il-primo-appuntamento",
      titolo: "Dopo il primo appuntamento",
      minuti: 5,
      intro: "Il messaggio del giorno dopo, quando scriverlo, come proporre di rivedersi e come dire di no senza ferire.",
      blocks: [
        { t: "p", text: "Le vecchie regole dei \"tre giorni di attesa\" sono strategia, non galateo. Il gentleman non gioca a fare il difficile: se è stato bene lo dice, con misura." },
        { t: "h", text: "Il messaggio del giorno dopo" },
        {
          t: "list",
          items: [
            "**Quando**: la sera stessa (dopo il suo “sono arrivata”) o entro il giorno successivo. Più aspetti, più il silenzio parla al posto tuo.",
            "**Cosa**: breve, specifico, senza pressione. Un dettaglio della serata vale più di un complimento generico.",
            "**Esempio**: “Grazie ancora per ieri sera, mi ha fatto ridere la storia del tuo viaggio in Portogallo. Mi piacerebbe rivederti.”",
            "**Evita**: il poema, la raffica di messaggi, la domanda “Allora, ti sono piaciuto?”.",
          ],
        },
        { t: "h", text: "Proporre di rivedersi" },
        {
          t: "steps",
          items: [
            { titolo: "Concreto", text: "Proponi un'idea legata a quello che vi siete detti: “Hai detto che non sei mai stata alla mostra di [nome]: ti va sabato pomeriggio?”" },
            { titolo: "Flessibile", text: "Offri un'alternativa: “Se sabato non riesci, dimmi tu quando.”" },
            { titolo: "Una volta sola", text: "Se la risposta è vaga (“vediamo”, “sono un po' incasinata”), lascia a lei la prossima mossa: “Nessun problema, quando ti va fammi sapere.” Poi non insistere." },
          ],
        },
        { t: "tip", text: "Tre risposte vaghe di fila sono una risposta. Prendila con eleganza: nessuno ti deve un secondo appuntamento, e nessun rimprovero migliora la situazione." },
        { t: "h", text: "Dire di no con garbo" },
        { t: "p", text: "Se tu non vuoi rivederla, non sparire. Un messaggio chiaro e gentile è sufficiente dopo uno o due incontri: ringrazia, dai una ragione vera ma non crudele, chiudi senza lasciare spiragli finti." },
        {
          t: "list",
          items: [
            "“Grazie per la serata, sei una persona piacevole. Sono stato sincero con me stesso e non sento la scintilla per andare avanti: preferisco dirtelo subito. Ti auguro il meglio.”",
            "“Mi ha fatto piacere conoscerti, ma non credo che siamo sulla stessa lunghezza d'onda. Grazie davvero del tempo.”",
          ],
        },
        {
          t: "dodont",
          si: ["Rispondere anche se la risposta è no", "Essere brevi e gentili", "Accettare un no con un semplice “Grazie per la sincerità”"],
          no: ["Inventare scuse elaborate (“sono sommerso dal lavoro” per sempre)", "Elencare i difetti dell'altra persona", "Proporre “restiamo amici” se non lo pensi", "Insistere o chiedere spiegazioni dopo un no"],
        },
        { t: "p", text: "Ricevere un no è parte del gioco. La risposta da gentleman è una sola riga, senza ironia: “Grazie per avermelo detto, in bocca al lupo.” Chi incassa con stile spesso fa più bella figura di chi ha fatto la serata perfetta." },
      ],
      fonti: [
        { titolo: "Emily Post – Texting manners", url: "https://emilypost.com/advice/texting-manners" },
        { titolo: "Emily Post – How to say no graciously", url: "https://emilypost.com/advice/how-to-say-no-graciously" },
        { titolo: "Psychology Today – Ghosting: the mental health effects", url: "https://psychologytoday.com/us/blog/hope-for-relationships/202408/ghosting-the-mental-health-effects" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "frequentazione",
      titolo: "Frequentazione e uscite occasionali",
      minuti: 6,
      intro: "Non ogni storia deve diventare un fidanzamento. Ma ogni storia merita chiarezza, rispetto e discrezione.",
      blocks: [
        { t: "p", text: "Ci si può frequentare senza impegno, vedersi ogni tanto, conoscersi con calma. Va tutto bene, a una condizione: che entrambi sappiano a che gioco state giocando. L'eleganza, qui, si chiama **onestà**." },
        { t: "h", text: "Chiarezza sulle intenzioni" },
        {
          t: "list",
          items: [
            "Dillo presto, senza aspettare che te lo chieda: “Mi piace vederti, ma in questo periodo non cerco una relazione seria. Preferisco essere chiaro.”",
            "Se le cose cambiano (in un senso o nell'altro), aggiornala. Le intenzioni di tre mesi fa non valgono per sempre.",
            "Non promettere quello che non sai di poter mantenere: viaggi futuri, presentazioni ai genitori, “un giorno noi due…”.",
            "Se vedi anche altre persone e lei pensa di no, non è libertà: è un equivoco che stai lasciando crescere.",
          ],
        },
        { t: "h", text: "Coerenza tra parole e fatti" },
        { t: "p", text: "Il gentleman si misura sui fatti. Se dici che ci tieni, lo dimostri: chiami quando hai detto che avresti chiamato, ti presenti all'orario concordato, ricordi le cose importanti che ti ha raccontato. Un appuntamento disdetto si recupera proponendo tu una nuova data, non con un “ci sentiamo”." },
        { t: "h", text: "Non sparire" },
        { t: "p", text: "Il ghosting, interrompere ogni contatto senza spiegazioni, lascia l'altra persona nel dubbio, la fa sentire confusa e abbandonata e intacca la fiducia anche nelle relazioni future. Bastano due righe per evitarlo." },
        {
          t: "list",
          items: [
            "Dopo qualche uscita: un messaggio chiaro e gentile (vedi lezione precedente).",
            "Dopo settimane o mesi: una telefonata o un incontro breve.",
            "Unica eccezione: se ti sei sentito in pericolo o la persona è stata aggressiva o molesta, sei libero di chiudere senza spiegazioni.",
          ],
        },
        { t: "h", text: "Consenso e rispetto dei tempi" },
        { t: "p", text: "Ogni passo, dal primo bacio in poi, si fa in due. Un principio semplice, usato anche nell'educazione sessuale, riassume cosa significa consenso:" },
        {
          t: "table",
          head: ["", "Significa"],
          rows: [
            ["Libero", "Nessuna pressione, insistenza o senso di colpa. Alcol in eccesso o sonno escludono il consenso."],
            ["Reversibile", "Si può cambiare idea in qualsiasi momento, anche a metà."],
            ["Informato", "Nessuna sorpresa nascosta: si sa a cosa si sta dicendo sì."],
            ["Entusiasta", "Un sì convinto, non un \"va be'\". Il silenzio non è un sì."],
            ["Specifico", "Un sì a una cosa non è un sì a tutto il resto."],
          ],
        },
        {
          t: "list",
          items: [
            "Chiedere non rovina il momento: “Ti va?” è una delle domande più seducenti che esistano.",
            "Se lei rallenta, rallenti anche tu, senza musi e senza domande insistenti.",
            "Non commentare i suoi tempi, né in positivo né in negativo: sono suoi.",
          ],
        },
        { t: "h", text: "Discrezione" },
        {
          t: "dodont",
          si: ["Tenere per te i dettagli intimi", "Rispettare se preferisce non farsi vedere in giro con te", "Chiedere prima di pubblicare qualsiasi foto insieme"],
          no: ["Raccontare agli amici cosa è successo (e come)", "Mostrare chat o foto private", "Parlare male di lei dopo, anche se è finita male"],
        },
        { t: "tip", text: "Il gentleman inglese non parlava mai delle sue conquiste. Non per falsa modestia: perché la storia non è solo sua. Vale ancora." },
      ],
      fonti: [
        { titolo: "Planned Parenthood – What is consent (FRIES)", url: "https://plannedparenthood.org/planned-parenthood-southwest-ohio/who-we-are/blog/what-is-consent" },
        { titolo: "Psychology Today – Ghosting: the mental health effects", url: "https://psychologytoday.com/us/blog/hope-for-relationships/202408/ghosting-the-mental-health-effects" },
        { titolo: "Psychology Today – Is there such a thing as friendly ghosting?", url: "https://psychologytoday.com/us/blog/dating-in-the-digital-age/202104/is-there-such-thing-friendly-ghosting" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "galateo-digitale",
      titolo: "Il galateo digitale di coppia",
      minuti: 5,
      intro: "Messaggi, vocali, social e telefono a tavola: le buone maniere passano anche dallo schermo.",
      blocks: [
        { t: "p", text: "Negli anni '60 c'erano il telefono fisso e le lettere. Oggi lo smartphone è sempre con noi, ed è facile che diventi il terzo incomodo della coppia. Le regole sono poche, ma fanno la differenza." },
        { t: "h", text: "Messaggi e tempi di risposta" },
        {
          t: "list",
          items: [
            "**Nessuno è tenuto a rispondere subito**: non sai mai cosa sta facendo l'altra persona. Non pretendere risposte immediate e non contare le spunte blu.",
            "**Ma non lasciare nel vuoto**: se sei preso, un “Sono in riunione, ti scrivo stasera” basta.",
            "**I messaggi brevi sono per la logistica**; i discorsi importanti si fanno a voce o al telefono.",
            "**Mai per le cose serie**: notizie tristi, discussioni e, soprattutto, chiusure di una relazione non si fanno per messaggio.",
            "**Vocali**: brevi (meno di un minuto) e non per tutto. Chiedi prima se li gradisce.",
            "**Rileggi prima di inviare**: il messaggio al destinatario sbagliato è un classico.",
          ],
        },
        { t: "h", text: "Il telefono a tavola" },
        { t: "p", text: "Ricercatori della Baylor University hanno studiato il \"phubbing\", trascurare il partner per guardare il telefono: più è frequente, più aumentano i conflitti e diminuisce la soddisfazione di coppia, soprattutto in chi è già insicuro nella relazione." },
        {
          t: "dodont",
          si: ["Telefono in tasca o in borsa durante cene e momenti a due", "Se aspetti una chiamata importante, dirlo all'inizio e scusarti quando rispondi", "Proporre momenti senza schermi, anche solo mezz'ora la sera"],
          no: ["Schermo appoggiato sul tavolo, anche a faccia in giù", "Scorrere i social mentre lei ti racconta la giornata", "Fotografare ogni piatto e scrivere la didascalia a tavola"],
        },
        { t: "h", text: "Social e foto" },
        {
          t: "list",
          items: [
            "**Chiedi sempre prima di pubblicare** una foto di lei o di voi due. Alcune persone hanno motivi validi (lavoro, famiglia, privacy) per non comparire.",
            "**Decidete insieme** quanto mostrare della coppia: c'è chi ama condividere e chi preferisce tenere tutto per sé. Il punto d'incontro si trova parlandone, non postando.",
            "**Lo stato \"fidanzato\"**: si annuncia quando siete d'accordo entrambi, non per mettere un timbro.",
            "**Niente controllo**: monitorare like, follower e ultimi accessi erode la fiducia. Se hai un dubbio, chiedi a voce.",
            "**Le liti restano offline**: niente frecciatine nelle storie o post allusivi.",
            "**Dopo la fine**: non pubblicare nulla contro l'altra persona. Archiviare le foto insieme è più elegante che cancellarle in diretta.",
          ],
        },
        { t: "h", text: "Privacy dentro la coppia" },
        { t: "p", text: "Condividere la vita non significa condividere i codici del telefono. Non si legge il telefono dell'altro, non si risponde alle sue chiamate senza permesso, non si apre la sua posta. Se la fiducia vacilla, il problema va affrontato parlando, non indagando." },
        { t: "tip", text: "Una regola semplice: se non diresti una cosa guardandola negli occhi, non scriverla. Se non vorresti che una foto fosse vista da sua madre, non pubblicarla." },
      ],
      fonti: [
        { titolo: "Psychology Today – Phubbing: when checking your cell hurts your relationship", url: "https://www.psychologytoday.com/us/blog/close-encounters/201510/phubbing-when-checking-your-cell-hurts-your-relationship" },
        { titolo: "Emily Post – Texting manners", url: "https://emilypost.com/advice/texting-manners" },
        { titolo: "Unobravo – Coppia e social: come tutelare la propria autenticità", url: "https://www.unobravo.com/salute-mentale/coppia-e-social-come-tutelare-la-propria-autenticita" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "fidanzamento",
      titolo: "Fidanzamento: famiglie, amici e cene a casa d'altri",
      minuti: 6,
      intro: "Quando la storia diventa seria entrano in scena le famiglie e gli amici. Qui si vede chi sei davvero.",
      blocks: [
        { t: "p", text: "In Italia, e al Sud più che altrove, conoscere la famiglia è un passaggio importante, spesso più precoce che nel resto d'Europa. Non serve recitare: serve essere la versione migliore e più educata di te stesso." },
        { t: "h", text: "Conoscere la sua famiglia" },
        {
          t: "steps",
          items: [
            { titolo: "Informati", text: "Chiedi a lei due o tre cose: come si chiamano, cosa amano, argomenti delicati da evitare, se in casa ci si dà del tu o del lei. Niente interrogatori, solo il necessario per non inciampare." },
            { titolo: "Vestiti un gradino sopra", text: "Curato ma sobrio: pantalone chino o di lana, camicia, scarpe in pelle. La cravatta solo se l'occasione lo richiede." },
            { titolo: "Non a mani vuote", text: "Un dolce di una buona pasticceria, una bottiglia scelta con cura o dei fiori per la padrona di casa. Chiedi a lei cosa è più gradito." },
            { titolo: "Saluta per primo", text: "Stretta di mano decisa, sguardo negli occhi, nome e sorriso. Dai del lei finché non ti propongono il tu; se ti invitano a usare il nome, fallo." },
            { titolo: "A tavola", text: "Complimenti sinceri per la cucina, una seconda porzione se ti va, telefono in tasca. Offriti di aiutare a sparecchiare; se rifiutano, non insistere." },
            { titolo: "Ringrazia", text: "Al momento dei saluti e, il giorno dopo, con un messaggio tramite lei o direttamente se avete il contatto." },
          ],
        },
        {
          t: "dodont",
          si: ["Fare domande sulla loro vita e ascoltare le risposte", "Ricordare i nomi di tutti, anche della nonna", "Mostrare rispetto per lei davanti a loro"],
          no: ["Politica, religione e soldi in tono polemico", "Effusioni eccessive davanti ai genitori", "Vantarti del tuo lavoro o di quanto guadagni", "Bere più di loro"],
        },
        { t: "h", text: "Presentarla alla tua famiglia" },
        {
          t: "list",
          items: [
            "**Preparala**: dille chi troverà, come sono, cosa aspettarsi (anche la zia che fa domande indiscrete).",
            "**Prepara i tuoi**: due parole su di lei, sul suo lavoro, su eventuali esigenze alimentari.",
            "**Non lasciarla sola**: soprattutto nella prima ora. Includila nelle conversazioni, traduci i riferimenti di famiglia.",
            "**Proteggila con tatto**: se arriva la domanda sul matrimonio o sui figli, rispondi tu con una battuta e cambia argomento.",
          ],
        },
        { t: "h", text: "I suoi amici" },
        { t: "p", text: "Gli amici di lei ti osservano più dei genitori. Mostrati interessato alle loro storie, non monopolizzare la serata e non isolarla dal gruppo per stare solo con te. Non serve diventare il migliore amico di tutti: basta essere una persona con cui si sta volentieri a tavola." },
        { t: "h", text: "Ospite a cena: le regole" },
        {
          t: "fig",
          fig: {
            k: "punctuality",
            p: {
              rows: [
                { e: "Cena a casa di altri", from: 5, to: 10 },
                { e: "Ristorante con i suoi", from: -5, to: 0 },
              ],
            },
            caption: "A casa d'altri, mai in anticipo",
          },
        },
        {
          t: "list",
          items: [
            "**Orario**: puntuale o con pochi minuti di ritardo, mai prima: chi ospita sta ancora preparando.",
            "**Cosa portare**: chiedi prima cosa serve, così non porti il quinto dolce. Il vino si porta come regalo, senza pretendere che venga aperto quella sera. Se porti un bianco, che sia già fresco.",
            "**I fiori**: belli, ma richiedono un vaso e attenzione mentre la padrona di casa è ai fornelli. Meglio farli recapitare il giorno prima o il giorno dopo, oppure portarli già in un piccolo vaso.",
            "**Da evitare**: arrivare a mani vuote, i cioccolatini riciclati, il dolce del supermercato dall'aria stanca.",
            "**Durante**: offriti di aiutare, ma rispetta un no. Non entrare in cucina se non invitato.",
            "**Dopo**: un messaggio di ringraziamento il giorno successivo. Una piccola cortesia rara, e per questo memorabile.",
          ],
        },
        { t: "tip", text: "Se vi fermate a dormire da loro: rifai il letto, lascia il bagno in ordine, chiedi prima di usare qualsiasi cosa e non fermarti più di quanto concordato. Un ospite discreto viene invitato di nuovo." },
      ],
      fonti: [
        { titolo: "The Gentleman's Journal – Come fare una buona prima impressione sui futuri suoceri", url: "https://www.thegentlemansjournal.com/it/article/come-fare-una-buona-prima-impressione-sui-futuri-suoceri/" },
        { titolo: "Italpress – Invitare ospiti a casa: le regole bon ton", url: "https://www.italpress.com/?p=278995" },
        { titolo: "Dissapore – Il galateo dell'ospite: cosa portare a cena", url: "https://www.dissapore.com/grande-notizia/regole-galateo-dellospite/" },
        { titolo: "Emily Post – The golden rules for houseguests", url: "https://emilypost.com/advice/the-golden-rules-for-houseguests" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "vita-insieme",
      titolo: "La vita insieme",
      minuti: 7,
      intro: "Convivenza o matrimonio: il galateo non finisce quando si condivide la casa. Anzi, comincia lì.",
      blocks: [
        { t: "p", text: "Le coppie si consumano raramente per un grande evento: più spesso per mille piccole disattenzioni. Le ricerche del Gottman Institute, che da decenni studiano le coppie, dicono la stessa cosa del galateo: **contano le piccole cose, fatte spesso**." },
        { t: "h", text: "Le cortesie quotidiane" },
        {
          t: "list",
          items: [
            "**Il saluto**: quando uno dei due rientra, ci si alza, ci si guarda, ci si saluta davvero. È il momento più importante della giornata.",
            "**Per favore e grazie**: anche per il caffè preparato o la spesa fatta. La familiarità non cancella la gratitudine.",
            "**Due minuti veri**: una breve conversazione al giorno senza schermi, su come state e cosa vi aspetta, vale più di un weekend distratto.",
            "**Rispondere alle piccole richieste di attenzione**: quando lei ti mostra qualcosa dalla finestra o ti racconta un dettaglio, girati verso di lei. Nello studio di Gottman le coppie ancora sposate dopo sei anni lo facevano circa l'86% delle volte, quelle divorziate circa il 33%.",
            "**Dividere la casa con equità**: non \"aiutare\", ma fare la tua parte, senza aspettare che te lo chieda.",
          ],
        },
        { t: "h", text: "Continuare a corteggiare" },
        {
          t: "list",
          items: [
            "Una sera a settimana solo per voi: fuori, o a casa con la tavola apparecchiata come per un'ospite.",
            "Un biglietto, un fiore senza motivo, il suo dolce preferito al ritorno dal lavoro.",
            "Continua a vestirti bene anche per lei, non solo per gli altri.",
            "Chiedi di lei come facevi all'inizio: progetti, sogni, preoccupazioni. Le persone cambiano, e vale la pena riconoscerla ogni volta.",
          ],
        },
        { t: "h", text: "Le ricorrenze" },
        { t: "p", text: "Compleanno, anniversario, la data del primo incontro se per voi conta: segnali in agenda. Non serve il regalo costoso, serve il pensiero preciso. E se non siete d'accordo su San Valentino (c'è chi lo ama e chi lo detesta), parlatene: la ricorrenza giusta è quella che piace a entrambi." },
        { t: "h", text: "Disaccordi con educazione" },
        { t: "p", text: "Litigare è normale; il punto è come. Gottman ha individuato quattro atteggiamenti che, se diventano abitudine, consumano la coppia, e il loro rimedio:" },
        {
          t: "table",
          head: ["Da evitare", "Esempio", "Al suo posto"],
          rows: [
            ["Critica", "“Sei il solito egoista”", "Parla del fatto, non della persona: “Mi è pesato restare solo con la cena”"],
            ["Disprezzo", "Sarcasmo, occhi al cielo, prese in giro", "Apprezzamento e rispetto, anche quando sei arrabbiato"],
            ["Difensività", "“Sì, ma tu allora…”", "Prenditi la tua parte: “Hai ragione, su questo ho sbagliato”"],
            ["Muro di silenzio", "Chiudersi e non rispondere più", "Chiedi una pausa e torna: “Ho bisogno di venti minuti, poi ne parliamo”"],
          ],
        },
        {
          t: "steps",
          items: [
            { titolo: "Inizia piano", text: "Le discussioni tendono a finire come cominciano. Parti da te: “Mi sento…”, “Ho bisogno di…”, invece di “Tu sempre…”, “Tu mai…”." },
            { titolo: "Un tema alla volta", text: "Non riaprire l'archivio degli ultimi cinque anni." },
            { titolo: "Mai in pubblico", text: "Né davanti agli amici, né davanti ai figli, né sui social. Si discute in privato, a voce bassa." },
            { titolo: "Ripara", text: "Una battuta, una mano sulla spalla, uno “scusa, ho esagerato”: i piccoli tentativi di riavvicinamento contano più di chi ha ragione." },
          ],
        },
        { t: "h", text: "Gli spazi di ciascuno" },
        { t: "p", text: "Vivere insieme non significa fare tutto insieme. Le serate con i tuoi amici, lo sport, un hobby, un'ora da solo: sono sani per entrambi. L'eleganza sta nel concordarli e nel rispettare quelli dell'altra: avvisare dei programmi, non trasformare ogni uscita in una trattativa, non chiedere conto di ogni minuto." },
        { t: "h", text: "Quando arriva un figlio" },
        { t: "p", text: "Secondo il Gottman Institute, circa due coppie su tre vedono calare la soddisfazione nei primi anni dopo il primo figlio. È normale, ed è proprio il momento in cui il galateo di coppia serve di più." },
        {
          t: "list",
          items: [
            "**Cura reciproca**: notti, pappe e pannolini si dividono. Non sei il \"vice\": sei l'altro genitore.",
            "**Piccoli gesti**: il caffè portato a letto dopo una notte difficile, un'ora di libertà regalata, un “Sei bravissima” detto al momento giusto.",
            "**Chiedile com'è andata la giornata**, non solo come sta il bambino.",
            "**Momenti di coppia**: anche venti minuti sul divano dopo che si è addormentato, o una cena fuori quando i nonni possono. Non aspettate che \"torni tutto come prima\": createvi un nuovo spazio.",
            "**Pazienza e gentilezza nelle discussioni**: con poco sonno le parole pesano il doppio.",
          ],
        },
        { t: "tip", text: "Ogni sera, prima di dormire, dille una cosa che hai apprezzato di lei quel giorno. Trenta secondi, nessun costo, effetti che si accumulano negli anni." },
      ],
      fonti: [
        { titolo: "Gottman Institute – Turn toward instead of away", url: "https://www.gottman.com/blog/turn-toward/" },
        { titolo: "Gottman Institute – The Four Horsemen", url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/" },
        { titolo: "Gottman Institute – Softening startup", url: "https://www.gottman.com/blog/softening-startup/" },
        { titolo: "Gottman Institute – 3 tips for couples to stay connected after baby", url: "https://www.gottman.com/blog/3-tips-for-couples-to-stay-connected-after-baby/?e-page-e7b509d=2" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "viaggiare-insieme",
      titolo: "Viaggiare insieme",
      minuti: 5,
      intro: "Il viaggio è la prova della verità di ogni coppia: stanchezza, imprevisti e ventiquattro ore insieme.",
      blocks: [
        { t: "p", text: "Si dice che, se vuoi conoscere davvero una persona, devi viaggiarci insieme. Lontano da casa emergono abitudini, ritmi e caratteri. Con un po' di metodo, il viaggio diventa il ricordo più bello invece della lite più lunga." },
        { t: "h", text: "Prima di partire" },
        {
          t: "steps",
          items: [
            { titolo: "Allinea le aspettative", text: "Tu sogni musei dalle nove del mattino, lei la spiaggia fino al tramonto? Ditevelo prima. Chiedi: “Com'è per te la giornata ideale di questa vacanza?”" },
            { titolo: "Organizzate insieme", text: "A turno, ognuno propone due o tre idee per ristoranti o attività. Nessuno fa l'organizzatore unico (e nessuno il passeggero che critica)." },
            { titolo: "Parlate di soldi", text: "Budget complessivo e come dividere: prima, non alla cassa dell'hotel." },
            { titolo: "Nomina le tue ansie", text: "Voli, guida all'estero, posti affollati: se sai cosa mette a disagio l'altra persona, puoi aiutarla." },
          ],
        },
        { t: "h", text: "Dividere le spese" },
        {
          t: "table",
          head: ["Modo", "Come funziona", "Adatto a"],
          rows: [
            ["Cassa comune", "Ognuno versa la stessa cifra; da lì si paga tutto", "Coppie stabili con redditi simili"],
            ["In proporzione", "Ognuno contribuisce in base al reddito", "Redditi molto diversi"],
            ["Divisione per voci", "Uno paga voli, l'altro hotel; si pareggia alla fine", "Chi ama la semplicità"],
            ["Chi invita offre", "Il regalo di compleanno, l'anniversario, la sorpresa", "Occasioni speciali, dichiarate come tali"],
          ],
        },
        { t: "p", text: "Non c'è un modo giusto: c'è il modo che avete scelto insieme. Quello che conta è che nessuno dei due si senta a disagio o in debito. Se usate un'app per i conti, regolate alla fine con discrezione, non scontrino per scontrino davanti al cameriere." },
        { t: "h", text: "Gli spazi in viaggio" },
        {
          t: "list",
          items: [
            "Concedetevi qualche ora per conto vostro: lei a fare shopping o in spa, tu a visitare il museo che a lei non interessa. Raccontarvelo a cena è parte del piacere.",
            "In camera: il bagno in ordine, le tue cose nella tua metà dell'armadio, la sveglia che non suona sei volte.",
            "Rispetta i ritmi: c'è chi ha bisogno di caffè e silenzio prima di parlare. Non è un affronto.",
          ],
        },
        { t: "h", text: "Gli imprevisti" },
        {
          t: "dodont",
          si: ["Mantenere la calma: il tuo tono decide il tono della giornata", "Cercare la soluzione prima del colpevole", "Riderci sopra appena possibile", "Avere sempre un piano B per pioggia o scioperi"],
          no: ["“Te l'avevo detto”", "Sfogare la stanchezza su di lei o sul personale", "Tenere il broncio per un ritardo che nessuno poteva evitare"],
        },
        { t: "tip", text: "Stanchezza, fame e caldo alimentano quasi tutte le liti in viaggio. Prima di discutere di qualcosa di importante, mangiate, bevete e sedetevi all'ombra. Spesso la discussione non serve più." },
      ],
      fonti: [
        { titolo: "Gottman Institute – A vacation survival guide for couples", url: "https://www.gottman.com/blog/a-vacation-survival-guide-for-couples/" },
        { titolo: "Psychology Today – If you really want to get to know a person, travel with them", url: "https://www.psychologytoday.com/us/blog/happy-trails/201411/if-you-really-want-to-get-to-know-a-person" },
        { titolo: "Gottman Institute – Softening startup", url: "https://www.gottman.com/blog/softening-startup/" },
      ],
    },
    /* ------------------------------------------------------------ */
    {
      id: "quando-finisce",
      titolo: "Quando finisce",
      minuti: 6,
      intro: "Chiudere una relazione o una frequentazione è l'ultimo atto di rispetto verso una persona che hai scelto.",
      blocks: [
        { t: "p", text: "Si vede di che pasta è fatto un uomo da come se ne va. Una chiusura elegante non toglie il dolore, ma lo rende più pulito: per lei e per te." },
        { t: "h", text: "Il canale giusto" },
        {
          t: "table",
          head: ["Situazione", "Come chiudere"],
          rows: [
            ["Uno o due appuntamenti", "Un messaggio gentile e chiaro"],
            ["Frequentazione di qualche settimana", "Una telefonata, o un messaggio se lei lo preferisce"],
            ["Relazione vera", "Di persona, sempre"],
            ["Convivenza o matrimonio", "Di persona, con calma; poi, per gli aspetti pratici, anche con l'aiuto di un professionista"],
          ],
        },
        { t: "h", text: "Come farlo" },
        {
          t: "steps",
          items: [
            { titolo: "Non rimandare", text: "Quando sai che è finita, dillo. Trascinare la relazione per non affrontare il momento è la scelta meno gentile." },
            { titolo: "Scegli il luogo", text: "In privato, non al ristorante o in un locale affollato: deve potersi esprimere liberamente. Se possibile, a casa sua, così non deve rientrare da sola sconvolta; sei tu quello che se ne va." },
            { titolo: "Sii chiaro e prenditi la responsabilità", text: "Parla in prima persona: “Ho deciso di chiudere la nostra storia.” Non “Le circostanze…”, non “Forse è meglio se…”." },
            { titolo: "Onesto, non crudele", text: "Dai una ragione vera, ma senza l'elenco dei suoi difetti. La sincerità serve a chiudere, non a ferire." },
            { titolo: "Ascolta", text: "Lasciale spazio per reagire e fare domande. Rispondi con onestà, senza difenderti né contrattaccare." },
            { titolo: "Riconosci il valore", text: "Quello che avete vissuto ha contato. Dirlo non è una debolezza." },
          ],
        },
        { t: "h", text: "Frasi utili" },
        {
          t: "list",
          items: [
            "“Ci ho pensato a lungo e ho preso una decisione: voglio chiudere la nostra relazione.”",
            "“Non è una cosa che hai fatto tu. Sono io che non provo più quello che serve per andare avanti.”",
            "“Ti sono grato per quello che abbiamo vissuto, e non voglio che finisca in modo meschino.”",
            "“Capisco che tu sia arrabbiata. Hai il diritto di esserlo.”",
          ],
        },
        {
          t: "dodont",
          si: ["Essere chiaro sul fatto che è una decisione definitiva", "Restituire le sue cose con discrezione, in un momento concordato", "Prendere distanza per un periodo: niente messaggi notturni, niente like", "Parlare di lei con rispetto, anche con gli amici comuni"],
          no: ["Lasciare porte socchiuse (“magari più avanti…”) se non le pensi", "Proporre subito di restare amici", "Fare da spalla su cui piangere: non puoi più essere tu", "Passare la notte insieme “per l'ultima volta”", "Scaricare la responsabilità su di lei"],
        },
        { t: "h", text: "Se è lei a lasciarti" },
        { t: "p", text: "Ascolta, chiedi solo quello che ti serve davvero per capire, e accetta. Puoi essere triste, anche molto, ma non suppliche, non scenate, non messaggi a raffica. “Mi dispiace, ma rispetto la tua decisione” è la frase di un gentleman. Il dolore lo porti agli amici, non sui social." },
        { t: "h", text: "Dopo" },
        {
          t: "list",
          items: [
            "Con gli amici comuni: niente schieramenti, niente racconti dei dettagli intimi.",
            "Sui social: niente post allusivi. Smettere di seguirsi per un po' è legittimo e spesso salutare.",
            "Se c'è un figlio: la coppia finisce, i genitori restano. Il rispetto per l'altra davanti a lui non è negoziabile.",
          ],
        },
        { t: "tip", text: "Chiedi a te stesso: “Come vorrei che mi lasciassero?” Poi fai esattamente quello. È l'unica regola che non sbaglia mai." },
      ],
      fonti: [
        { titolo: "Psychology Today – Fourteen ways to break up better", url: "https://www.psychologytoday.com/ca/blog/i-hear-you/201805/fourteen-ways-to-break-up-better" },
        { titolo: "Psychology Today – 4 ways to break up with someone compassionately", url: "https://psychologytoday.com/us/blog/the-attraction-doctor/201509/4-ways-break-someone-compassionately" },
        { titolo: "Emily Post – Texting manners", url: "https://emilypost.com/advice/texting-manners" },
      ],
    },
  ],
};
