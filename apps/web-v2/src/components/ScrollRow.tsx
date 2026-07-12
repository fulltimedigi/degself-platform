"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal snap-scroll row with a subtle leading-edge fade that hints there's
 * more content off-screen. RTL: the "next" content sits on the LEFT, so the fade
 * lives on the left edge. The fade only shows while the row actually overflows.
 * Children must set `snap-start shrink-0` on each card/chip.
 */
export function ScrollRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth - el.clientWidth > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto ${className}`}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-l from-transparent to-background transition-opacity duration-200 ${
          overflowing ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
