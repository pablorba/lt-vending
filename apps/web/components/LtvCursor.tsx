'use client';

import { useEffect, useRef } from 'react';

/** Lo que se puede tocar: sobre esto el halo crece. */
const INTERACTIVE = 'a[href], button, [role="button"], [role="tab"], label, summary, select';

/**
 * Cursor de LT Vending (portado de Vault/finanzas-personales, inspirado en
 * el de Cesco): una bolita sólida del bronce de La Terraza que sigue al
 * puntero exacto, y un halo al 20% que la alcanza con un pequeño retraso y
 * crece sobre enlaces/botones. Solo con mouse o trackpad — en celular no
 * existe. Decorativo (aria-hidden, pointer-events: none).
 */
export function LtvCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || !dot.current || !halo.current) return;
    const root = document.documentElement;
    const d = dot.current;
    const h = halo.current;
    let x = -100,
      y = -100,
      hx = -100,
      hy = -100,
      frame = 0,
      visible = false;

    const place = () => {
      d.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      h.style.transform = `translate3d(${hx}px, ${hy}px, 0) translate(-50%, -50%)`;
    };
    const tick = () => {
      hx += (x - hx) * 0.2;
      hy += (y - hy) * 0.2;
      place();
      frame = Math.abs(x - hx) + Math.abs(y - hy) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const show = (on: boolean) => {
      if (on === visible) return;
      visible = on;
      root.toggleAttribute('data-ltv-cursor-visible', on);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return show(false);
      x = e.clientX;
      y = e.clientY;
      if (!visible || reduce.matches) {
        hx = x;
        hy = y;
      }
      show(true);
      if (reduce.matches) place();
      else if (!frame) frame = requestAnimationFrame(tick);
      d.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };
    const over = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      root.toggleAttribute('data-ltv-cursor-active', Boolean(target?.closest(INTERACTIVE)));
    };
    const leave = (e: PointerEvent) => {
      if (!e.relatedTarget) show(false);
    };
    const press = (on: boolean) => () => root.toggleAttribute('data-ltv-cursor-down', on);
    const down = press(true);
    const up = press(false);

    root.setAttribute('data-ltv-cursor', '');
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', leave);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      for (const a of ['data-ltv-cursor', 'data-ltv-cursor-visible', 'data-ltv-cursor-active', 'data-ltv-cursor-down']) {
        root.removeAttribute(a);
      }
    };
  }, []);

  return (
    <div aria-hidden className="ltv-cursor pointer-events-none fixed inset-0 z-[80]">
      <div ref={halo} className="ltv-cursor-halo" />
      <div ref={dot} className="ltv-cursor-dot" />
    </div>
  );
}
