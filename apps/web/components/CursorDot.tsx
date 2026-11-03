'use client';

import { useEffect } from 'react';

// Cursor de Grupo Cesco, portado tal cual de la-terraza-pos (apps/web/components/CursorDot.tsx,
// rama main, pedido de Joaquín 2026-11-02): bolita naranja de 17 px que sigue al puntero con un
// poco de suavidad y un halo de 37 px al 20 % que la sigue más despacio y crece a 44 px sobre
// enlaces y botones (mismos valores que el de Cesco: 0.2 y 0.1 por cuadro). Solo existe con mouse
// o trackpad; en celular no se monta. Decorativo (aria-hidden, sin eventos).

const LINK = 'a,button,select,label,summary,img,[role=button],[role=switch],[role=tab],[role=link]';
const TEXT =
  'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]),textarea,[contenteditable=""],[contenteditable="true"]';

export function CursorDot() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduce.matches) return;

    const root = document.documentElement;
    const make = (kind: string) => {
      const el = document.createElement('div');
      el.className = `lt-cursor lt-cursor-${kind}`;
      el.setAttribute('aria-hidden', 'true');
      el.appendChild(document.createElement('i'));
      document.body.appendChild(el);
      return el;
    };
    const halo = make('halo');
    const dot = make('dot');
    let x = 0,
      y = 0,
      dx = 0,
      dy = 0,
      hx = 0,
      hy = 0,
      raf = 0,
      seen = false;
    let lastTarget: Element | null = null;

    const follow = () => {
      dx += (x - dx) * 0.2;
      dy += (y - dy) * 0.2;
      hx += (x - hx) * 0.1;
      hy += (y - hy) * 0.1;
      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
      raf = Math.abs(x - hx) + Math.abs(y - hy) > 0.3 ? requestAnimationFrame(follow) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!seen) {
        seen = true;
        dx = hx = x;
        dy = hy = y;
        root.classList.add('lt-cursor-active');
      }
      root.classList.add('lt-cursor-on');
      const t = e.target instanceof Element ? e.target : null;
      if (t !== lastTarget) {
        lastTarget = t;
        const text = !!t?.closest(TEXT);
        root.classList.toggle('lt-cursor-text', text);
        root.classList.toggle('lt-cursor-link', !text && !!t?.closest(LINK));
      }
      if (!raf) raf = requestAnimationFrame(follow);
    };
    const hide = () => root.classList.remove('lt-cursor-on');
    const reset = () => {
      lastTarget = null;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('click', reset);
    window.addEventListener('blur', hide);
    document.documentElement.addEventListener('pointerleave', hide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', reset);
      window.removeEventListener('blur', hide);
      document.documentElement.removeEventListener('pointerleave', hide);
      halo.remove();
      dot.remove();
      root.classList.remove('lt-cursor-active', 'lt-cursor-on', 'lt-cursor-link', 'lt-cursor-text');
    };
  }, []);

  return null;
}
