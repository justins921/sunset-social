"use client";

import { useEffect, useRef } from "react";

// Shrinks its contents (never enlarges) so the whole thing fits on a single
// printed page. It measures the natural height at the fixed print width, then
// sets a --fit factor applied in print as CSS `zoom` — which, unlike a
// transform, scales the actual layout so pagination follows it and the report
// prints on one page. The fit is computed on mount so it also applies to
// headless PDF export, which never fires the beforeprint event.
const PRINT_H = 950; // printable height (px) of US Letter at ~10mm margins

export function FitToPage({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const fit = () => {
      el.style.setProperty("--fit", "1");
      const h = el.offsetHeight;
      const scale = h > PRINT_H ? PRINT_H / h : 1;
      el.style.setProperty("--fit", scale.toFixed(4));
    };
    fit();
    const t = window.setTimeout(fit, 250); // after web fonts settle
    if (typeof document !== "undefined" && "fonts" in document) {
      (document as Document & { fonts: FontFaceSet }).fonts.ready.then(fit).catch(() => {});
    }
    window.addEventListener("beforeprint", fit);
    window.addEventListener("resize", fit);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeprint", fit);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div className="fitwrap">
      <div ref={inner} className="fitinner">
        {children}
      </div>
    </div>
  );
}
