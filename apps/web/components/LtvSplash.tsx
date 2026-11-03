import Image from 'next/image';

/**
 * Entrada a la app (como el splash de Vault/Cesco): el logo sube desde un
 * desenfoque y la pantalla se desvanece (~1 s). Solo HTML y CSS
 * (.ltv-splash* en globals.css) — corre en cuanto llega el HTML, sin
 * esperar el JS, una vez por carga completa. Decorativo: nunca recibe
 * toques y desaparece con "reducir movimiento".
 */
export function LtvSplash() {
  return (
    <div
      aria-hidden
      className="ltv-splash pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-bg"
    >
      <Image
        src="/logo-full.png"
        alt=""
        width={240}
        height={224}
        priority
        className="ltv-splash-line w-40 h-auto"
      />
    </div>
  );
}
