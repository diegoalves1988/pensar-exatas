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

type Token =
  | { type: "text"; value: string }
  | { type: "inline-math"; value: string }
  | { type: "display-math"; value: string };

function hasExplicitMathDelimiters(text: string): boolean {
  return text.includes("$$") || text.includes("\\(") || text.includes("\\[") || /(^|[^\\])\$(?!\$)/.test(text);
}

function isReasonableInlineMath(value: string): boolean {
  const candidate = value.trim();
  if (!candidate) return false;
  if (candidate.includes("\n")) return false;

  const texCommands = candidate.match(/\\[A-Za-z]+/g) ?? [];
  const words = candidate.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g) ?? [];
  const operators = candidate.match(/[=+\-*/^_{}()[\]<>]/g) ?? [];

  if (candidate.length > 120 && texCommands.length < 2) return false;
  if (words.length > 6 && texCommands.length < 2) return false;
  if (operators.length === 0 && texCommands.length === 0 && !/\d/.test(candidate)) return false;

  return true;
}

function tokenizeMixedContent(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  const pushText = (value: string) => {
    if (!value) return;
    tokens.push({ type: "text", value });
  };

  while (index < text.length) {
    const rest = text.slice(index);

    if (rest.startsWith("$$")) {
      const end = rest.indexOf("$$", 2);
      if (end !== -1) {
        tokens.push({ type: "display-math", value: rest.slice(2, end) });
        index += end + 2;
        continue;
      }
    }

    if (rest.startsWith("\\[")) {
      const end = rest.indexOf("\\]", 2);
      if (end !== -1) {
        tokens.push({ type: "display-math", value: rest.slice(2, end) });
        index += end + 2;
        continue;
      }
    }

    if (rest.startsWith("\\(")) {
      const end = rest.indexOf("\\)", 2);
      if (end !== -1) {
        tokens.push({ type: "inline-math", value: rest.slice(2, end) });
        index += end + 2;
        continue;
      }
    }

    if (rest[0] === "$" && rest[1] !== "$") {
      let end = 1;
      while (end < rest.length) {
        if (rest[end] === "$" && rest[end - 1] !== "\\") break;
        end += 1;
      }
      if (end < rest.length) {
        const inlineContent = rest.slice(1, end);
        if (isReasonableInlineMath(inlineContent)) {
          tokens.push({ type: "inline-math", value: inlineContent });
          index += end + 1;
          continue;
        }
      }
    }

    let nextIndex = rest.length;
    const candidates = [
      rest.indexOf("$$"),
      rest.indexOf("\\["),
      rest.indexOf("\\("),
      rest.search(/(^|[^\\])\$(?!\$)/),
    ].filter((value) => value >= 0);

    if (candidates.length > 0) {
      nextIndex = Math.min(...candidates.map((value) => {
        if (value < 0) return rest.length;
        const match = rest.slice(value).match(/(^|[^\\])\$(?!\$)/);
        if (value === rest.search(/(^|[^\\])\$(?!\$)/) && match) {
          return value + match[0].length - 1;
        }
        return value;
      }));
    }

    pushText(rest.slice(0, nextIndex || 1));
    index += nextIndex || 1;
  }

  return tokens;
}

export default function MaybeKaTeX({ text, displayMode = false, className }: Props) {
  if (hasExplicitMathDelimiters(text)) {
    const tokens = tokenizeMixedContent(text);
    return (
      <div className={className} style={{ whiteSpace: "pre-wrap" }}>
        {tokens.map((token, index) => {
          if (token.type === "text") {
            return <React.Fragment key={`text-${index}`}>{renderWithBold(token.value)}</React.Fragment>;
          }

          if (token.type === "display-math") {
            return (
              <div key={`display-${index}`} className="my-2">
                <KaTeXRenderer formula={token.value} displayMode />
              </div>
            );
          }

          return <KaTeXRenderer key={`inline-${index}`} formula={token.value} displayMode={false} />;
        })}
      </div>
    );
  }

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
