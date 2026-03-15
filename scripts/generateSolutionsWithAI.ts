/**
 * generateSolutionsWithAI.ts
 *
 * Generates real educational solutions for ENEM questions (2009–2017)
 * using an OpenAI-compatible chat API (GitHub Copilot, Built-in Forge, or OpenAI).
 *
 * Usage:
 *   GITHUB_TOKEN=<token> tsx scripts/generateSolutionsWithAI.ts
 *   BUILT_IN_FORGE_API_URL=<url> BUILT_IN_FORGE_API_KEY=<key> tsx scripts/generateSolutionsWithAI.ts
 *   OPENAI_API_KEY=<key> tsx scripts/generateSolutionsWithAI.ts
 *
 * Optional env vars:
 *   START_YEAR  – first year to process (default: 2009)
 *   END_YEAR    – last year to process (default: 2017)
 *   MAX_YEAR    – alias for END_YEAR
 *   CONCURRENCY – number of parallel API calls (default: 3)
 *   MODEL       – model to use (default: gpt-4o)
 *   PROGRESS_FILE – path to checkpoint file (default: /tmp/solutions-progress.json)
 *   OUT_PATH    – output path for solutions-patch.json
 *                 (default: data/solutions-patch.json)
 *   UPDATE_QUESTIONS_JSON – if "true", also updates data/questions.json in-place
 *   DB_ID_OFFSET – integer offset to map questions.json index to DB id (default: 25)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawQuestion {
  subject: string;
  title: string;
  statement: string;
  solution: string;
  difficulty?: string;
  year?: number;
  sourceUrl?: string;
  imageUrl?: string;
  choices?: string[];
  correctChoice?: number;
}

interface Question extends RawQuestion {
  _idx: number;
  _dbId: number;
}

interface SolutionPatchItem {
  id: number;
  solution: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const START_YEAR = Number(process.env.START_YEAR ?? 2009);
const END_YEAR = Number(process.env.END_YEAR ?? process.env.MAX_YEAR ?? 2017);
const CONCURRENCY = Math.min(Number(process.env.CONCURRENCY ?? 3), 10);
const MODEL = process.env.MODEL ?? "gpt-4o";
const DB_ID_OFFSET = Number(process.env.DB_ID_OFFSET ?? 25);
const PROGRESS_FILE = process.env.PROGRESS_FILE ?? "/tmp/solutions-progress.json";
const OUT_PATH = process.env.OUT_PATH
  ? path.resolve(process.env.OUT_PATH)
  : path.resolve(process.cwd(), "data", "solutions-patch.json");
const UPDATE_QUESTIONS_JSON = process.env.UPDATE_QUESTIONS_JSON === "true";
const QUESTIONS_JSON_PATH = path.resolve(process.cwd(), "data", "questions.json");

// Resolve API endpoint and key from available env vars
function resolveApiConfig(): { url: string; key: string } {
  if (process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY) {
    const base = process.env.BUILT_IN_FORGE_API_URL.replace(/\/$/, "");
    return {
      url: `${base}/v1/chat/completions`,
      key: process.env.BUILT_IN_FORGE_API_KEY,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
    };
  }
  if (process.env.GITHUB_TOKEN) {
    return {
      url: "https://api.githubcopilot.com/chat/completions",
      key: process.env.GITHUB_TOKEN,
    };
  }
  throw new Error(
    "No API key found. Set BUILT_IN_FORGE_API_KEY, OPENAI_API_KEY, or GITHUB_TOKEN.",
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D", "E"] as const;

function choiceLetter(idx: number): string {
  return LETTERS[idx] ?? "A";
}

/** Strip the placeholder "Gabarito oficial ENEM: alternativa X." from a solution string */
function stripGabaritoLine(text: string): string {
  return text
    .replace(/\n*\s*gabarito oficial enem:\s*alternativa\s*[A-E]\.?\s*$/i, "")
    .replace(/gabarito oficial enem:\s*alternativa\s*[A-E]\.?/gi, "")
    .trim();
}

