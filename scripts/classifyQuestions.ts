/**
 * classifyQuestions.ts
 *
 * Adds an `area` column to the subjects table, ensures all detailed subjects
 * exist (Mecânica, Eletromagnetismo, Geometria, etc.), and classifies every
 * question that is still bucketed under the generic "Fisica" or "Matematica"
 * subject into a fine-grained subject using keyword heuristics.
 *
 * Usage:
 *   pnpm tsx scripts/classifyQuestions.ts            # dry run (no DB changes)
 *   pnpm tsx scripts/classifyQuestions.ts --apply    # apply changes
 */

import "dotenv/config";
import postgres from "postgres";

// ─── Subject catalog ──────────────────────────────────────────────────────────

const ALL_SUBJECTS = [
  { name: "Mecânica",         area: "physics", icon: "⚙️",  color: "#2563eb", order: 1   },
  { name: "Cinemática",       area: "physics", icon: "🏃",  color: "#1d4ed8", order: 2   },
  { name: "Dinâmica",         area: "physics", icon: "🧲",  color: "#1e40af", order: 3   },
  { name: "Eletromagnetismo", area: "physics", icon: "⚡",  color: "#16a34a", order: 4   },
  { name: "Ondulatória",      area: "physics", icon: "〰️", color: "#0ea5e9", order: 5   },
  { name: "Termodinâmica",    area: "physics", icon: "🔥",  color: "#dc2626", order: 6   },
  { name: "Óptica",           area: "physics", icon: "💡",  color: "#65a30d", order: 7   },
  { name: "Hidrostática",     area: "physics", icon: "🌊",  color: "#0284c7", order: 8   },
  { name: "Aritmética",       area: "math",    icon: "➗",  color: "#0f766e", order: 101 },
  { name: "Álgebra",          area: "math",    icon: "🧮",  color: "#0d9488", order: 102 },
  { name: "Funções",          area: "math",    icon: "📈",  color: "#0f766e", order: 103 },
  { name: "Geometria",        area: "math",    icon: "📐",  color: "#0e7490", order: 104 },
  { name: "Trigonometria",    area: "math",    icon: "📏",  color: "#0f766e", order: 105 },
  { name: "Probabilidade",    area: "math",    icon: "🎲",  color: "#0e7490", order: 106 },
  { name: "Estatística",      area: "math",    icon: "📊",  color: "#0891b2", order: 107 },
] as const;

// ─── Classification rules (most-specific first within each area) ──────────────

type Rule = { topic: string; terms: string[] };

