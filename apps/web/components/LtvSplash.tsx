import { LtvMark } from './LtvMark';

/**
 * Entrada a la app (como el splash de Vault/Cesco): el logo y "LT Vending"
 * suben desde un desenfoque y la pantalla se desvanece (~1 s). Solo HTML y
 * CSS (.ltv-splash* en globals.css) — corre en cuanto llega el HTML, sin
 * esperar el JS, una vez por carga completa. Decorativo: nunca recibe
 * toques y desaparece con "reducir movimiento".
 */
export function LtvSplash() {
  return (
    <div
      aria-hidden
      className="ltv-splash pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-bg"
    >
      <div className="flex items-center gap-3">
        <LtvMark className="ltv-splash-line size-12 text-text" />
        <span className="ltv-splash-line text-3xl font-bold tracking-tight text-text">
          LT <span style={{ color: 'rgb(var(--accent-rgb))' }}>Vending</span>
        </span>
      </div>
    </div>
  );
}
