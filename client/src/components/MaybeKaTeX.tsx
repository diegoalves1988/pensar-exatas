import React from "react";
import KaTeXRenderer from "@/components/KaTeXRenderer";

type Props = {
  text: string;
  displayMode?: boolean;
  className?: string;
};

function isLikelyTeX(s: string): boolean {
  if (!s) return false;
  // Prefer strict signals to avoid false positives in regular Portuguese text.
  if (s.includes("$") || s.includes("\\(") || s.includes("\\[") || s.includes("\\)") || s.includes("\\]")) {
    return true;
  }
  if (/\\(frac|sqrt|left|right|cdot|times|alpha|beta|gamma|theta|pi|sum|int|mathrm|text)\b/.test(s)) {
    return true;
  }
  if (/[A-Za-z0-9]\s*\^\s*[{(]?[A-Za-z0-9]/.test(s)) return true;
  if (/[A-Za-z0-9]\s*_\s*[{(]?[A-Za-z0-9]/.test(s)) return true;
  return false;
}

function renderWithBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[\s\S]*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`bold-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`text-${i}`}>{part}</React.Fragment>;
  });
}

export default function MaybeKaTeX({ text, displayMode = false, className }: Props) {
  if (isLikelyTeX(text)) {
    return <KaTeXRenderer formula={text} displayMode={displayMode} className={className} />;
  }
  // Plain text: preserve whitespace and line breaks, render **bold** markdown
  return (
    <div className={className} style={{ whiteSpace: "pre-wrap" }}>
      {renderWithBold(text)}
    </div>
  );
}
