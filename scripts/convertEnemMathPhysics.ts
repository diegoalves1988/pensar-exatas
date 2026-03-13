import fs from "fs";
import path from "path";

type EnemExamDetails = {
  year: number;
  questions: Array<{
    index: number;
    discipline: string | null;
    language: string | null;
  }>;
};

type EnemQuestionDetail = {
  title: string;
  index: number;
  year: number;
  language: string | null;
  discipline: string | null;
  context: string | null;
  files: string[];
  correctAlternative: "A" | "B" | "C" | "D" | "E";
  alternativesIntroduction: string | null;
  alternatives: Array<{
    letter: "A" | "B" | "C" | "D" | "E";
    text: string | null;
    file: string | null;
    isCorrect: boolean;
  }>;
};

type SeedQuestion = {
  subject: string;
  title: string;
  statement: string;
  solution: string;
  difficulty: "easy" | "medium" | "hard";
  year: number;
  sourceUrl: string;
  imageUrl?: string;
  choices: string[];
  correctChoice: number;
};

const LETTER_TO_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

const physicsKeywords = [
  "fisica",
  "forca",
  "forcas",
  "aceleracao",
  "velocidade",
  "movimento",
  "cinematica",
  "dinamica",
  "energia",
  "trabalho",
  "potencia",
  "impulso",
  "momento",
  "gravidade",
  "queda livre",
  "torque",
  "equilibrio",
  "pressao",
  "empuxo",
  "hidrostatica",
  "onda",
  "frequencia",
  "comprimento de onda",
  "som",
  "luz",
  "optica",
  "reflexao",
  "refracao",
  "espelho",
  "lente",
  "termodinamica",
  "temperatura",
  "calor",
  "corrente eletrica",
  "tensao",
  "resistor",
  "circuito",
  "eletrico",
  "magnetico",
  "inducao",
  "carga eletrica",
  "ohm",
  "newton",
  "joule",
  "watt",
  "pascal",
  "hertz",
  "m/s",
  "m/s2",
  "kg",
  "n",
  "j",
  "v",
  "a",
  "w",
  "pa",
  "hz",
];

const nonPhysicsKeywords = [
  "dna",
  "rna",
  "gene",
  "genetica",
  "enzima",
  "proteina",
  "celula",
  "mitose",
  "meiose",
  "ecossistema",
  "biodiversidade",
  "bioma",
  "fotossintese",
  "respiracao celular",
  "selecao natural",
  "evolucao",
  "bacteria",
  "virus",
  "fungo",
  "vacina",
  "antibiotico",
  "ph",
  "molar",
  "mol",
  "reacao quimica",
  "equilibrio quimico",
  "ligacao ionica",
  "ligacao covalente",
  "hidrocarboneto",
  "isomeria",
  "cadeia carbonica",
  "solucao quimica",
  "acido",
  "base",
  "quimica",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isLikelyPhysicsQuestion(question: EnemQuestionDetail): boolean {
  const corpus = [
    question.title,
    question.context ?? "",
    question.alternativesIntroduction ?? "",
    ...question.alternatives.map((alt) => alt.text ?? ""),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const text = normalizeText(corpus);

  if (nonPhysicsKeywords.some((term) => text.includes(term))) {
    return false;
  }

  return physicsKeywords.some((term) => text.includes(term));
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function questionPathByEntry(publicDir: string, year: number, index: number, language: string | null): string {
  const candidate = language ? `${index}-${language}` : `${index}`;
  return path.join(publicDir, String(year), "questions", candidate, "details.json");
}

function buildStatement(question: EnemQuestionDetail): string {
  const parts: string[] = [];
  if (question.context && question.context.trim()) {
    parts.push(question.context.trim());
  }
  if (question.alternativesIntroduction && question.alternativesIntroduction.trim()) {
    parts.push(question.alternativesIntroduction.trim());
  }
  return parts.join("\n\n").trim() || question.title;
}

function buildChoices(question: EnemQuestionDetail): string[] {
  const sorted = [...question.alternatives].sort(
    (a, b) => LETTER_TO_INDEX[a.letter] - LETTER_TO_INDEX[b.letter],
  );

  return sorted.map((alt) => {
    if (alt.text && alt.text.trim()) {
      return alt.text.trim();
    }
    if (alt.file) {
      return `[Alternativa com imagem] ${alt.file}`;
    }
    return "[Alternativa sem texto]";
  });
}

function getCorrectChoice(question: EnemQuestionDetail): number {
  const byFlag = question.alternatives.find((alt) => alt.isCorrect);
  if (byFlag) return LETTER_TO_INDEX[byFlag.letter];
  return LETTER_TO_INDEX[question.correctAlternative] ?? 0;
}

function toSeedQuestion(question: EnemQuestionDetail, subject: string): SeedQuestion {
  const languageSuffix = question.language ? ` (${question.language})` : "";
  const slug = question.language ? `${question.index}-${question.language}` : `${question.index}`;

  return {
    subject,
    title: `${question.title}${languageSuffix}`,
    statement: buildStatement(question),
    solution: `Gabarito oficial ENEM: alternativa ${question.correctAlternative}.`,
    difficulty: "medium",
    year: question.year,
    sourceUrl: `https://enem.dev/questoes/${question.year}/${slug}`,
    imageUrl: question.files?.[0] || undefined,
    choices: buildChoices(question),
    correctChoice: getCorrectChoice(question),
  };
}

function main() {
  const publicDir = process.env.ENEM_PUBLIC_DIR
    ? path.resolve(process.env.ENEM_PUBLIC_DIR)
    : path.resolve(process.cwd(), "enem-api-main", "enem-api-main", "public");

  const outputPath = process.env.OUT_PATH
    ? path.resolve(process.env.OUT_PATH)
    : path.resolve(process.cwd(), "data", "questions.enem.math-fisica.json");

  if (!fs.existsSync(publicDir)) {
    throw new Error(`Diretorio de dados ENEM nao encontrado: ${publicDir}`);
  }

  const yearDirs = fs
    .readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => Number(entry.name))
    .sort((a, b) => a - b);

  const out: SeedQuestion[] = [];
  let mathCount = 0;
  let physicsCount = 0;

  for (const year of yearDirs) {
    const examDetailsPath = path.join(publicDir, String(year), "details.json");
    if (!fs.existsSync(examDetailsPath)) continue;

    const exam = loadJson<EnemExamDetails>(examDetailsPath);
    const seen = new Set<string>();

    for (const entry of exam.questions) {
      if (!entry || !entry.discipline) continue;
      if (entry.discipline !== "matematica" && entry.discipline !== "ciencias-natureza") continue;

      const dedupeKey = `${year}:${entry.index}:${entry.language ?? "none"}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const questionFile = questionPathByEntry(publicDir, year, entry.index, entry.language ?? null);
      if (!fs.existsSync(questionFile)) continue;

      const question = loadJson<EnemQuestionDetail>(questionFile);

      if (question.discipline === "matematica") {
        out.push(toSeedQuestion(question, "Matematica"));
        mathCount += 1;
        continue;
      }

      if (question.discipline === "ciencias-natureza" && isLikelyPhysicsQuestion(question)) {
        out.push(toSeedQuestion(question, "Fisica"));
        physicsCount += 1;
      }
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), "utf-8");

  console.log(`[convert] arquivo gerado: ${outputPath}`);
  console.log(`[convert] total: ${out.length}`);
  console.log(`[convert] matematica: ${mathCount}`);
  console.log(`[convert] fisica (heuristica): ${physicsCount}`);
}

main();
