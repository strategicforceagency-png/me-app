import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "./lib/push";

registerSW();

/* Aggiornamento automatico: quando l'app torna in primo piano controlla se è uscita una versione nuova e la carica.
 * (Su iPhone l'app sulla Home può restare sospesa per ore con la versione vecchia in memoria.) */
const mio = [...document.scripts].map((s) => s.src).find((s) => /assets\/index-[^/]+\.js/.test(s))?.match(/index-[^/]+\.js/)?.[0];
let ultimoControllo = 0;
async function controllaVersione() {
  if (!mio || document.visibilityState !== "visible" || Date.now() - ultimoControllo < 60000) return;
  ultimoControllo = Date.now();
  try {
    const html = await (await fetch(`./?v=${Date.now()}`, { cache: "no-store" })).text();
    const nuovo = html.match(/assets\/(index-[^"']+\.js)/)?.[1];
    if (nuovo && nuovo !== mio) location.reload();
  } catch {
    /* senza rete si resta sulla versione attuale */
  }
}
document.addEventListener("visibilitychange", controllaVersione);
window.addEventListener("focus", controllaVersione);
setTimeout(controllaVersione, 3000);

/*
 * Su iPhone i campi di testo senza indicazioni vengono trattati come moduli da compilare:
 * invece dei suggerimenti di parole compaiono i dati del contatto ("Manuel", "Inserisci info").
 * Ogni campo di scrittura libera viene marcato come testo normale, con correzione e suggerimenti attivi.
 * Restano esclusi email, password, numeri e i campi che indicano già cosa compilare.
 */
const LIBERI = new Set(["", "text", "search"]);
let nCampo = 0;
function scritturaLibera(el: Element) {
  if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) return;
  if (el instanceof HTMLInputElement && !LIBERI.has(el.getAttribute("type") || "")) return;
  if (el.hasAttribute("autocomplete") && el.getAttribute("autocomplete") !== "off") return;
  if (el.dataset.libero) return;
  el.dataset.libero = "1";
  el.setAttribute("autocorrect", "on");
  el.setAttribute("spellcheck", "true");
  if (!el.hasAttribute("autocapitalize")) el.setAttribute("autocapitalize", "sentences");
  if (el instanceof HTMLTextAreaElement) {
    // provato sull'app installata: funziona solo senza "autocomplete", con un nome con numero e il tasto "invia"
    el.removeAttribute("autocomplete");
    el.setAttribute("name", `corpo${++nCampo}`);
    if (!el.hasAttribute("enterkeyhint")) el.setAttribute("enterkeyhint", "send");
  } else {
    // riga singola: provato, funziona con autocomplete spento e nome col trattino
    el.setAttribute("autocomplete", "off");
    el.setAttribute("name", "testo-libero");
  }
}
const scan = (root: ParentNode) => root.querySelectorAll("input, textarea").forEach(scritturaLibera);
new MutationObserver((ms) =>
  ms.forEach((m) =>
    m.addedNodes.forEach((n) => {
      if (n instanceof Element) {
        scritturaLibera(n);
        scan(n);
      }
    }),
  ),
).observe(document.documentElement, { childList: true, subtree: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
