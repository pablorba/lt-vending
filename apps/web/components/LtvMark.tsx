/**
 * Marca de LT Vending: el mismo trazo de techo/casa de La Terraza (logo.png
 * de ese repo), aquí formando una "L". PROVISIONAL — Pablo ya hizo el logo
 * real en Chat GPT (casita + "LT" + "Vending"); se reemplaza este trazo por
 * ese archivo en cuanto lo suba.
 */
export function LtvMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <path
        d="M14 8 V48 H40"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M14 18 L50 32 L44 44 L14 32"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <rect x="40" y="26" width="7" height="22" fill="currentColor" />
      <rect x="20" y="38" width="5" height="5" fill="rgb(var(--accent-rgb))" />
      <rect x="29" y="38" width="5" height="5" fill="rgb(var(--accent-rgb))" />
    </svg>
  );
}
