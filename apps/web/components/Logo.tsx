/**
 * Monograma de LT Vending: el mismo trazo (techo + L + T) del logo de La
 * Terraza (apps/web/components/Logo.tsx, rama main) — es un monograma
 * genérico, no lleva texto de "La Terraza" adentro, así que se reusa tal
 * cual. Usa currentColor: se integra igual en el header oscuro que en claro.
 */
const ROOF = 'M352 92.56L782.5 248.97L766.13 294.02L352 143.56Z';

type Props = { className?: string; title?: string };

/** Solo el monograma. Para el header. */
export function LogoMark({ className, title }: Props) {
  return (
    <svg
      viewBox="306 26 481 462"
      fill="currentColor"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="310" y="30" width="48" height="452" />
      <rect x="354" y="441" width="258" height="41" />
      <rect x="637" y="236" width="50" height="248" />
      <path d={ROOF} />
    </svg>
  );
}

/** Monograma con las piezas animables para la apertura (app/layout.tsx). */
export function LogoIntro({ className }: { className?: string }) {
  return (
    <svg viewBox="306 26 481 462" fill="currentColor" className={className} role="img" aria-label="LT Vending">
      <rect className="lt-logo-bar" x="310" y="30" width="48" height="452" />
      <rect className="lt-logo-base" x="354" y="441" width="258" height="41" />
      <rect className="lt-logo-stem" x="637" y="236" width="50" height="248" />
      <path className="lt-logo-roof" d={ROOF} />
    </svg>
  );
}
