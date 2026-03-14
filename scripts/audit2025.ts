import "dotenv/config";
import { getAllQuestions } from "../server/db";

async function main() {
  const all = await getAllQuestions();
  const rows = all.filter((q) => q.year === 2025);
  const noChoices = rows.filter((q) => !Array.isArray(q.choices) || q.choices.length !== 5);
  const noImage = rows.filter((q) => !q.imageUrl);

  const sample = noChoices.slice(0, 10).map((q) => ({
    id: q.id,
    title: q.title,
    hasImage: Boolean(q.imageUrl),
    statementSnippet: String(q.statement || "").slice(0, 220),
  }));

  console.log(
    JSON.stringify(
      {
        total2025: rows.length,
        noChoicesCount: noChoices.length,
        noImageCount: noImage.length,
        sampleNoChoices: sample,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
