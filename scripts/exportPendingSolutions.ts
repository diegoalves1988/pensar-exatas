import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";

type Row = {
  id: number;
  year: number | null;
  subjectId: number;
  title: string;
  statement: string;
  choices: any;
  correctChoice: number | null;
  solution: string | null;
  subjectName: string | null;
};

function choiceIndexToLetter(index: number | null): "A" | "B" | "C" | "D" | "E" | null {
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
      return null;
  }
}

function isPlaceholderSolution(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  return text.startsWith("gabarito oficial enem: alternativa");
}

function normalizeChoices(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((choice) => {
    if (typeof choice === "string") return choice;
    if (choice && typeof choice === "object") {
      const text = choice.text ? String(choice.text).trim() : "";
      const imageUrl = choice.imageUrl ? String(choice.imageUrl).trim() : "";
      if (text && imageUrl) return `${text} ![](${imageUrl})`;
      if (text) return text;
      if (imageUrl) return `[Alternativa com imagem] ![](${imageUrl})`;
    }
    return "";
  });
}

async function main() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) throw new Error("DATABASE_URL not set");

  const withSsl = raw.includes("sslmode=")
    ? raw
    : raw.includes("?")
      ? `${raw}&sslmode=require`
      : `${raw}?sslmode=require`;

  const sql = postgres(withSsl, { max: 1, prepare: false });

  try {
    const limit = Number(process.env.LIMIT ?? 100);
    const targetYear = process.env.YEAR ? Number(process.env.YEAR) : null;
    const outPath = process.env.OUT_PATH
      ? path.resolve(process.env.OUT_PATH)
      : path.resolve(process.cwd(), "data", "pending-solutions.json");

    const rows = await sql<Row[]>`
      SELECT
        q.id,
        q.year,
        q."subjectId",
        q.title,
        q.statement,
        q.choices,
        q."correctChoice",
        q.solution,
        s.name as "subjectName"
      FROM questions q
      LEFT JOIN subjects s ON s.id = q."subjectId"
      ORDER BY q.year ASC NULLS LAST, q.id ASC
    `;

    const filtered = rows
      .filter((row) => (targetYear ? row.year === targetYear : true))
      .filter((row) => isPlaceholderSolution(row.solution))
      .slice(0, Math.max(1, limit))
      .map((row) => ({
        id: row.id,
        year: row.year,
        subject: row.subjectName,
        title: row.title,
        statement: row.statement,
        choices: normalizeChoices(row.choices),
        correctChoice: row.correctChoice,
        correctAlternative: choiceIndexToLetter(
          typeof row.correctChoice === "number" ? row.correctChoice : null,
        ),
      }));

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2), "utf8");

    console.log(`[export-pending-solutions] wrote ${filtered.length} items to ${outPath}`);
    if (targetYear) console.log(`[export-pending-solutions] filtered by year: ${targetYear}`);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("[export-pending-solutions] failed:", err);
  process.exit(1);
});
