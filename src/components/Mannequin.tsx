import { Garment } from "../lib/supabase";
import { GarmentImg } from "./ui";

export type Measures = { spalle: number; petto: number; vita: number; fianchi: number; forma_corpo: number; altezza: number; peso: number };
export const DEFAULT_MEASURES: Measures = { spalle: 48, petto: 100, vita: 85, fianchi: 98, forma_corpo: 85, altezza: 180, peso: 80 };

/** Neutral mannequin drawn in a 200x500 viewBox; widths react to measurements. */
export function MannequinSvg({ m = DEFAULT_MEASURES, className = "" }: { m?: Measures; className?: string }) {
  const masc = m.forma_corpo / 100; // 0 femminile → 1 maschile
  const bulk = Math.max(0.85, Math.min(1.25, m.peso / (m.altezza - 100)));
  const sh = (m.spalle / 48) * (40 + 8 * masc) * bulk; // half shoulder width
  const ch = (m.petto / 100) * 34 * bulk;
  const wa = (m.vita / 85) * (26 - 3 * (1 - masc)) * bulk;
  const hi = (m.fianchi / 98) * (32 + 5 * (1 - masc)) * bulk;
  const cx = 100;
  const torso = `M ${cx - 9} 74 L ${cx - sh} 92 Q ${cx - sh - 4} 100 ${cx - ch} 128 L ${cx - wa} 200 Q ${cx - hi - 2} 235 ${cx - hi} 262
    L ${cx + hi} 262 Q ${cx + hi + 2} 235 ${cx + wa} 200 L ${cx + ch} 128 Q ${cx + sh + 4} 100 ${cx + sh} 92 L ${cx + 9} 74 Z`;
  const leg = (s: 1 | -1) =>
    `M ${cx + s * 2} 258 L ${cx + s * hi} 258 Q ${cx + s * (hi - 2)} 320 ${cx + s * 20} 372 L ${cx + s * 15} 470 L ${cx + s * 5} 470 L ${cx + s * 4} 372 Q ${cx + s * 2} 320 ${cx + s * 2} 258 Z`;
  const arm = (s: 1 | -1) =>
    `M ${cx + s * (sh - 2)} 92 Q ${cx + s * (sh + 10)} 100 ${cx + s * (sh + 9)} 140 L ${cx + s * (sh + 12)} 200 L ${cx + s * (sh + 13)} 268
     Q ${cx + s * (sh + 9)} 278 ${cx + s * (sh + 4)} 268 L ${cx + s * (sh + 1)} 202 L ${cx + s * (sh - 3)} 140 Z`;
  return (
    <svg viewBox="0 0 200 500" className={className} aria-hidden>
      <defs>
        <linearGradient id="mq" x1="0" x2="1">
          <stop offset="0" stopColor="#E4E4E8" />
          <stop offset=".5" stopColor="#F7F7F9" />
          <stop offset="1" stopColor="#DCDCE1" />
        </linearGradient>
      </defs>
      <ellipse cx={100} cy={492} rx={52} ry={6} fill="#000" opacity=".06" />
      <g fill="url(#mq)" stroke="#D2D2D8" strokeWidth=".8">
        <path d={arm(-1)} />
        <path d={arm(1)} />
        <path d={leg(-1)} />
        <path d={leg(1)} />
        <path d={torso} />
        <rect x={93} y={60} width={14} height={20} rx={5} />
        <ellipse cx={100} cy={40} rx={19} ry={23} />
        <path d={`M ${cx - 16} 468 h 14 v 18 h -22 q -2 -10 8 -18 Z`} />
        <path d={`M ${cx + 16} 468 h -14 v 18 h 22 q 2 -10 -8 -18 Z`} />
      </g>
    </svg>
  );
}

/** Mannequin with garments layered by slot. Container keeps 2:5 aspect. */
export function DressedMannequin({
  m,
  top = [],
  bottom,
  scarpe,
  className = "",
}: {
  m?: Measures;
  top?: Garment[];
  bottom?: Garment | null;
  scarpe?: Garment | null;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[2/5] ${className}`}>
      <MannequinSvg m={m} className="absolute inset-0 w-full h-full" />
      {scarpe && (
        <div className="absolute left-[24%] right-[24%] top-[90%] bottom-0">
          <GarmentImg g={scarpe} className="w-full h-full" />
        </div>
      )}
      {bottom && (
        <div className="absolute left-[22%] right-[22%] top-[49%] bottom-[5%]">
          <GarmentImg g={bottom} className="w-full h-full object-top" />
        </div>
      )}
      {top.map((g, i) => (
        <div
          key={g.id + i}
          className="absolute"
          style={{
            left: `${4 - i * 1.5}%`,
            right: `${4 - i * 1.5}%`,
            top: `${15 - i * 0.6}%`,
            height: `${g.categoria === "Giacche e Cappotti" ? 43 : 39 + i}%`,
            zIndex: 10 + i,
          }}
        >
          <GarmentImg g={g} className="w-full h-full object-top" />
        </div>
      ))}
    </div>
  );
}