const PHYSICS_RULES: Rule[] = [
  {
    topic: "Hidrostática",
    terms: [
      "empuxo", "fluido", "hidrostatic", "vaso comunicante", "torricelli",
      "manometro", "pressao hidrostatica", "coluna de liquido", "lei de stevin",
      "densidade do liquido", "volume submerso",
    ],
  },
  {
    topic: "Óptica",
    terms: [
      "reflexao", "refracao", "espelho", "lente ", "optic", "foco ", "imagem virtual",
      "imagem real", "incidencia", "indice de refracao", "prisma", "espectro",
      "luz visivel", "cor da luz", "convergente", "divergente", "diopter",
      "difusao da luz",
    ],
  },
  {
    topic: "Termodinâmica",
    terms: [
      "termodinamic", "carnot", "entropia", "gas ideal", "isot", "adiabatico",
      "lei dos gases", "calor especifico", "calor latente", "vaporizacao",
      "dilatacao termica", "celsius", "kelvin", "termometro", "temperatura de equilibrio",
      "proceso isocoric", "processo isobaric", "primeiro principio", "segundo principio",
    ],
  },
  {
    topic: "Ondulatória",
    terms: [
      "onda", "frequencia de", "comprimento de onda", "ressonancia", "interferencia de onda",
      "doppler", " som ", "decibel", "ultrassom", "infrassom", "harmonico",
      "velocidade de propagacao", "crista de onda", "no de onda", "ventre", "periodo de oscilac",
    ],
  },
  {
    topic: "Eletromagnetismo",
    terms: [
      "corrente eletric", "resistencia eletric", "tensao eletric", "circuito",
      "campo eletric", "campo magnetic", "capacitor", "resistor", "lei de ohm",
      "faraday", "carga eletric", "potencia eletric", "energia eletric",
      "transformador", "gerador eletric", "motor eletric", "eletrostatica",
      "condutor", "forca eletric", "forca magnetic", "lei de coulomb",
      "eletrizacao", "fem ", "ddp ", "resistividade",
    ],
  },
  {
    topic: "Cinemática",
    terms: [
      "velocidade media", "aceleracao media", "mruv", " mru ", "equacao horaria",
      "queda livre", "lancamento horizontal", "lancamento obliquo",
      "deslocamento escalar", "trajetoria", "velocidade escalar",
      "velocidade instantanea", "aceleracao escalar", "grafico de posicao",
      "grafico de velocidade",
    ],
  },
  {
    topic: "Dinâmica",
    terms: [
      "segunda lei de newton", "primeira lei de newton", "terceira lei de newton",
      "lei de newton", "forca resultante", "forca de atrito", "coeficiente de atrito",
      "tensao no fio", "forca normal", "plano inclinado", "polia",
    ],
  },
  {
    topic: "Mecânica",
    terms: [
      "energia cinetica", "energia potencial", "trabalho e energia", "potencia mecanica",
      "impulso", "quantidade de movimento", "colisao", "conservacao de energia",
      "gravitacao", "lei da gravitacao", "satelite", "pendulo", "mola",
      "energia elastica", "velocidade de escape", "forca peso",
    ],
  },
];

