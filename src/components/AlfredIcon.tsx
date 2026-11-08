import { useApp } from "../lib/store";
import { useSignedUrl } from "../lib/supabase";
/**
 * Alfred, il maggiordomo di Habitus: frac, colletto alato e papillon.
 * Disegno originale, in oro sul verde del club.
 */
export function AlfredIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <clipPath id="alfred-c">
          <circle cx="24" cy="24" r="24" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="24" fill="rgb(var(--hero))" />
      <g clipPath="url(#alfred-c)">
        {/* spalle del frac */}
        <path d="M2 50 C2 36 8 29 17 27 L24 31 L31 27 C40 29 46 36 46 50 Z" fill="#101512" stroke="currentColor" strokeOpacity=".35" strokeWidth=".6" />
        {/* risvolti in raso */}
        <path d="M17 27 L24 43 L22 47 L13.5 31 Z" fill="currentColor" />
        <path d="M31 27 L24 43 L26 47 L34.5 31 Z" fill="currentColor" />
        {/* sparato della camicia */}
        <path d="M18.5 26.5 L24 43 L29.5 26.5 L27 19 L21 19 Z" fill="#f4efe4" />
        <circle cx="24" cy="31.5" r="0.95" fill="#0b0f0d" />
        <circle cx="24" cy="35.5" r="0.95" fill="#0b0f0d" />
        {/* colletto alato */}
        <path d="M21 19 L16.6 22.8 L20.6 24 L24 21.6 Z M27 19 L31.4 22.8 L27.4 24 L24 21.6 Z" fill="#ffffff" stroke="#0b0f0d" strokeOpacity=".25" strokeWidth=".5" />
        {/* papillon */}
        <path d="M24 23.6 L16.8 20.2 Q15.6 23.6 16.8 27 Z M24 23.6 L31.2 20.2 Q32.4 23.6 31.2 27 Z" fill="#0b0f0d" />
        <rect x="22.2" y="21.8" width="3.6" height="3.6" rx="1" fill="#0b0f0d" stroke="currentColor" strokeWidth=".7" />
        {/* collo */}
        <path d="M20.5 19 C20.5 14.5 27.5 14.5 27.5 19 Z" fill="currentColor" opacity=".35" />
      </g>
      <circle cx="24" cy="24" r="23.25" fill="none" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" />
    </svg>
  );
}

/** Il volto di Alfred: l'immagine scelta dall'utente se c'è, altrimenti l'icona. */
export function AlfredAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  const app = useApp();
  const url = useSignedUrl("avatars", app.profile?.alfred_foto || null);
  if (url)
    return <img src={url} alt="Alfred" width={size} height={size} style={{ width: size, height: size }} className={`rounded-full object-cover ring-1 ring-gold/50 ${className}`} />;
  return <AlfredIcon size={size} className={`text-gold ${className}`} />;
}
