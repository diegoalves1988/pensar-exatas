import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";

type ExtractedQuestion = {
  questionNumber: number;
  title: string;
  statement: string;
  choices?: string[];
};

function cleanPdfNoise(text: string): string {
  return text
    .replace(/\*\d{6}AM\d+\*/g, " ")
    .replace(/ENEM2025(?:ENEM2025)+/g, " ")
    .replace(/CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS\s*\|\s*2º DIA\s*\|\s*CADERNO 5\s*\|\s*AMARELO\s*\d*/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parseChoicesFromStatement(statement: string): { cleanStatement: string; choices: string[] } {
  // Supports lines like: A\ttexto / A) texto / A. texto / A texto
  const markerRegex = /(?:^|\n)\s*([A-E])(?:\t|\)|\.|\-|\s{2,})\s*/g;
  const matches = [...statement.matchAll(markerRegex)];

  if (matches.length < 5) {
    return { cleanStatement: statement.trim(), choices: [] };
  }

  const first = matches[0].index ?? 0;
  const cleanStatement = statement.slice(0, first).trim();

  const choiceMap = new Map<string, string>();
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const letter = current[1];
    const contentStart = (current.index ?? 0) + current[0].length;
    const contentEnd = i + 1 < matches.length ? (matches[i + 1].index ?? statement.length) : statement.length;
    const raw = statement.slice(contentStart, contentEnd).trim();
    if (!choiceMap.has(letter)) {
      choiceMap.set(letter, raw);
    }
  }

  const letters = ["A", "B", "C", "D", "E"];
  const choices = letters.map((letter) => (choiceMap.get(letter) ?? "").replace(/\s+/g, " ").trim());

  if (choices.some((value) => !value)) {
    return { cleanStatement: cleanStatement || statement.trim(), choices: [] };
  }

  return { cleanStatement, choices };
}

async function main() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) throw new Error("DATABASE_URL not set");

  const filePath = process.env.PDF_EXTRACT_PATH
    ? path.resolve(process.env.PDF_EXTRACT_PATH)
    : path.resolve(process.cwd(), "data", "pdf-2025-extracted.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Extracted file not found: ${filePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExtractedQuestion[];
  if (!Array.isArray(payload)) {
    throw new Error("Invalid extracted JSON: expected array");
  }

  const withSsl = raw.includes("sslmode=")
    ? raw
    : raw.includes("?")
      ? `${raw}&sslmode=require`
      : `${raw}?sslmode=require`;

  const sql = postgres(withSsl, { max: 1, prepare: false });

  try {
    let updatedStatements = 0;
    let updatedChoices = 0;
    let matchedQuestions = 0;

    for (const item of payload) {
      const qn = Number(item.questionNumber);
      if (!Number.isFinite(qn)) continue;

      const cleaned = cleanPdfNoise(String(item.statement || ""));
      const parsed = parseChoicesFromStatement(cleaned);
      const finalStatement = parsed.cleanStatement;
      const hasChoices = parsed.choices.length === 5;

      const rows = await sql<{ id: number }[]>`
        SELECT id
        FROM questions
        WHERE year = 2025
          AND title ILIKE ${`%Questão ${qn}%`}
        ORDER BY id DESC
      `;

      if (rows.length === 0) continue;
      matchedQuestions += rows.length;

      for (const row of rows) {
        await sql`
          UPDATE questions
          SET
            statement = ${finalStatement},
            "updatedAt" = NOW()
          WHERE id = ${row.id}
        `;
        updatedStatements += 1;

        if (hasChoices) {
          await sql`
            UPDATE questions
            SET
              choices = ${sql.json(parsed.choices)},
              "updatedAt" = NOW()
            WHERE id = ${row.id}
          `;
          updatedChoices += 1;
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          extractedItems: payload.length,
          matchedQuestions,
          updatedStatements,
          updatedChoices,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("[sync2025FromPdf] failed:", err);
  process.exit(1);
});
