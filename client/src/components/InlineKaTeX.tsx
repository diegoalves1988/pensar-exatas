import React from "react";
import KaTeXRenderer from "@/components/KaTeXRenderer";

type Props = {
  text?: string | null;
  className?: string;
};

function isLikelyTeX(s: string): boolean {
  if (!s) return false;
  if (s.includes("$") || s.includes("\\")) return true;
  if (s.includes("^") || s.includes("_")) return true;
  if (/\\[a-zA-Z]+/.test(s)) return true;
  if (/\^[0-9a-zA-Z]/.test(s)) return true;
  return false;
}

export default function InlineKaTeX({ text = "", className }: Props) {
  const safeText = text ?? "";
  const tokens = safeText.split(/(\s+)/); // preserve whitespace
  // find first token that looks like TeX
  let start = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].trim();
    if (!t) continue;
    if (isLikelyTeX(t)) { start = i; break; }
  }

  if (start === -1) {
    return <span className={className}>{text}</span>;
  }

  // expand to include consecutive tokens that are likely TeX
  let end = start;
  for (let i = start + 1; i < tokens.length; i++) {
    const t = tokens[i].trim();
    if (!t) { end = i; continue; }
    if (isLikelyTeX(t)) end = i; else break;
  }

  const before = tokens.slice(0, start).join("");
  const math = tokens.slice(start, end + 1).join("");
  const after = tokens.slice(end + 1).join("");

  return (
    <span className={className}>
      {before}
      <KaTeXRenderer formula={math} displayMode={false} />
      {after}
    </span>
  );
}
