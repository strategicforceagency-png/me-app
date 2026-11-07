/* Illustrazioni originali dell'Accademia (SVG, tema chiaro/scuro). */
import { ReactNode } from "react";

const INK = "rgb(var(--fg))";
const MUTED = "rgb(var(--muted))";
const GOLD = "rgb(var(--gold))";
const SUB = "rgb(var(--subtle))";
const SURF = "rgb(var(--surface))";
const LINE = "rgb(var(--line))";

function Frame({ w = 200, h = 200, children, label }: { w?: number; h?: number; children: ReactNode; label?: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={label}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="4" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={GOLD} />
        </marker>
        <marker id="ahs" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={GOLD} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}
const T = ({ x, y, children, size = 9, anchor = "middle", color = MUTED, weight = 500 }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; color?: string; weight?: number }) => (
  <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontFamily="Figtree, system-ui, sans-serif" fontWeight={weight}>
    {children}
  </text>
);

/* ------------------------------------------------------------------ */
/* CRAVATTA: passaggi schematici                                       */
/* ------------------------------------------------------------------ */
export type TiePose = "start" | "start-seam" | "cross" | "under" | "behind" | "front" | "frontR" | "up" | "loopL" | "loopR" | "down" | "done" | "done-wide";

export function TieStep({ pose }: { pose: TiePose }) {
  const collar = (
    <g>
      <path d="M58 10 L100 52 L142 10" fill="none" stroke={LINE} strokeWidth="2" />
      <path d="M58 10 L78 44 L100 52 M142 10 L122 44 L100 52" fill={SUB} stroke={LINE} strokeWidth="1.2" />
      <ellipse cx="100" cy="36" rx="20" ry="9" fill="none" stroke={MUTED} strokeWidth="5" opacity=".55" />
    </g>
  );
  const narrow = <path d="M86 42 L92 186" stroke={MUTED} strokeWidth="9" strokeLinecap="round" opacity=".7" />;
  const wide = (d: string, dashed = false, arrow = true) => (
    <path d={d} fill="none" stroke={GOLD} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? "2 9" : undefined} markerEnd={arrow ? "url(#ah)" : undefined} opacity={dashed ? 0.75 : 1} />
  );
  const knot = <path d="M84 62 L116 62 L104 92 L96 92 Z" fill={GOLD} opacity=".35" />;
  const labels = (
    <>
      <T x={30} y={196} anchor="start">stretto</T>
      <T x={170} y={196} anchor="end" color={GOLD} weight={700}>
        largo
      </T>
    </>
  );
  let body: ReactNode = null;
  switch (pose) {
    case "start":
    case "start-seam":
      body = (
        <>
          {narrow}
          {wide("M114 42 L128 182", false, false)}
          {pose === "start-seam" && (
            <>
              <T x={140} y={104} anchor="start" color={GOLD}>cucitura</T>
              <T x={140} y={114} anchor="start" color={GOLD}>verso fuori</T>
            </>
          )}
        </>
      );
      break;
    case "cross":
      body = (
        <>
          {narrow}
          {wide("M128 150 Q110 110 74 96")}
        </>
      );
      break;
    case "under":
      body = (
        <>
          {wide("M128 150 Q110 112 72 100", true)}
          {narrow}
        </>
      );
      break;
    case "behind":
      body = (
        <>
          {wide("M70 104 Q100 120 132 104", true)}
          {narrow}
        </>
      );
      break;
    case "front":
      body = (
        <>
          {narrow}
          {wide("M134 88 Q100 76 66 88")}
        </>
      );
      break;
    case "frontR":
      body = (
        <>
          {narrow}
          {wide("M66 88 Q100 76 134 88")}
        </>
      );
      break;
    case "up":
      body = (
        <>
          {narrow}
          {knot}
          {wide("M90 112 L98 58", true)}
          {wide("M98 58 L100 26", false)}
        </>
      );
      break;
    case "loopL":
    case "loopR": {
      const left = pose === "loopL";
      body = (
        <>
          {narrow}
          {knot}
          {wide(left ? "M100 26 Q86 40 70 74" : "M100 26 Q114 40 130 74")}
        </>
      );
      break;
    }
    case "down":
      body = (
        <>
          {narrow}
          <path d="M80 70 L120 70" stroke={GOLD} strokeWidth="13" opacity=".45" strokeLinecap="round" />
          {wide("M100 28 L100 60", true, false)}
          {wide("M100 60 L100 150")}
        </>
      );
      break;
    case "done":
    case "done-wide": {
      const k = pose === "done-wide" ? 20 : 14;
      body = (
        <>
          <path d={`M${100 - k} 46 L${100 + k} 46 L${100 + k * 0.45} 74 L${100 - k * 0.45} 74 Z`} fill={GOLD} />
          <path d={`M${100 - k * 0.45} 74 L${100 + k * 0.45} 74 L${100 + 15} 176 L100 188 L${100 - 15} 176 Z`} fill={GOLD} opacity=".85" />
          <path d="M100 76 L100 96" stroke={SURF} strokeWidth="1.5" opacity=".7" />
          <T x={130} y={92} anchor="start" color={GOLD}>fossetta</T>
        </>
      );
      return (
        <Frame label="Nodo finito">
          {collar}
          {body}
        </Frame>
      );
    }
  }
  return (
    <Frame label={`Passaggio cravatta: ${pose}`}>
      {collar}
      {body}
      {labels}
    </Frame>
  );
}

