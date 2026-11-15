import type { Course } from "./types";

/* ================================================================== */
/* MENTALITÀ                                                           */
/* ================================================================== */
const PETERSON = { titolo: "Wikipedia – 12 Rules for Life (Jordan Peterson)", url: "https://en.wikipedia.org/wiki/12_Rules_for_Life" };
const WILLINK = { titolo: "Wikipedia – Jocko Willink, Extreme Ownership e Discipline Equals Freedom", url: "https://en.wikipedia.org/wiki/Jocko_Willink" };
const EPITTETO = { titolo: "Epitteto – Manuale (Enchiridion), MIT Classics", url: "http://classics.mit.edu/Epictetus/epicench.html" };
const MARCO = { titolo: "Wikipedia – Marco Aurelio, Colloqui con se stesso", url: "https://it.wikipedia.org/wiki/Colloqui_con_s%C3%A9_stesso" };
const LOCKE = { titolo: "Locke & Latham (2002) – Teoria degli obiettivi, American Psychologist", url: "https://doi.org/10.1037/0003-066X.57.9.705" };
const GOLLWITZER = { titolo: "Gollwitzer & Sheeran (2006) – Intenzioni di attuazione, meta-analisi", url: "https://doi.org/10.1016/S0065-2601(06)38002-1" };
const SINGH = { titolo: "Singh et al. (2023) – Attività fisica, depressione e ansia, British Journal of Sports Medicine", url: "https://doi.org/10.1136/bjsports-2022-106195" };