/** Format choice text for the prompt, handling image-only choices */
function formatChoiceForPrompt(choice: string, idx: number): string {
  const letter = choiceLetter(idx);
  if (choice.startsWith("[Alternativa com imagem]")) {
    return `${letter}) [imagem]`;
  }
  // Remove inline markdown images from choice text for the plain-text part
  const text = choice.replace(/!\[.*?\]\(https?:\/\/[^\s)]+\)/g, "[imagem]").trim();
  return `${letter}) ${text}`;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/**
 * Describes image presence in a question statement for text-only prompts.
 * Replaces ![](...) markdown images with a contextual note so the AI
 * knows there is a figure without needing vision support.
 */
function describeImages(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_match, alt) =>
      alt ? `[Figura: ${alt}]` : "[Figura: ver enunciado original]",
    )
    .trim();
}

function buildMessages(q: Question): ChatMessage[] {
  const letter = choiceLetter(q.correctChoice ?? 0);
  const choices = q.choices ?? [];

  const choicesText = choices.map((c, i) => formatChoiceForPrompt(c, i)).join("\n");

  // Replace markdown images with textual descriptions (API is text-only)
  const statementText = describeImages(q.statement ?? "");

  // Note when the question relies on an image for context
  const hasImage =
    !!q.imageUrl ||
    (q.statement ?? "").includes("![") ||
    choices.some((c) => c.startsWith("[Alternativa com imagem]"));

  const imageNote = hasImage
    ? "\nNota: Esta questão contém uma ou mais imagens/figuras que são referenciadas no enunciado. " +
      "Explique a questão com base no contexto textual e no gabarito fornecido.\n"
    : "";

  const systemPrompt =
    "Você é um professor especialista em Física e Matemática do ENEM com experiência em preparar " +
    "estudantes para o exame nacional. Explique questões de forma didática, clara e acessível para " +
    "alunos do ensino médio. Escreva sempre em português do Brasil. Prefira texto corrido com parágrafos " +
    "em vez de markdown excessivo.";

  const userText =
    `Gere uma solução detalhada e educativa para a seguinte questão do ENEM.\n\n` +
    `**${q.title}** (${q.subject} — ENEM ${q.year})\n` +
    imageNote +
    `\n**Enunciado:**\n${statementText}\n\n` +
    `**Alternativas:**\n${choicesText}\n\n` +
    `**Gabarito:** Alternativa ${letter}\n\n` +
    `Escreva a solução com:\n` +
    `1. O conceito ou tema avaliado na questão\n` +
    `2. O raciocínio passo a passo para chegar à resposta\n` +
    `3. Por que a alternativa ${letter} está correta\n` +
    `4. Quando relevante, por que as outras alternativas estão incorretas\n\n` +
    `Requisitos: mínimo de 120 palavras, linguagem acessível, sem fórmulas LaTeX. ` +
    `NÃO escreva "Gabarito oficial ENEM: alternativa ${letter}." no final.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];
}

// ─── API call ─────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
// Rate limit on GitHub Copilot API resets in ~30-60s, so use longer waits
const RETRY_DELAYS_MS = [30_000, 60_000, 120_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi(
  messages: ChatMessage[],
  apiUrl: string,
  apiKey: string,
  isGithubCopilot: boolean,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (isGithubCopilot) {
    headers["Copilot-Integration-Id"] = "vscode-chat";
  }

  const body = JSON.stringify({
    model: MODEL,
    messages,
    max_tokens: 1024,
    temperature: 0.4,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(apiUrl, { method: "POST", headers, body });
    if (resp.ok) {
      const data = (await resp.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0].message.content.trim();
    }

    const err = await resp.text();
    const isRetryable =
      resp.status === 429 ||
      resp.status === 500 ||
      resp.status === 503 ||
      // Copilot sometimes mis-reports rate limits as model_not_supported
      err.includes("model_not_supported");

    if (!isRetryable || attempt === MAX_RETRIES) {
      throw new Error(`API ${resp.status}: ${err.slice(0, 200)}`);
    }

    const delay = RETRY_DELAYS_MS[attempt] ?? 120_000;
    process.stdout.write(
      `\n[generate-solutions] Rate limit, waiting ${delay / 1000}s (retry ${attempt + 1}/${MAX_RETRIES})...`,
    );
    await sleep(delay);
  }

  throw new Error("unreachable");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { url: apiUrl, key: apiKey } = resolveApiConfig();
  const isGithubCopilot = apiUrl.includes("githubcopilot.com");

  console.log(`[generate-solutions] API: ${apiUrl}`);
  console.log(`[generate-solutions] Model: ${MODEL}`);
  console.log(`[generate-solutions] Years: ${START_YEAR}–${END_YEAR}`);
  console.log(`[generate-solutions] Concurrency: ${CONCURRENCY}`);

  // Load questions
  const rawQuestions: RawQuestion[] = JSON.parse(
    fs.readFileSync(QUESTIONS_JSON_PATH, "utf8"),
  );

  const questions: Question[] = rawQuestions
    .map((q, i) => ({ ...q, _idx: i, _dbId: i + DB_ID_OFFSET }))
    .filter((q) => {
      const y = q.year ?? 0;
      return y >= START_YEAR && y <= END_YEAR;
    });

  console.log(`[generate-solutions] Found ${questions.length} questions to process`);

  // Load checkpoint
  let progress: SolutionPatchItem[] = [];
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
      console.log(`[generate-solutions] Resuming from checkpoint: ${progress.length} already done`);
    } catch {
      progress = [];
    }
  }
  const done = new Map<number, string>(progress.map((p) => [p.id, p.solution]));

  const toProcess = questions.filter((q) => !done.has(q._dbId));
  console.log(`[generate-solutions] Remaining: ${toProcess.length}`);

  let errors = 0;

  // Process in chunks for concurrency
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const chunk = toProcess.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (q) => {
        try {
          const messages = buildMessages(q);
          const solution = await callApi(messages, apiUrl, apiKey, isGithubCopilot);
          done.set(q._dbId, solution);
          process.stdout.write(
            `\r[generate-solutions] ${done.size}/${questions.length} done (${errors} errors)  `,
          );
        } catch (err) {
          errors++;
          console.error(`\n[generate-solutions] ERROR on ${q.title}:`, (err as Error).message);
        }
      }),
    );

    // Save checkpoint after each chunk
    const checkpoint: SolutionPatchItem[] = Array.from(done.entries()).map(
      ([id, solution]) => ({ id, solution }),
    );
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(checkpoint, null, 2));

    // Small delay between chunks to respect rate limits
    if (i + CONCURRENCY < toProcess.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  process.stdout.write("\n");

  // Build final solutions-patch.json sorted by id
  const finalPatch: SolutionPatchItem[] = Array.from(done.entries())
    .map(([id, solution]) => ({ id, solution }))
    .sort((a, b) => a.id - b.id);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(finalPatch, null, 2));
  console.log(`[generate-solutions] Wrote ${finalPatch.length} solutions to ${OUT_PATH}`);
  console.log(`[generate-solutions] Errors: ${errors}`);

  // Optionally update questions.json directly
  if (UPDATE_QUESTIONS_JSON) {
    const patchMap = new Map(finalPatch.map((p) => [p.id, p.solution]));
    let updated = 0;
    for (const q of rawQuestions) {
      const idx = rawQuestions.indexOf(q);
      const dbId = idx + DB_ID_OFFSET;
      const newSolution = patchMap.get(dbId);
      if (newSolution) {
        const body = stripGabaritoLine(newSolution);
        const letter = choiceLetter(typeof q.correctChoice === "number" ? q.correctChoice : 0);
        q.solution = `${body}\n\nGabarito oficial ENEM: alternativa ${letter}.`;
        updated++;
      }
    }
    fs.writeFileSync(QUESTIONS_JSON_PATH, JSON.stringify(rawQuestions, null, 2));
    console.log(`[generate-solutions] Updated ${updated} questions in questions.json`);
  }

  if (errors > 0) {
    console.warn(`[generate-solutions] ${errors} questions failed — rerun to retry them`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[generate-solutions] fatal:", err);
  process.exit(1);
});