const MATH_RULES: Rule[] = [
  {
    topic: "Estatística",
    terms: [
      "media aritmetica", "media ponderada", "mediana", "moda de", "desvio padrao",
      "variancia", "histograma", "frequencia relativa", "quartil",
      "dados estatisticos", "tabela de dados", "grafico de barras", "grafico de setores",
      "interpretacao de grafico", "dispersao",
    ],
  },
  {
    topic: "Probabilidade",
    terms: [
      "probabilidade", "combinacao de", "arranjo de", "permutacao",
      "analise combinatoria", "principio multiplicativo", "espaco amostral",
      "evento aleatorio", "n!", "c(", "p(", "a(",
    ],
  },
  {
    topic: "Trigonometria",
    terms: [
      "seno", "cosseno", "tangente", "sen(", "cos(", "tg(",
      "lei dos senos", "lei dos cossenos", "radiano",
      "razao trigonometrica", "identidade trigonometrica", "ciclo trigonometrico",
      "angulo agudo", "angulo obtuso",
    ],
  },
  {
    topic: "Geometria",
    terms: [
      "triangulo", "quadrado", "retangulo", "trapezio", "losango", "circulo",
      "circunferencia", "poligono", "area de", "perimetro", "volume de",
      "cubo", "esfera", "cone", "cilindro", "piramide", "semelhanca",
      "congruencia", "solido geometrico", "pitagoras", "diagonal",
      "angulo interno", "reta paralela", "mediana do triangulo",
    ],
  },
  {
    topic: "Funções",
    terms: [
      "funcao afim", "funcao quadratica", "funcao exponencial", "funcao logaritmica",
      "dominio de", "f(x)", "grafico da funcao", "raiz da funcao",
      "coeficiente angular", "coeficiente linear", "taxa de variacao",
      "crescimento exponencial", "crescimento linear", "lei de formacao",
      "zeros da funcao", "minimo da funcao", "maximo da funcao",
    ],
  },
  {
    topic: "Álgebra",
    terms: [
      "equacao de 1", "equacao de 2", "sistema de equacoes", "inequacao",
      "polinomio", "fatorizacao", "produto notavel", "bhaskara", "discriminante",
      "raizes da equacao", "expressao algebrica", "valor de x", "x^2", "x2 +",
      "solucao de equacao",
    ],
  },
  {
    topic: "Aritmética",
    terms: [
      "porcentagem", "fracao", "razao de", "proporcao", "regra de tres",
      "juros simples", "juros compostos", "mmc", "mdc", "numero primo",
      "progressao aritmetica", "progressao geometrica", " p.a.", " p.g.",
      "desconto de", "taxa de juros", "capital inicial", "montante",
    ],
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function classify(corpus: string, rules: Rule[], fallback: string): string {
  const normalized = normalize(corpus);
  let best = { topic: fallback, score: 0 };
  for (const rule of rules) {
    const score = rule.terms.reduce(
      (acc, term) => acc + (normalized.includes(normalize(term)) ? 1 : 0),
      0,
    );
    if (score > best.score) best = { topic: rule.topic, score };
  }
  return best.topic;
}

function printTable(counts: Record<string, number>): void {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [topic, count] of entries) {
    console.log(`    ${topic.padEnd(22)} ${count}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = !process.argv.includes("--apply");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Create .env with DATABASE_URL.");
    process.exit(1);
  }

  const raw = process.env.DATABASE_URL;
  const connStr = raw.includes("sslmode=")
    ? raw
    : raw.includes("?")
      ? `${raw}&sslmode=require`
      : `${raw}?sslmode=require`;

  const sql = postgres(connStr, { max: 3 });

  try {
    console.log(dryRun ? "\n🔍  DRY RUN (use --apply to commit changes)\n" : "\n🚀  APPLYING changes\n");

    // ── 1. DDL: add area column ───────────────────────────────────────────────
    console.log("[1/5] Adding area column to subjects...");
    if (!dryRun) {
      await sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS area varchar(20)`;
    }
    console.log("  ok\n");

    // ── 2. Ensure all 15 detailed subjects exist ──────────────────────────────
    console.log("[2/5] Ensuring detailed subjects exist...");
    const existingRows = await sql`SELECT id, name FROM subjects`;
    const existingNames = new Set(existingRows.map((r: any) => r.name as string));

    for (const s of ALL_SUBJECTS) {
      if (existingNames.has(s.name)) {
        if (!dryRun) {
          await sql`
            UPDATE subjects
            SET area = ${s.area}, icon = ${s.icon}, color = ${s.color}, "order" = ${s.order}
            WHERE name = ${s.name}
          `;
        }
        console.log(`  [update] ${s.name}  area=${s.area}`);
      } else {
        if (!dryRun) {
          await sql`
            INSERT INTO subjects (name, area, icon, color, "order")
            VALUES (${s.name}, ${s.area}, ${s.icon}, ${s.color}, ${s.order})
            ON CONFLICT (name) DO NOTHING
          `;
        }
        console.log(`  [create] ${s.name}  area=${s.area}`);
      }
    }

    // ── 3. Tag the generic buckets ────────────────────────────────────────────
    console.log("\n[3/5] Tagging generic Fisica/Matematica buckets...");
    if (!dryRun) {
      await sql`UPDATE subjects SET area = 'physics' WHERE name = 'Fisica'`;
      await sql`UPDATE subjects SET area = 'math'    WHERE name = 'Matematica'`;
    }
    console.log("  ok\n");

    // ── 4. Reload subjects ────────────────────────────────────────────────────
    const [areaColumn] = await sql`
      SELECT 1 as ok
      FROM information_schema.columns
      WHERE table_name = 'subjects'
        AND column_name = 'area'
      LIMIT 1
    `;
    const hasAreaColumn = Boolean(areaColumn?.ok);

    const freshRows = hasAreaColumn
      ? await sql`SELECT id, name, area FROM subjects`
      : await sql`SELECT id, name, NULL::varchar as area FROM subjects`;

    const subjectByName = new Map<string, { id: number; area: string | null }>();
    for (const r of freshRows) subjectByName.set(r.name, { id: r.id, area: r.area });

    const fisicaId  = freshRows.find((r: any) => r.name === "Fisica")?.id as number | undefined;
    const matId     = freshRows.find((r: any) => r.name === "Matematica")?.id as number | undefined;

    if (!fisicaId || !matId) {
      console.error("Cannot find generic Fisica/Matematica subjects in DB. Run import:questions first.");
      process.exit(1);
    }

    // ── 5. Load and classify questions ───────────────────────────────────────
    console.log("[4/5] Loading questions from generic buckets...");
    const fisicaQs = await sql`SELECT id, title, statement FROM questions WHERE "subjectId" = ${fisicaId}`;
    const matQs    = await sql`SELECT id, title, statement FROM questions WHERE "subjectId" = ${matId}`;
    console.log(`  Física:     ${fisicaQs.length} questões`);
    console.log(`  Matemática: ${matQs.length} questões\n`);

    console.log("[5/5] Classifying...");

    // Group IDs by classified topic
    const physicsGroups: Record<string, number[]> = {};
    const mathGroups: Record<string, number[]> = {};

    for (const q of fisicaQs) {
      const topic = classify(`${q.title} ${q.statement}`, PHYSICS_RULES, "Mecânica");
      (physicsGroups[topic] ??= []).push(q.id);
    }
    for (const q of matQs) {
      const topic = classify(`${q.title} ${q.statement}`, MATH_RULES, "Aritmética");
      (mathGroups[topic] ??= []).push(q.id);
    }

    // Apply — grouped for efficiency (one UPDATE per topic per area)
    if (!dryRun) {
      for (const [topic, ids] of Object.entries(physicsGroups)) {
        const targetId = subjectByName.get(topic)?.id;
        if (targetId) await sql`UPDATE questions SET "subjectId" = ${targetId} WHERE id = ANY(${ids})`;
      }
      for (const [topic, ids] of Object.entries(mathGroups)) {
        const targetId = subjectByName.get(topic)?.id;
        if (targetId) await sql`UPDATE questions SET "subjectId" = ${targetId} WHERE id = ANY(${ids})`;
      }
    }

    // ── Report ────────────────────────────────────────────────────────────────
    const physicsCounts: Record<string, number> = {};
    const mathCounts: Record<string, number> = {};
    for (const [t, ids] of Object.entries(physicsGroups)) physicsCounts[t] = ids.length;
    for (const [t, ids] of Object.entries(mathGroups))   mathCounts[t]    = ids.length;

    const totalPhysics = Object.values(physicsCounts).reduce((a, b) => a + b, 0);
    const totalMath    = Object.values(mathCounts).reduce((a, b) => a + b, 0);
    const unclassifiedPhysics = physicsGroups["Mecânica"]?.length ?? 0;  // fallback = Mecânica
    const unclassifiedMath    = mathGroups["Aritmética"]?.length ?? 0;   // fallback = Aritmética

    console.log("\n  Física — distribuição por assunto:");
    printTable(physicsCounts);
    console.log(`    TOTAL: ${totalPhysics}`);

    console.log("\n  Matemática — distribuição por assunto:");
    printTable(mathCounts);
    console.log(`    TOTAL: ${totalMath}`);

    console.log(`\n  ⚠  Física sem match específico → fallback Mecânica: ${unclassifiedPhysics}`);
    console.log(`  ⚠  Matemática sem match específico → fallback Aritmética: ${unclassifiedMath}`);

    if (dryRun) {
      console.log("\n⚠️  DRY RUN — nenhuma alteração feita.");
      console.log("   Para aplicar: pnpm tsx scripts/classifyQuestions.ts --apply\n");
    } else {
      console.log(`\n✅ Classificação aplicada! ${totalPhysics + totalMath} questões redistribuídas.\n`);
    }
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("[classify] failed:", err);
  process.exit(1);
});
