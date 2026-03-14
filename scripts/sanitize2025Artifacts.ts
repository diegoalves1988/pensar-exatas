import "dotenv/config";
import { getAllQuestions, updateQuestion } from "../server/db";

type ChoiceObject = {
  text?: string | null;
  imageUrl?: string | null;
  file?: string | null;
};

function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function sanitizePdfArtifacts(input: string): string {
  const cleanedLines = input
    .replace(/\r\n/g, "\n")
    .split(/\n/)
    .map((line) => stripControlChars(line).trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(undefined|null)$/i.test(line)) return false;
      if (/^\*?\d{6}AM\d+\*?$/i.test(line)) return false;
      if (/^(?:ENE[MN]2025\s*)+$/i.test(line)) return false;
      if (/^(?:CIÊNCIAS|MATEMÁTICA)\s+E\s+SUAS\s+TECNOLOGIAS\s*\|\s*2[ºo]\s*DIA\s*\|\s*CADERNO\s*5\s*\|\s*AMARELO\s*\d*$/i.test(line)) return false;
      if (/^\d{1,2}$/.test(line)) return false;
      return true;
    });

  return cleanedLines
    .join("\n")
    .replace(/\b(?:undefined|null)\b/gi, " ")
    .replace(/\bENE[MN]2025\b/gi, " ")
    .replace(/\*\d{6}AM\d+\*/gi, " ")
    .replace(/(?:CIÊNCIAS|MATEMÁTICA)\s+E\s+SUAS\s+TECNOLOGIAS\s*\|\s*2[ºo]\s*DIA\s*\|\s*CADERNO\s*5\s*\|\s*AMARELO\s*\d*/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeChoices(rawChoices: unknown): unknown {
  if (!Array.isArray(rawChoices)) return rawChoices;

  return rawChoices.map((choice) => {
    if (typeof choice === "string") {
      return sanitizePdfArtifacts(choice);
    }

    if (choice && typeof choice === "object") {
      const obj = choice as ChoiceObject;
      return {
        ...obj,
        text: typeof obj.text === "string" ? sanitizePdfArtifacts(obj.text) : obj.text,
      };
    }

    return choice;
  });
}

async function main() {
  const rows = (await getAllQuestions()).filter((q) => q.year === 2025);

  let updated = 0;
  let statementChanged = 0;
  let choicesChanged = 0;

  for (const row of rows) {
    const nextStatement = sanitizePdfArtifacts(String(row.statement || ""));
    const nextChoices = sanitizeChoices(row.choices);

    const statementDiff = nextStatement !== String(row.statement || "");
    const choicesDiff = JSON.stringify(nextChoices) !== JSON.stringify(row.choices);

    if (!statementDiff && !choicesDiff) continue;

    await updateQuestion(row.id, {
      statement: statementDiff ? nextStatement : row.statement,
      choices: choicesDiff ? (nextChoices as any) : row.choices,
      updatedAt: new Date(),
    });

    updated += 1;
    if (statementDiff) statementChanged += 1;
    if (choicesDiff) choicesChanged += 1;
  }

  console.log(
    JSON.stringify(
      {
        total2025: rows.length,
        updatedRows: updated,
        statementChanged,
        choicesChanged,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[sanitize2025Artifacts] failed:", err);
  process.exit(1);
});
