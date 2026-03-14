import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";

type PatchItem = {
  id: number;
  solution: string;
};

function choiceIndexToLetter(index: number | null): "A" | "B" | "C" | "D" | "E" {
  switch (index) {
    case 0:
      return "A";
    case 1:
      return "B";
    case 2:
      return "C";
    case 3:
      return "D";
    case 4:
      return "E";
    default:
      return "A";
  }
}

function stripGabaritoLine(text: string): string {
  return text
    .replace(/\n*\s*gabarito oficial enem:\s*alternativa\s*[A-E]\.?\s*$/i, "")
    .replace(/gabarito oficial enem:\s*alternativa\s*[A-E]\.?/gi, "")
    .trim();
}

function normalizeSolutionBody(text: string): string {
  return stripGabaritoLine(text).trim();
}

function isRealSolution(text: string): boolean {
  const normalized = stripGabaritoLine(text).trim().toLowerCase();
  if (!normalized) return false;
  return normalized.length >= 80;
}

async function main() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) throw new Error("DATABASE_URL not set");

  const inPath = process.env.IN_PATH
    ? path.resolve(process.env.IN_PATH)
    : path.resolve(process.cwd(), "data", "solutions-patch.json");

  if (!fs.existsSync(inPath)) {
    throw new Error(`patch file not found: ${inPath}`);
  }

  const patch = JSON.parse(fs.readFileSync(inPath, "utf8")) as PatchItem[];
  if (!Array.isArray(patch)) {
    throw new Error("invalid patch file: expected an array");
  }

  const valid = patch.filter((item) =>
    Number.isFinite(item?.id) &&
    typeof item?.solution === "string" &&
    isRealSolution(item.solution),
  );

  const withSsl = raw.includes("sslmode=")
    ? raw
    : raw.includes("?")
      ? `${raw}&sslmode=require`
      : `${raw}?sslmode=require`;

  const sql = postgres(withSsl, { max: 1, prepare: false });

  try {
    let updated = 0;
    let missingQuestion = 0;

    for (const item of valid) {
      const [question] = await sql<{ correctChoice: number | null }[]>`
        SELECT "correctChoice"
        FROM questions
        WHERE id = ${item.id}
        LIMIT 1
      `;

      if (!question) {
        missingQuestion += 1;
        continue;
      }

      const letter = choiceIndexToLetter(
        typeof question.correctChoice === "number" ? question.correctChoice : null,
      );
      const body = normalizeSolutionBody(item.solution);
      const finalSolution = `${body}\n\nGabarito oficial ENEM: alternativa ${letter}.`;

      const rows = await sql`
        UPDATE questions
        SET solution = ${finalSolution}, "updatedAt" = NOW()
        WHERE id = ${item.id}
        RETURNING id
      `;
      if (rows.length > 0) updated += 1;
    }

    console.log(`[import-solutions-patch] valid items: ${valid.length}`);
    console.log(`[import-solutions-patch] updated rows: ${updated}`);
    console.log(`[import-solutions-patch] ids not found: ${missingQuestion}`);
    console.log(`[import-solutions-patch] skipped items: ${patch.length - valid.length}`);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("[import-solutions-patch] failed:", err);
  process.exit(1);
});