/* Confronto dimensioni dei nodi */
export function KnotCompare() {
  const knots = [
    { n: "Semplice", w: 11, h: 22, a: true },
    { n: "Pratt", w: 13, h: 22, a: false },
    { n: "Mezzo Windsor", w: 15, h: 24, a: false },
    { n: "Windsor", w: 19, h: 25, a: false },
  ];
  return (
    <Frame w={320} h={130} label="Confronto nodi">
      {knots.map((k, i) => {
        const cx = 40 + i * 80;
        return (
          <g key={k.n}>
            <path d={`M${cx - 24} 14 L${cx} 40 L${cx + 24} 14`} fill="none" stroke={LINE} strokeWidth="2" />
            <path d={`M${cx - k.w} 30 L${cx + k.w} 30 L${cx + k.w * 0.4 + (k.a ? 2 : 0)} ${30 + k.h} L${cx - k.w * 0.4} ${30 + k.h} Z`} fill={GOLD} />
            <path d={`M${cx - k.w * 0.4} ${30 + k.h} L${cx + k.w * 0.4} ${30 + k.h} L${cx + 11} 100 L${cx} 106 L${cx - 11} 100 Z`} fill={GOLD} opacity=".8" />
            <T x={cx} y={122} color={INK} weight={600}>
              {k.n}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

/* Lunghezza e fermacravatta */
export function TieLength() {
  return (
    <Frame w={250} h={230} label="Lunghezza cravatta e fermacravatta">
      <path d="M50 20 Q100 0 150 20 L160 200 L40 200 Z" fill={SUB} stroke={LINE} />
      <path d="M78 20 L100 44 L122 20" fill={SURF} stroke={LINE} />
      {[60, 84, 108, 132, 156].map((y, i) => (
        <circle key={y} cx={100} cy={y} r={2.2} fill={MUTED} opacity={i === 2 || i === 3 ? 1 : 0.6} />
      ))}
      <path d="M93 40 L107 40 L104 54 L96 54 Z" fill={GOLD} />
      <path d="M96 54 L104 54 L112 168 L100 178 L88 168 Z" fill={GOLD} opacity=".85" />
      <rect x="84" y="118" width="32" height="4" rx="1.5" fill={INK} />
      <rect x="40" y="176" width="120" height="14" fill={INK} opacity=".85" />
      <rect x="92" y="175" width="16" height="16" rx="2" fill="none" stroke={GOLD} strokeWidth="2.5" />
      <path d="M118 120 L166 120" stroke={GOLD} strokeWidth="1" />
      <T x={168} y={117} anchor="start" color={INK} size={9}>fermacravatta</T>
      <T x={168} y={128} anchor="start" size={8}>tra 3° e 4° bottone</T>
      <path d="M110 183 L166 183" stroke={GOLD} strokeWidth="1" />
      <T x={168} y={180} anchor="start" color={INK} size={9}>la punta tocca</T>
      <T x={168} y={191} anchor="start" size={8}>la fibbia della cintura</T>
    </Frame>
  );
}

/* Papillon */
export function BowTie() {
  return (
    <Frame w={220} h={110} label="Papillon">
      <path d="M110 55 L40 25 Q30 55 40 85 Z" fill={INK} />
      <path d="M110 55 L180 25 Q190 55 180 85 Z" fill={INK} />
      <path d="M58 40 Q70 55 58 70 M162 40 Q150 55 162 70" stroke={SURF} strokeWidth="1.2" fill="none" opacity=".35" />
      <rect x="100" y="42" width="20" height="26" rx="5" fill={INK} stroke={SURF} strokeOpacity=".2" />
      <T x={110} y={104} color={MUTED}>leggermente asimmetrico = annodato a mano</T>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* POCHETTE                                                            */
/* ------------------------------------------------------------------ */
export function PocketFold({ fold }: { fold: "tv" | "punta" | "tre" | "sbuffo" }) {
  const pocket = (
    <>
      <path d="M20 70 L180 60 L184 130 L24 140 Z" fill={SUB} stroke={LINE} strokeWidth="1.5" />
      <path d="M20 70 L180 60" stroke={MUTED} strokeWidth="2.5" />
    </>
  );
  let sq: ReactNode;
  if (fold === "tv") sq = <path d="M46 69 L154 62 L154 54 L46 61 Z" fill={SURF} stroke={GOLD} strokeWidth="1.5" />;
  else if (fold === "punta") sq = <path d="M70 67.5 L100 22 L130 64 Z" fill={SURF} stroke={GOLD} strokeWidth="1.5" />;
  else if (fold === "tre")
    sq = (
      <g fill={SURF} stroke={GOLD} strokeWidth="1.5">
        <path d="M58 68.5 L76 30 L94 67 Z" />
        <path d="M110 66 L128 30 L146 64 Z" />
        <path d="M82 67.5 L102 18 L122 65.5 Z" />
      </g>
    );
  else
    sq = (
      <path
        d="M66 68 C60 40 82 30 92 42 C98 24 120 26 124 42 C138 34 148 52 136 64 Z"
        fill={SURF}
        stroke={GOLD}
        strokeWidth="1.5"
      />
    );
  const label = { tv: "Piega dritta (TV)", punta: "Una punta", tre: "Tre punte", sbuffo: "A sbuffo" }[fold];
  return (
    <Frame w={200} h={160} label={label}>
      {pocket}
      {sq}
      <T x={100} y={156} color={INK} weight={600} size={10}>
        {label}
      </T>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* GEMELLI                                                             */
/* ------------------------------------------------------------------ */
export function Cufflinks() {
  const items: { n: string; el: ReactNode }[] = [
    {
      n: "A barretta",
      el: (
        <>
          <rect x="-14" y="-14" width="28" height="28" rx="5" fill={GOLD} />
          <rect x="-2" y="14" width="4" height="22" fill={MUTED} />
          <rect x="-12" y="34" width="24" height="5" rx="2.5" fill={GOLD} />
        </>
      ),
    },
    {
      n: "A catenella",
      el: (
        <>
          <circle r="13" fill={GOLD} />
          <path d="M0 13 L0 30" stroke={MUTED} strokeWidth="2" strokeDasharray="2 2" />
          <circle cy="38" r="9" fill={GOLD} />
        </>
      ),
    },
    {
      n: "Fissi",
      el: (
        <>
          <ellipse rx="15" ry="11" fill={GOLD} />
          <rect x="-2.5" y="11" width="5" height="20" fill={MUTED} />
          <ellipse cy="36" rx="10" ry="7" fill={GOLD} />
        </>
      ),
    },
    {
      n: "Nodi di seta",
      el: (
        <>
          <circle r="12" fill={GOLD} opacity=".9" />
          <path d="M-8 -6 Q0 6 8 -6 M-8 6 Q0 -6 8 6" stroke={SURF} strokeWidth="1.5" fill="none" />
          <path d="M0 12 L0 26" stroke={GOLD} strokeWidth="3" />
          <circle cy="34" r="9" fill={INK} opacity=".85" />
        </>
      ),
    },
  ];
  return (
    <Frame w={320} h={120} label="Tipi di gemelli">
      {items.map((it, i) => (
        <g key={it.n} transform={`translate(${40 + i * 80} 30)`}>
          {it.el}
          <T x={0} y={82} color={INK} weight={600}>
            {it.n}
          </T>
        </g>
      ))}
    </Frame>
  );
}

/* Polsino alla francese: i due lembi "si baciano" */
export function FrenchCuff() {
  return (
    <Frame w={240} h={130} label="Polsino alla francese">
      <path d="M20 40 L120 40 L120 100 L20 100 Z" fill={SUB} stroke={LINE} />
      <path d="M120 30 L180 30 Q196 30 196 46 L196 98 Q196 112 180 112 L120 112 Z" fill={SURF} stroke={LINE} strokeWidth="1.5" />
      <path d="M120 30 L120 112" stroke={MUTED} strokeWidth="1.5" />
      <path d="M150 30 L150 112" stroke={LINE} strokeDasharray="3 3" />
      <circle cx="176" cy="71" r="9" fill={GOLD} />
      <path d="M176 62 L176 52" stroke={GOLD} strokeWidth="2" />
      <T x={120} y={126} color={INK}>lembi affiancati lato interno contro lato interno</T>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* GIACCA: quali bottoni allacciare                                    */
/* ------------------------------------------------------------------ */
export function JacketButtons() {
  type B = { y: number; s: "si" | "a volte" | "mai" };
  const jackets: { n: string; b: B[]; db?: boolean }[] = [
    { n: "Due bottoni", b: [{ y: 92, s: "si" }, { y: 116, s: "mai" }] },
    { n: "Tre bottoni", b: [{ y: 74, s: "a volte" }, { y: 96, s: "si" }, { y: 118, s: "mai" }] },
    { n: "Doppiopetto", b: [{ y: 92, s: "si" }, { y: 116, s: "a volte" }], db: true },
    { n: "Gilet", b: [60, 74, 88, 102, 116, 130].map((y, i, a) => ({ y, s: i === a.length - 1 ? "mai" : "si" }) as B) },
  ];
  const col = (s: B["s"]) => (s === "si" ? GOLD : s === "a volte" ? MUTED : "transparent");
  return (
    <Frame w={340} h={200} label="Bottoni della giacca">
      {jackets.map((j, i) => {
        const x = 42 + i * 85;
        return (
          <g key={j.n}>
            <path d={`M${x - 30} 30 L${x - 8} 30 L${x} 70 L${x + 8} 30 L${x + 30} 30 L${x + 34} 160 L${x - 34} 160 Z`} fill={SUB} stroke={LINE} />
            {j.b.map((b) => (
              <g key={b.y}>
                <circle cx={j.db ? x - 10 : x} cy={b.y} r="5" fill={col(b.s)} stroke={b.s === "mai" ? MUTED : "none"} strokeWidth="1.5" />
                {j.db && <circle cx={x + 10} cy={b.y} r="5" fill={col(b.s)} stroke={b.s === "mai" ? MUTED : "none"} strokeWidth="1.5" />}
              </g>
            ))}
            <T x={x} y={178} color={INK} weight={600}>
              {j.n}
            </T>
          </g>
        );
      })}
      <circle cx="70" cy="194" r="4" fill={GOLD} />
      <T x={78} y={197} anchor="start" size={8.5}>sempre</T>
      <circle cx="140" cy="194" r="4" fill={MUTED} />
      <T x={148} y={197} anchor="start" size={8.5}>a volte</T>
      <circle cx="210" cy="194" r="4" fill="none" stroke={MUTED} strokeWidth="1.5" />
      <T x={218} y={197} anchor="start" size={8.5}>mai</T>
    </Frame>
  );
}

/* Vestibilità: punti chiave della giacca */
export function JacketFit() {
  const pts: [number, number, string][] = [
    [62, 34, "1 spalla"],
    [100, 22, "2 collo"],
    [150, 120, "3 manica"],
    [100, 96, "4 bottone"],
    [100, 176, "5 lunghezza"],
  ];
  return (
    <Frame w={200} h={200} label="Vestibilità della giacca">
      <path d="M60 30 L88 22 L100 60 L112 22 L140 30 L156 40 L162 130 L148 132 L144 60 L140 182 L60 182 L56 60 L52 132 L38 130 L44 40 Z" fill={SUB} stroke={LINE} />
      <path d="M148 132 L162 130 L162 138 L148 140 Z" fill={SURF} stroke={LINE} />
      <circle cx="100" cy="96" r="3.5" fill={MUTED} />
      {pts.map(([x, y, l]) => (
        <g key={l}>
          <circle cx={x} cy={y} r="8" fill={GOLD} />
          <T x={x} y={y + 3} color={SURF} size={8.5} weight={700}>
            {l.split(" ")[0]}
          </T>
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* SCARPE                                                              */
/* ------------------------------------------------------------------ */
export type ShoeKind = "oxford" | "derby" | "monk" | "loafer" | "chelsea" | "sneaker";
export function Shoe({ kind, label = true }: { kind: ShoeKind; label?: boolean }) {
  const name = { oxford: "Oxford", derby: "Derby", monk: "Monk strap", loafer: "Mocassino", chelsea: "Chelsea boot", sneaker: "Sneaker in pelle" }[kind];
  const boot = kind === "chelsea";
  const upper = boot
    ? "M24 26 L70 26 L74 70 Q92 72 118 80 Q150 88 164 98 Q170 104 164 108 L24 108 Z"
    : "M24 58 Q30 50 46 50 L70 52 Q92 56 118 74 Q150 86 164 98 Q170 104 164 108 L24 108 Z";
  return (
    <Frame w={190} h={label ? 140 : 120} label={name}>
      <path d={upper} fill={kind === "sneaker" ? SURF : INK} stroke={kind === "sneaker" ? INK : "none"} strokeWidth="1.5" />
      <path d={kind === "sneaker" ? "M20 108 L168 108 Q172 118 160 120 L22 120 Z" : "M20 108 L168 108 Q170 113 162 114 L22 114 Z"} fill={kind === "sneaker" ? SURF : GOLD} stroke={kind === "sneaker" ? INK : "none"} strokeWidth="1.5" opacity={kind === "sneaker" ? 1 : 0.9} />
      {kind !== "sneaker" && <rect x="20" y="104" width="30" height="14" fill={GOLD} opacity=".9" />}
      {kind === "oxford" && (
        <>
          <path d="M70 54 L98 66 L86 74 Z" fill={SURF} opacity=".18" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${74 + i * 6} ${57 + i * 3} l8 -2`} stroke={SURF} strokeWidth="1.3" opacity=".7" />
          ))}
          <path d="M122 76 Q128 90 124 106" stroke={SURF} strokeWidth="1" opacity=".35" fill="none" />
        </>
      )}
      {kind === "derby" && (
        <>
          <path d="M64 52 Q66 72 84 84 L104 78" fill="none" stroke={SURF} strokeWidth="1.3" opacity=".55" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${76 + i * 6} ${56 + i * 3} l10 -3`} stroke={SURF} strokeWidth="1.3" opacity=".7" />
          ))}
        </>
      )}
      {kind === "monk" && (
        <>
          <path d="M70 60 Q90 62 104 80" stroke={GOLD} strokeWidth="8" fill="none" opacity=".55" />
          <rect x="90" y="64" width="10" height="9" rx="1.5" fill="none" stroke={GOLD} strokeWidth="2.2" />
        </>
      )}
      {kind === "loafer" && (
        <>
          <path d="M60 56 Q96 60 112 76" stroke={SURF} strokeWidth="5" fill="none" opacity=".35" />
          <rect x="82" y="60" width="12" height="4" rx="2" fill={SURF} opacity=".5" transform="rotate(18 88 62)" />
        </>
      )}
      {kind === "chelsea" && <path d="M54 26 L58 66 Q66 70 74 70 L70 26 Z" fill={MUTED} opacity=".85" />}
      {kind === "sneaker" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${74 + i * 7} ${58 + i * 4} l9 -3`} stroke={INK} strokeWidth="1.3" />
          ))}
          <path d="M28 96 L150 96" stroke={INK} strokeWidth="1" opacity=".4" />
        </>
      )}
      {label && (
        <T x={95} y={136} color={INK} weight={600} size={10.5}>
          {name}
        </T>
      )}
    </Frame>
  );
}

export function ShoeLadder() {
  const kinds: ShoeKind[] = ["oxford", "derby", "monk", "loafer", "chelsea", "sneaker"];
  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {kinds.map((k) => (
          <div key={k} className="rounded-[12px] bg-card p-1.5">
            <Shoe kind={k} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <span>più formale</span>
        <span className="h-px flex-1 bg-gradient-to-r from-gold to-line" />
        <span>più informale</span>
      </div>
    </div>
  );
}

/* Calze: abbinare al pantalone */
export function SockMatch() {
  const ex = [
    { tr: "#1F2A44", sock: "#1F2A44", shoe: "#3B2416", ok: true, n: "Blu → calza blu" },
    { tr: "#6B6E73", sock: "#45484D", shoe: "#111111", ok: true, n: "Grigio → più scura" },
    { tr: "#1F2A44", sock: "#FFFFFF", shoe: "#111111", ok: false, n: "Bianca con abito" },
  ];
  return (
    <Frame w={330} h={150} label="Calze e pantaloni">
      {ex.map((e, i) => {
        const x = 20 + i * 106;
        return (
          <g key={i}>
            <rect x={x + 22} y={8} width={44} height={60} fill={e.tr} />
            <rect x={x + 24} y={68} width={40} height={28} fill={e.sock} stroke={LINE} />
            <path d={`M${x + 14} 96 L${x + 66} 96 Q${x + 92} 100 ${x + 94} 112 L${x + 14} 112 Z`} fill={e.shoe} />
            <circle cx={x + 82} cy={20} r={9} fill={e.ok ? GOLD : "rgb(var(--bad))"} />
            <T x={x + 82} y={24} color={SURF} size={11} weight={800}>
              {e.ok ? "✓" : "✕"}
            </T>
            <T x={x + 50} y={132} color={INK} size={8.6} weight={600}>
              {e.n}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* TAVOLA                                                              */
/* ------------------------------------------------------------------ */
export function TableSetting() {
  return (
    <Frame w={320} h={210} label="Apparecchiatura">
      <circle cx="160" cy="120" r="52" fill={SURF} stroke={LINE} strokeWidth="2" />
      <circle cx="160" cy="120" r="36" fill="none" stroke={LINE} />
      {/* forchette a sinistra */}
      {[82, 96].map((x, i) => (
        <g key={x}>
          <rect x={x - 1.5} y={92} width={3} height={64} rx={1.5} fill={INK} />
          <path d={`M${x - 5} 78 L${x - 5} 92 L${x + 5} 92 L${x + 5} 78`} fill="none" stroke={INK} strokeWidth="1.5" />
          <T x={x} y={170} size={8}>{i === 0 ? "1ª" : "2ª"}</T>
        </g>
      ))}
      {/* coltelli e cucchiaio a destra */}
      {[224, 238].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 78 Q${x + 5} 90 ${x + 2} 104 L${x + 2} 156 L${x - 1} 156 L${x - 1} 78 Z`} fill={INK} />
          <T x={x} y={170} size={8}>{i === 1 ? "1°" : "2°"}</T>
        </g>
      ))}
      <ellipse cx="254" cy="86" rx="5" ry="8" fill={INK} />
      <rect x="252.5" y="94" width="3" height="62" rx="1.5" fill={INK} />
      {/* dessert sopra */}
      <rect x="138" y="54" width="44" height="3" rx="1.5" fill={MUTED} />
      <rect x="138" y="60" width="44" height="3" rx="1.5" fill={MUTED} />
      {/* bicchieri */}
      {[
        [232, 40, 11, "acqua"],
        [256, 34, 9, "rosso"],
        [276, 44, 8, "bianco"],
      ].map(([x, y, r, n]) => (
        <g key={n as string}>
          <circle cx={x as number} cy={y as number} r={r as number} fill="none" stroke={GOLD} strokeWidth="2" />
          <T x={x as number} y={(y as number) - (r as number) - 3} size={7.5}>{n}</T>
        </g>
      ))}
      {/* pane */}
      <circle cx="74" cy="48" r="16" fill={SURF} stroke={LINE} strokeWidth="1.5" />
      <rect x="62" y="46" width="24" height="3" rx="1.5" fill={MUTED} />
      <T x={74} y={76} size={8}>pane</T>
      {/* tovagliolo */}
      <rect x="30" y="100" width="34" height="50" rx="3" fill={SUB} stroke={LINE} />
      <T x={47} y={164} size={8}>tovagliolo</T>
      <T x={160} y={200} color={INK} size={9} weight={600}>Le posate si usano dall'esterno verso il piatto</T>
    </Frame>
  );
}

/* Posate: pausa e fine pasto */
export function CutleryPosition() {
  const plate = (cx: number) => (
    <>
      <circle cx={cx} cy={70} r={50} fill={SURF} stroke={LINE} strokeWidth="2" />
      <circle cx={cx} cy={70} r={34} fill="none" stroke={LINE} />
    </>
  );
  const fork = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
  const knife = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />;
  return (
    <Frame w={300} h={150} label="Posizione delle posate">
      {plate(75)}
      {fork(40, 108, 68, 66)}
      {knife(110, 108, 82, 66)}
      <T x={75} y={140} color={INK} weight={600}>Pausa: a V aperta</T>
      {plate(225)}
      {fork(200, 50, 252, 100)}
      {knife(208, 42, 260, 92)}
      <T x={225} y={140} color={INK} weight={600}>Finito: parallele, ore 4</T>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* OCCHIALI E FORMA DEL VISO                                           */
/* ------------------------------------------------------------------ */
export function FaceFrames() {
  const faces: { n: string; face: string; frame: ReactNode }[] = [
    {
      n: "Tondo",
      face: "M0 -42 C26 -42 34 -18 34 4 C34 28 20 42 0 42 C-20 42 -34 28 -34 4 C-34 -18 -26 -42 0 -42 Z",
      frame: (
        <>
          <rect x="-30" y="-8" width="25" height="16" rx="2" />
          <rect x="5" y="-8" width="25" height="16" rx="2" />
        </>
      ),
    },
    {
      n: "Quadrato",
      face: "M-30 -40 L30 -40 Q34 -40 34 -34 L34 30 Q34 42 22 42 L-22 42 Q-34 42 -34 30 L-34 -34 Q-34 -40 -30 -40 Z",
      frame: (
        <>
          <circle cx="-17" cy="0" r="12" />
          <circle cx="17" cy="0" r="12" />
        </>
      ),
    },
    {
      n: "Ovale",
      face: "M0 -46 C24 -46 32 -20 32 2 C32 30 18 46 0 46 C-18 46 -32 30 -32 2 C-32 -20 -24 -46 0 -46 Z",
      frame: (
        <>
          <rect x="-30" y="-8" width="25" height="16" rx="6" />
          <rect x="5" y="-8" width="25" height="16" rx="6" />
        </>
      ),
    },
    {
      n: "Cuore",
      face: "M-34 -36 L34 -36 Q36 -10 26 14 Q14 40 0 46 Q-14 40 -26 14 Q-36 -10 -34 -36 Z",
      frame: (
        <>
          <path d="M-30 -8 L-5 -8 L-7 6 Q-12 12 -22 10 Q-30 8 -30 -2 Z" />
          <path d="M30 -8 L5 -8 L7 6 Q12 12 22 10 Q30 8 30 -2 Z" />
        </>
      ),
    },
    {
      n: "Allungato",
      face: "M0 -52 C22 -52 28 -24 28 4 C28 32 18 52 0 52 C-18 52 -28 32 -28 4 C-28 -24 -22 -52 0 -52 Z",
      frame: (
        <>
          <rect x="-28" y="-11" width="23" height="22" rx="4" />
          <rect x="5" y="-11" width="23" height="22" rx="4" />
        </>
      ),
    },
  ];
  return (
    <Frame w={400} h={150} label="Montature per forma del viso">
      {faces.map((f, i) => (
        <g key={f.n} transform={`translate(${42 + i * 79} 64)`}>
          <path d={f.face} fill={SUB} stroke={LINE} strokeWidth="1.5" />
          <g fill="none" stroke={GOLD} strokeWidth="3">
            {f.frame}
            <path d="M-5 0 L5 0" />
          </g>
          <T x={0} y={74} color={INK} weight={600}>
            {f.n}
          </T>
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* BARBA: linea del collo                                              */
/* ------------------------------------------------------------------ */
export function BeardNeckline() {
  return (
    <Frame w={260} h={200} label="Linea della barba sul collo">
      {/* viso e collo, vista frontale */}
      <path d="M60 10 L60 70 Q62 118 100 136 Q138 118 140 70 L140 10" fill={SUB} stroke={LINE} strokeWidth="1.5" />
      <path d="M78 128 L74 196 M122 128 L126 196" stroke={LINE} strokeWidth="1.8" fill="none" />
      {/* barba */}
      <path d="M60 58 Q62 118 100 136 Q138 118 140 58 L140 74 Q132 104 116 108 Q100 112 84 108 Q68 104 60 74 Z" fill={INK} opacity=".55" />
      <path d="M62 64 Q66 140 100 152 Q134 140 138 64" fill={INK} opacity=".18" />
      {/* bocca */}
      <path d="M88 92 Q100 98 112 92" stroke={SURF} strokeWidth="2" fill="none" opacity=".8" />
      {/* linea ideale */}
      <path d="M64 120 Q100 160 136 120" stroke={GOLD} strokeWidth="2.5" fill="none" strokeDasharray="5 4" />
      {/* pomo d'Adamo */}
      <path d="M95 178 Q100 170 105 178" stroke={MUTED} strokeWidth="2" fill="none" />
      <path d="M100 145 L100 168" stroke={GOLD} strokeWidth="1.5" markerEnd="url(#ahs)" markerStart="url(#ahs)" />
      <T x={150} y={128} anchor="start" color={INK} size={9.5} weight={600}>linea del collo</T>
      <T x={150} y={141} anchor="start" size={8.5}>circa 2 dita sopra</T>
      <T x={150} y={152} anchor="start" size={8.5}>il pomo d'Adamo</T>
      <T x={150} y={176} anchor="start" size={8.5}>sotto si rade tutto</T>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* PUNTUALITÀ: quando arrivare                                         */
/* ------------------------------------------------------------------ */
export function PunctualityChart({ rows }: { rows: { e: string; from: number; to: number }[] }) {
  const min = -25,
    max = 35,
    w = 360,
    left = 120,
    scale = (w - left - 10) / (max - min);
  const X = (m: number) => left + (m - min) * scale;
  const h = 26 + rows.length * 22;
  return (
    <Frame w={w} h={h + 14} label="Quando arrivare">
      {[-20, -10, 0, 10, 20, 30].map((m) => (
        <g key={m}>
          <line x1={X(m)} y1={14} x2={X(m)} y2={h} stroke={m === 0 ? GOLD : LINE} strokeWidth={m === 0 ? 1.5 : 1} />
          <T x={X(m)} y={h + 11} size={8}>
            {m === 0 ? "orario" : `${m > 0 ? "+" : ""}${m}'`}
          </T>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = 22 + i * 22;
        return (
          <g key={r.e}>
            <T x={left - 8} y={y + 4} anchor="end" color={INK} size={9}>
              {r.e}
            </T>
            <rect x={X(r.from)} y={y - 6} width={Math.max(4, X(r.to) - X(r.from))} height={12} rx={6} fill={r.to <= 0 ? GOLD : MUTED} opacity={r.to <= 0 ? 0.95 : 0.6} />
          </g>
        );
      })}
    </Frame>
  );
}

/* registro delle figure per chiave */
export function Figure({ k, p }: { k: string; p?: Record<string, unknown> }) {
  switch (k) {
    case "tie":
      return <TieStep pose={(p?.pose as TiePose) || "start"} />;
    case "knots":
      return <KnotCompare />;
    case "tieLength":
      return <TieLength />;
    case "bowtie":
      return <BowTie />;
    case "pocket":
      return (
        <div className="grid grid-cols-2 gap-2">
          {(["tv", "punta", "tre", "sbuffo"] as const).map((f) => (
            <div key={f} className="rounded-[12px] bg-card p-2">
              <PocketFold fold={f} />
            </div>
          ))}
        </div>
      );
    case "pocketOne":
      return <PocketFold fold={(p?.fold as "tv") || "tv"} />;
    case "cufflinks":
      return <Cufflinks />;
    case "frenchCuff":
      return <FrenchCuff />;
    case "buttons":
      return <JacketButtons />;
    case "jacketFit":
      return <JacketFit />;
    case "shoes":
      return <ShoeLadder />;
    case "shoe":
      return <Shoe kind={(p?.kind as ShoeKind) || "oxford"} />;
    case "socks":
      return <SockMatch />;
    case "table":
      return <TableSetting />;
    case "cutlery":
      return <CutleryPosition />;
    case "faces":
      return <FaceFrames />;
    case "beard":
      return <BeardNeckline />;
    case "punctuality":
      return <PunctualityChart rows={(p?.rows as { e: string; from: number; to: number }[]) || []} />;
    default:
      return null;
  }
}
