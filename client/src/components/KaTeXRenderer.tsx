import React, { useEffect, useRef, useState } from "react";

// This component dynamically loads KaTeX from CDN and renders a TeX string.
// It avoids requiring katex at build time so it's safe for projects that don't
// have katex installed as a dependency. For best performance and offline use,
// prefer installing `katex` via npm and importing it directly.

type Props = {
  formula: string;
  displayMode?: boolean;
  className?: string;
  // If true, the component will render a placeholder while katex loads.
  showPlaceholder?: boolean;
};

const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js";

function ensureCss(url: string) {
  if (document.querySelector(`link[href=\"${url}\"]`)) return Promise.resolve();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
  return new Promise<void>((resolve) => {
    link.onload = () => resolve();
    // If onload doesn't fire, resolve anyway after a short timeout
    setTimeout(() => resolve(), 2000);
  });
}

function ensureScript(url: string) {
  // If already present, resolve immediately
  if ((window as any).katex) return Promise.resolve();
  if (document.querySelector(`script[src=\"${url}\"]`)) {
    return new Promise<void>((resolve) => {
      const check = () => { if ((window as any).katex) resolve(); else setTimeout(check, 50); };
      check();
    });
  }

  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(new Error("Failed to load KaTeX script"));
    document.head.appendChild(s);
  });
}

export default function KaTeXRenderer({ formula, displayMode = false, className, showPlaceholder = true }: Props) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [loaded, setLoaded] = useState<boolean>(Boolean((window as any).katex));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        await ensureCss(KATEX_CSS);
        await ensureScript(KATEX_JS);
        if (!mounted) return;
        setLoaded(true);
      } catch (err: any) {
        console.error("KaTeX load failed", err);
        if (!mounted) return;
        setError(String(err?.message || err));
      }
    }
    if (!loaded) load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    try {
      const katex = (window as any).katex;
      // renderToString is safe with throwOnError: false
      const html = katex.renderToString(formula || "", { throwOnError: false, displayMode });
      containerRef.current.innerHTML = html;
    } catch (err: any) {
      console.error("KaTeX render failed", err);
      setError(String(err?.message || err));
    }
  }, [loaded, formula, displayMode]);

  if (error) {
    return <code className={className} style={{ color: "crimson" }}>KaTeX error: {error}</code>;
  }

  if (!loaded && showPlaceholder) {
    return <span className={className} ref={containerRef}>carregando fórmula…</span>;
  }

  return <span className={className} ref={containerRef} aria-hidden={false} />;
}
