import "dotenv/config";
import fs from "fs";
import path from "path";
import { getAllQuestions, updateQuestion } from "../server/db";

type ImageManifestItem = {
  questionNumber: number;
  imageUrl: string;
};

async function main() {
  const manifestPath = process.env.MANIFEST_PATH
    ? path.resolve(process.env.MANIFEST_PATH)
    : path.resolve(process.cwd(), "data", "pdf-2025-images-manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ImageManifestItem[];
  if (!Array.isArray(manifest)) {
    throw new Error("Invalid manifest: expected array");
  }

  const all = await getAllQuestions();
  const year2025 = all.filter((q) => q.year === 2025);

  const questionNumberToRows = new Map<number, Array<(typeof year2025)[number]>>();
  for (const q of year2025) {
    const m = String(q.title || "").match(/Quest[aã]o\s+(\d+)/i);
    if (!m) continue;
    const qnum = Number(m[1]);
    if (!questionNumberToRows.has(qnum)) {
      questionNumberToRows.set(qnum, []);
    }
    questionNumberToRows.get(qnum)!.push(q);
  }

  let matched = 0;
  let updated = 0;

  for (const item of manifest) {
    const rows = questionNumberToRows.get(Number(item.questionNumber)) || [];
    if (rows.length === 0) continue;
    matched += rows.length;

    for (const row of rows) {
      await updateQuestion(row.id, {
        imageUrl: item.imageUrl,
        updatedAt: new Date(),
      });
      updated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        manifestItems: manifest.length,
        questions2025: year2025.length,
        matchedRows: matched,
        updatedRows: updated,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[apply2025ImageManifest] failed:", err);
  process.exit(1);
});
