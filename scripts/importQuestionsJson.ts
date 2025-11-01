import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAllSubjects, createSubject, createQuestion } from "../server/db";

type SeedQuestion = {
  subject: string; // subject name
  title: string;
  statement: string;
  solution: string;
  difficulty?: "easy" | "medium" | "hard";
  year?: number;
  sourceUrl?: string;
};

async function ensureSubject(name: string) {
  try {
    await createSubject({ name, description: null, icon: null, color: null, order: 0 });
  } catch {}
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Create a .env with DATABASE_URL and JWT_SECRET.");
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const jsonPath = process.env.QUESTIONS_JSON_PATH
    ? path.resolve(process.env.QUESTIONS_JSON_PATH)
    : path.resolve(__dirname, "../data/questions.json");

  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON file not found at ${jsonPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SeedQuestion[];
  if (!Array.isArray(payload)) {
    console.error("Invalid JSON: expected an array of questions");
    process.exit(1);
  }

  // Ensure all subjects exist
  const subjectNames = Array.from(new Set(payload.map(q => q.subject).filter(Boolean)));
  for (const name of subjectNames) {
    await ensureSubject(name);
  }

  // Build subject map
  const subs = await getAllSubjects();
  const byName = new Map(subs.map(s => [s.name, s] as const));

  let ok = 0, skipped = 0;
  for (const q of payload) {
    const subj = byName.get(q.subject);
    if (!subj) { skipped++; continue; }
    await createQuestion({
      subjectId: subj.id,
      title: q.title,
      statement: q.statement,
      solution: q.solution,
      difficulty: q.difficulty ?? null,
      year: q.year ?? null,
      sourceUrl: q.sourceUrl ?? null,
    });
    ok++;
  }

  console.log(`[import] inserted ${ok} questions, skipped ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
