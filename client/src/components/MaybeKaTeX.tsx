import React from "react";
import KaTeXRenderer from "@/components/KaTeXRenderer";

type Props = {
  text: string;
  displayMode?: boolean;
  className?: string;
};

function isLikelyTeX(s: string): boolean {
  if (!s) return false;
  // Quick heuristics: contains TeX markers or commands or math operators
  const texMarkers = ["$", "\\\\", "\\frac", "^", "_", "{", "}"];
  for (const m of texMarkers) if (s.includes(m)) return true;
  // common TeX commands like \alpha, \sqrt etc
  if (/\\[a-zA-Z]+/.test(s)) return true;
  // caret followed by number/letter (e.g., x^2)
  if (/\^[0-9a-zA-Z]/.test(s)) return true;
  return false;
}

export default function MaybeKaTeX({ text, displayMode = false, className }: Props) {
  if (isLikelyTeX(text)) {
    return <KaTeXRenderer formula={text} displayMode={displayMode} className={className} />;
  }
  // Plain text: preserve whitespace and line breaks
  return (
    <div className={className} style={{ whiteSpace: "pre-wrap" }}>
      {text}
    </div>
  );
}
