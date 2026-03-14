/**
 * Fix 2025 ENEM questions with empty or incorrect alternatives.
 * Data extracted from the original PDF (2025_PV_impresso_D2_CD5.pdf).
 *
 * Run: pnpm tsx scripts/fix2025Choices.ts
 */
import "dotenv/config";
import { getAllQuestions, updateQuestion } from "../server/db";

interface ChoiceFix {
  /** DB row id */
  id: number;
  /** Question number (for logging) */
  num: number;
  /** Correct choices array [A, B, C, D, E] */
  choices: string[];
  /** Optional: cleaned statement (removes embedded alternatives / artifacts) */
  statementReplace?: { search: string; replace: string };
}

const fixes: ChoiceFix[] = [
  // ── Text alternatives extracted from PDF ──────────────────────────

  // Q104 – physics (point on screen)
  { id: 985, num: 104, choices: ["1", "2", "3", "4", "5"] },

  // Q135 – electric fuse / activities count
  { id: 995, num: 135, choices: ["4", "3", "2", "1", "0"] },

  // Q139 – median speed
  { id: 999, num: 139, choices: ["360", "370", "380", "390", "400"] },

  // Q141 – colors to paint polyhedron prototype
  { id: 1001, num: 141, choices: ["9", "8", "6", "4", "3"] },

  // Q146 – GNV cylinder capacity
  { id: 1006, num: 146, choices: ["10", "14", "17", "21", "25"] },

  // Q151 – vertices of polyhedron
  { id: 1011, num: 151, choices: ["21", "25", "55", "80", "110"] },

  // Q154 – probability (fractions) - also needs statement cleanup
  {
    id: 1014,
    num: 154,
    choices: ["1/2", "1/10", "1/16", "1/24", "1/256"],
    statementReplace: {
      search:
        "A probabilidade de que todos os candidatos tenham recebido\nde volta os envelopes com os seus respectivos celulares é\nA 1\nB 1\nC 1\nD 1\nE 1\n256",
      replace:
        "A probabilidade de que todos os candidatos tenham recebido\nde volta os envelopes com os seus respectivos celulares é",
    },
  },

  // Q157 – clinical study group selection
  { id: 1017, num: 157, choices: ["1", "2", "3", "4", "5"] },

  // Q158 – pace / running timing
  { id: 1018, num: 158, choices: ["1", "2", "8", "9", "15"] },

  // Q172 – GNV vs gasoline cost difference
  { id: 1032, num: 172, choices: ["4", "8", "14", "21", "30"] },

  // Q173 – driving school cost
  {
    id: 1033,
    num: 173,
    choices: [
      "I, com o custo total de R$ 1 400,00.",
      "II, com o custo total de R$ 280,00.",
      "II, com o custo total de R$ 1 300,00.",
      "III, com o custo total de R$ 460,00.",
      "III, com o custo total de R$ 1 200,00.",
    ],
  },

  // Q175 – box edge size
  { id: 1035, num: 175, choices: ["4", "12", "16", "18", "20"] },

  // Q179 – gift distribution
  { id: 1038, num: 179, choices: ["36", "53", "300", "360", "560"] },
];

async function main() {
  const allRows = await getAllQuestions();
  let updated = 0;
  let errors = 0;

  for (const fix of fixes) {
    const row = allRows.find((r) => r.id === fix.id);
    if (!row) {
      console.error(`❌ Q${fix.num} (id ${fix.id}): NOT FOUND in DB`);
      errors++;
      continue;
    }

    const updateData: Record<string, unknown> = {
      choices: fix.choices.map((text) => ({ text })),
      updatedAt: new Date(),
    };

    // Handle statement cleanup if needed
    if (fix.statementReplace) {
      const stmt = String(row.statement || "");
      if (stmt.includes(fix.statementReplace.search)) {
        updateData.statement = stmt.replace(
          fix.statementReplace.search,
          fix.statementReplace.replace
        );
        console.log(`  📝 Q${fix.num}: Statement cleaned`);
      } else {
        console.warn(
          `  ⚠️ Q${fix.num}: Statement replace target not found, skipping statement fix`
        );
      }
    }

    await updateQuestion(fix.id, updateData);
    console.log(
      `✅ Q${fix.num} (id ${fix.id}): choices updated → [${fix.choices.join(", ")}]`
    );
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${errors} errors out of ${fixes.length} fixes`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
