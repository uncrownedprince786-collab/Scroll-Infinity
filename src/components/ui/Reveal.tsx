"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * One-time reveal on scroll (opacity + translateY, styled by `.reveal` in
 * globals.css). Progressive enhancement: the element renders visible, and only
 * once JS runs do below-the-fold elements get the hidden→reveal treatment — so
 * content is never hidden when JS is unavailable or motion is reduced. Uses
 * direct class toggling (no React state) to stay a pure DOM side effect.
 */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Don't animate content already on screen — avoids a hide/reveal flash.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) return;

    if (delay) el.style.transitionDelay = `${delay}ms`;
    el.classList.add("reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("in-view");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
