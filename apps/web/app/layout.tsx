import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CursorDot } from '@/components/CursorDot';
import { LogoIntro } from '@/components/Logo';

// Apertura (portada tal cual de la-terraza-pos, rama main, app/layout.tsx): el logo se arma
// cada vez que se abre o se recarga la página. Un toque la salta. Chrome en computadora
// precarga páginas visitadas seguido y la apertura corría escondida (ya había terminado al
// verse) — por eso espera (lt-intro-wait) mientras está precargada o en pestaña de fondo, y se
// repite si el navegador la regresa de su memoria (atrás/adelante) sin recargarla.
const INTRO_SCRIPT = `try{var d=document.documentElement;document.addEventListener('pointerdown',function(e){var t=e.target;if(t&&t.closest&&t.closest('.lt-intro'))d.classList.add('lt-intro-seen')});
var hid=function(){return document.prerendering||document.visibilityState==='hidden'};
if(hid()){d.classList.add('lt-intro-wait');var go=function(){if(!hid()){d.classList.remove('lt-intro-wait');['prerenderingchange','visibilitychange'].forEach(function(n){document.removeEventListener(n,go)});window.removeEventListener('focus',go)}};document.addEventListener('prerenderingchange',go);document.addEventListener('visibilitychange',go);window.addEventListener('focus',go)}
window.addEventListener('pageshow',function(e){var i=e.persisted&&document.querySelector('.lt-intro');if(!i||!i.getAnimations)return;d.classList.remove('lt-intro-seen');i.getAnimations({subtree:true}).forEach(function(a){a.currentTime=0;a.play()})})}catch(e){}`;

export const metadata: Metadata = {
  title: 'LT Vending',
  description: 'Control de máquinas de vending — inventario, ventas y rutas de surtido',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#151912',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: el script de apertura y el cursor cambian el <html>.
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>
        <div className="lt-intro" aria-hidden="true">
          <div className="flex items-center gap-2.5">
            <LogoIntro className="h-10 w-auto" />
            <span className="font-display text-[1.75rem] leading-none font-medium">
              <span className="lt-logo-word">LT</span> <span className="lt-logo-word">Vending</span>
            </span>
          </div>
        </div>
        <CursorDot />
        {children}
      </body>
    </html>
  );
}