export const mentalita: Course = {
  id: "mentalita",
  titolo: "Mentalità",
  sottotitolo: "Il gentleman con la sostanza: responsabilità, obiettivi, disciplina, sangue freddo e fame di risultati",
  icona: "flame",
  lezioni: [
    {
      id: "responsabilita",
      titolo: "Responsabilità totale",
      minuti: 5,
      intro: "Il punto da cui parte tutto: quello che succede nella tua vita è un problema tuo da risolvere, anche quando non è colpa tua.",
      blocks: [
        { t: "p", text: "Le buone maniere senza sostanza sono una vernice. La sostanza comincia da un'idea scomoda: **nessuno verrà a salvarti**. Né il capo, né lo Stato, né la fortuna. Jocko Willink, ex comandante dei Navy SEAL, la chiama *Extreme Ownership*: il leader si prende la responsabilità di tutto ciò che accade nel suo mondo, compresi gli errori degli altri, perché è l'unico modo di avere il potere di cambiarlo." },
        { t: "p", text: "Jordan Peterson dice la stessa cosa in un'altra forma: **metti in ordine la tua casa prima di criticare il mondo**. Prima di lamentarti del mercato, del capo o della società, chiediti: ho fatto tutto quello che era in mio potere?" },
        { t: "dodont", si: ["\"Il cliente non ha chiuso: cosa potevo fare meglio io?\"", "\"Sono stanco perché ho un neonato: quindi organizzo meglio le poche ore che ho\"", "Ammettere un errore subito, a voce alta, e dire cosa farai per rimediare"], no: ["\"Il mercato è fermo\", \"il lead era scarso\", \"non ho tempo\"", "Scaricare la colpa su chi non è presente", "Aspettare il momento giusto"] },
        { t: "tip", text: "Esercizio di stasera: scrivi i tre problemi che ti pesano di più. Accanto a ognuno, una sola azione che dipende solo da te. Domani fai la prima." },
      ],
      fonti: [WILLINK, PETERSON],
    },
    {
      id: "obiettivo",
      titolo: "Un obiettivo che valga la fatica",
      minuti: 6,
      intro: "Chi non punta a niente colpisce sempre il bersaglio. Come scegliere un obiettivo difficile e renderlo concreto.",
      blocks: [
        { t: "p", text: "Decenni di ricerca sugli obiettivi (Locke e Latham) dicono una cosa precisa: **gli obiettivi specifici e difficili producono risultati migliori** di quelli vaghi o facili, e del generico \"fai del tuo meglio\". Il difficile non spaventa: concentra." },
        { t: "p", text: "Peterson lo mette così: **persegui ciò che ha significato, non ciò che è comodo**. Un obiettivo grande dà un senso alla fatica di ogni giorno; senza, la fatica è solo fatica." },
        { t: "steps", items: [
          { titolo: "Il traguardo a 12 mesi", text: "Uno solo, misurabile, che ti faccia un po' paura. \"Guadagnare di più\" non vale; \"Arrivare a X € al mese entro dicembre\" sì." },
          { titolo: "Il perché", text: "Una frase vera, non da poster: per chi lo fai e cosa cambia quando ci arrivi." },
          { titolo: "Il trimestre", text: "Cosa deve essere vero tra 90 giorni perché tu sia sulla strada giusta." },
          { titolo: "La settimana", text: "Tre azioni che muovono davvero il numero. Non attività: azioni con un risultato." },
          { titolo: "Il controllo", text: "Ogni domenica: numeri reali contro numeri previsti. Senza drammi, senza scuse, si corregge." },
        ] },
        { t: "tip", text: "Scrivi l'obiettivo dove lo vedi ogni mattina. E dillo a una persona che non ti farà sconti." },
      ],
      fonti: [LOCKE, PETERSON],
    },
    {
      id: "non-negoziabili",
      titolo: "Disciplina: i non negoziabili",
      minuti: 5,
      intro: "La motivazione va e viene. La disciplina è decidere prima, così quando arriva il momento non si discute.",
      blocks: [
        { t: "p", text: "Willink lo riassume in tre parole: **disciplina è libertà**. Chi si alza all'ora decisa, si allena e fa il lavoro difficile si guadagna tempo, salute e soldi; chi aspetta di averne voglia resta schiavo dell'umore." },
        { t: "p", text: "Il trucco più solido che la psicologia conosca sono le **intenzioni di attuazione**: invece di \"mi allenerò di più\", decidi *quando, dove e cosa*. Una meta-analisi su quasi cento studi (Gollwitzer e Sheeran) mostra che questo semplice formato \"se... allora...\" aumenta in modo netto la probabilità di passare all'azione." },
        { t: "list", items: [
          "\"**Se** sono le 7:00, **allora** 20 flessioni e 10 minuti di camminata, prima del telefono.\"",
          "\"**Se** mi siedo alla scrivania, **allora** la prima ora è per la chiamata o il compito più importante.\"",
          "\"**Se** mi viene voglia di rimandare, **allora** faccio solo i primi 5 minuti.\"",
        ] },
        { t: "h", text: "I tuoi tre non negoziabili" },
        { t: "p", text: "Scegline tre, piccoli abbastanza da farli anche nella giornata peggiore (con un neonato in casa, di giornate storte ce ne saranno). Un non negoziabile saltato non si recupera con il senso di colpa: si rifà il giorno dopo, alla stessa ora." },
        { t: "tip", text: "Mai saltare due volte di fila. Una volta è un incidente, due è l'inizio di una nuova abitudine." },
      ],
      fonti: [GOLLWITZER, WILLINK],
    },
    {
      id: "cosa-dura",
      titolo: "La cosa difficile per prima",
      minuti: 4,
      intro: "Ogni giorno c'è un compito che sai di dover fare e che stai evitando. È quello che conta.",
      blocks: [
        { t: "p", text: "Il compito che rimandi è quasi sempre quello con più valore: la telefonata scomoda, la trattativa, la conversazione rimandata, l'allenamento duro. Farlo per primo, quando l'energia è alta, cambia l'intera giornata: il resto sembra leggero." },
        { t: "steps", items: [
          { titolo: "La sera prima", text: "Scegli la cosa difficile di domani e scrivila. Una sola." },
          { titolo: "Al mattino", text: "Niente posta, niente social finché non è fatta, o almeno iniziata." },
          { titolo: "Il disagio volontario", text: "Una volta a settimana fai qualcosa di scomodo per scelta: una doccia fredda, un allenamento più lungo, una conversazione che temi. Allena il muscolo che ti serve quando il disagio non lo scegli tu." },
        ] },
        { t: "dodont", si: ["Agire con un po' di paura addosso", "Spezzare il compito enorme nel primo passo da 10 minuti"], no: ["Aspettare di sentirsi pronti", "Riempire la mattina di cose facili per sentirsi produttivi"] },
      ],
      fonti: [WILLINK],
    },
    {
      id: "ieri",
      titolo: "Il tuo unico rivale sei tu di ieri",
      minuti: 4,
      intro: "Confrontarsi con gli altri sui social logora. Confrontarsi con chi eri ieri fa crescere.",
      blocks: [
        { t: "p", text: "Una delle regole di Peterson: **confrontati con chi eri ieri, non con chi è qualcun altro oggi**. Dall'esterno vedi i risultati degli altri, non il prezzo che hanno pagato. Il confronto utile è uno solo: sono un po' meglio di una settimana fa?" },
        { t: "list", items: [
          "Misura poche cose che contano: un numero di lavoro, un numero del corpo, una abitudine.",
          "Guarda la tendenza a 4 settimane, non il singolo giorno.",
          "Celebra il progresso piccolo e reale, non quello grande e immaginato.",
        ] },
        { t: "p", text: "La competizione con gli altri resta utile come **carburante**, non come metro: guardare chi è più avanti per capire cosa fa, non per sentirsi inferiori." },
        { t: "tip", text: "La revisione della domenica nell'app è esattamente questo: il te di questa settimana contro quello della settimana scorsa." },
      ],
      fonti: [PETERSON],
    },
    {
      id: "sangue-freddo",
      titolo: "Sangue freddo",
      minuti: 5,
      intro: "L'uomo che controlla le sue reazioni controlla la stanza. Cosa insegnano gli stoici.",
      blocks: [
        { t: "p", text: "Il Manuale di Epitteto si apre con una distinzione che vale da sola un corso: **alcune cose dipendono da noi, altre no**. Dipendono da noi i giudizi, le scelte, le azioni; non dipendono da noi il giudizio degli altri, il mercato, il passato. Tutta l'energia va sulla prima colonna." },
        { t: "p", text: "Marco Aurelio, che governava un impero, si scriveva ogni sera di non farsi trascinare dall'ira: chi perde la calma in una trattativa o in una lite ha già perso." },
        { t: "steps", items: [
          { titolo: "Pausa", text: "Prima di rispondere a una provocazione, un respiro lento. Parla più piano e più basso dell'altro." },
          { titolo: "Domanda", text: "\"Questo dipende da me?\" Se no, lascialo andare. Se sì, decidi un'azione." },
          { titolo: "La sera", text: "Due minuti: dove ho reagito d'istinto oggi? Come avrei voluto rispondere?" },
        ] },
        { t: "tip", text: "La durezza vera non si vede nel tono di voce, ma nella costanza. Il gentleman è fermo, non aggressivo." },
      ],
      fonti: [EPITTETO, MARCO],
    },
    {
      id: "corpo",
      titolo: "Corpo forte, testa forte",
      minuti: 4,
      intro: "La mentalità non vive solo in testa: si costruisce anche in palestra e a letto.",
      blocks: [
        { t: "p", text: "Una grande revisione di studi pubblicata sul British Journal of Sports Medicine (2023) ha trovato che l'attività fisica riduce in modo netto i sintomi di depressione, ansia e stress, con effetti paragonabili o superiori a quelli delle terapie abituali. Allenarsi non è vanità: è la base dell'energia, del controllo e della fiducia in sé." },
        { t: "list", items: [
          "**Forza** almeno 2 volte a settimana: è la promessa più facile da mantenere con te stesso, e ogni promessa mantenuta rafforza le altre.",
          "**Camminata** ogni giorno: schiarisce le idee meglio di qualsiasi riunione.",
          "**Postura**: spalle indietro e testa alta (è la prima regola di Peterson). Cambia come ti vedono gli altri e come ti senti tu.",
          "**Sonno**: con poco sonno la disciplina crolla. Se le notti sono corte, proteggi i pisolini e le ore che puoi.",
        ] },
      ],
      fonti: [SINGH, PETERSON],
    },
    {
      id: "fame",
      titolo: "Fame di risultati",
      minuti: 5,
      intro: "Ambizione, soldi e competizione senza perdere l'eleganza: come un gentleman vuole vincere.",
      blocks: [
        { t: "p", text: "Volere di più non è volgare. È volgare ostentarlo. Il gentleman con la sostanza ha **fame**: vuole guadagnare bene, crescere, competere e vincere, e lo fa costruendo valore, non facendo rumore." },
        { t: "steps", items: [
          { titolo: "Competenza rara", text: "Si guadagna di più diventando difficili da sostituire. Una competenza su cui investi un'ora al giorno, per anni." },
          { titolo: "Numeri, non sensazioni", text: "Sai quanto guadagni, quanto spendi, quanto ti manca all'obiettivo. Ogni settimana." },
          { titolo: "Ambiente", text: "Frequenta chi è più avanti di te e chi vuole il tuo bene (un'altra regola di Peterson). Allontanati da chi ride dei tuoi obiettivi." },
          { titolo: "Parola data", text: "Fai quello che dici, quando lo dici. Nel lavoro è la reputazione; nella vita è il carattere." },
        ] },
        { t: "dodont", si: ["Mostrare i risultati con i fatti, non con le foto", "Trattare con rispetto chi lavora con te e per te", "Rispettare le donne della tua vita: la forza vera protegge"], no: ["Il lusso esibito per sembrare", "Disprezzare gli altri per sentirsi superiori", "Scorciatoie che non potresti raccontare a tuo figlio"] },
        { t: "tip", text: "Domanda per la revisione di domenica: questa settimana ho costruito qualcosa che varrà di più tra un anno?" },
      ],
      fonti: [PETERSON, WILLINK],
    },
  ],
};
