import "dotenv/config";
import { getAllSubjects, createSubject, createQuestion } from "../server/db";

type SeedSubject = {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
};

type SeedQuestion = {
  subject: string; // subject name to map to id
  title: string;
  statement: string;
  solution: string;
  difficulty?: "easy" | "medium" | "hard";
  year?: number;
  sourceUrl?: string;
  imageUrl?: string;
  choices?: string[];
  correctChoice?: number;
};

async function ensureSubjects(subjectsToSeed: SeedSubject[]) {
  for (const s of subjectsToSeed) {
    try {
      await createSubject({
        name: s.name,
        description: s.description ?? null,
        icon: s.icon ?? null,
        color: s.color ?? null,
        order: s.order ?? 0,
      });
      console.log(`[seed] subject inserted: ${s.name}`);
    } catch (err: any) {
      // ignore unique violations
      const code = err?.code || err?.cause?.code;
      if (code === "23505") {
        console.log(`[seed] subject exists: ${s.name}`);
      } else {
        console.warn(`[seed] subject insert failed for ${s.name}:`, err);
      }
    }
  }
}

async function seedQuestions(questions: SeedQuestion[]) {
  const subjects = await getAllSubjects();
  const byName = new Map(subjects.map(s => [s.name, s] as const));

  let ok = 0;
  for (const q of questions) {
    const subj = byName.get(q.subject);
    if (!subj) {
      console.warn(`[seed] subject not found for question, skipping: ${q.subject} -> ${q.title}`);
      continue;
    }

    try {
      await createQuestion({
        subjectId: subj.id,
        title: q.title,
        statement: q.statement,
        solution: q.solution,
        difficulty: q.difficulty ?? "medium",
        year: q.year ?? null,
        sourceUrl: q.sourceUrl ?? null,
        imageUrl: q.imageUrl ?? null,
        choices: q.choices ?? undefined,
        correctChoice: typeof q.correctChoice === 'number' ? q.correctChoice : undefined,
      });
      ok++;
    } catch (err) {
      console.warn(`[seed] question insert failed: ${q.title}`, err);
    }
  }

  console.log(`[seed] questions inserted: ${ok}/${questions.length}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Create a .env with DATABASE_URL and JWT_SECRET.");
    process.exit(1);
  }

  const subjects: SeedSubject[] = [
    { name: "Mecânica", description: "Cinemática, Dinâmica, Trabalho e Energia", icon: "⚙️", color: "#2563eb", order: 1 },
    { name: "Cinemática", description: "Descrição do movimento e suas grandezas", icon: "🏃", color: "#1d4ed8", order: 2 },
    { name: "Dinâmica", description: "Leis de Newton e aplicações", icon: "🧲", color: "#1e40af", order: 3 },
    { name: "Eletromagnetismo", description: "Eletrostática, Eletrodinâmica e Magnetismo", icon: "⚡", color: "#16a34a", order: 4 },
    { name: "Ondulatória", description: "Ondas mecânicas, sonoras e eletromagnéticas", icon: "〰️", color: "#0ea5e9", order: 5 },
    { name: "Termodinâmica", description: "Calor, temperatura e termologia", icon: "🔥", color: "#dc2626", order: 6 },
    { name: "Óptica", description: "Reflexão, refração e instrumentos ópticos", icon: "💡", color: "#65a30d", order: 7 },
    { name: "Hidrostática", description: "Fluidos em equilíbrio e empuxo", icon: "🌊", color: "#0284c7", order: 8 },
    { name: "Aritmética", description: "Números, razões e proporções", icon: "➗", color: "#0f766e", order: 101 },
    { name: "Álgebra", description: "Equações, polinômios e sistemas", icon: "🧮", color: "#0d9488", order: 102 },
    { name: "Funções", description: "Função afim, quadrática, exponencial e log", icon: "📈", color: "#0f766e", order: 103 },
    { name: "Geometria", description: "Geometria plana e espacial", icon: "📐", color: "#0e7490", order: 104 },
    { name: "Trigonometria", description: "Razões trigonométricas e ciclos", icon: "📏", color: "#0f766e", order: 105 },
    { name: "Probabilidade", description: "Análise combinatória e probabilidade", icon: "🎲", color: "#0e7490", order: 106 },
    { name: "Estatística", description: "Medidas estatísticas e gráficos", icon: "📊", color: "#0891b2", order: 107 },
  ];

  await ensureSubjects(subjects);

  const questions: SeedQuestion[] = [
    {
      subject: "Mecânica",
      title: "Queda livre e aceleração da gravidade",
      statement:
        "Um corpo em queda livre a partir do repouso percorre 20 m em certo intervalo de tempo. Desprezando a resistência do ar, qual é o valor aproximado desse intervalo? Considere g = 10 m/s².",
      solution:
        "Em queda livre com v0 = 0: s = (1/2) g t². Logo, 20 = 5 t² => t² = 4 => t = 2 s.",
      difficulty: "easy",
      year: 2022,
      sourceUrl: "https://exemplo.com/enem/queda-livre",
    },
    {
      subject: "Eletromagnetismo",
      title: "Lei de Ohm em circuito simples",
      statement:
        "Um resistor de 10 Ω é ligado a uma fonte ideal de 20 V. Qual a corrente elétrica no circuito?",
      solution:
        "Pela Lei de Ohm: I = V/R = 20/10 = 2 A.",
      difficulty: "easy",
      year: 2021,
      sourceUrl: "https://exemplo.com/enem/lei-de-ohm",
    },
    {
      subject: "Ondulatória",
      title: "Frequência e comprimento de onda",
      statement:
        "Uma onda se propaga com velocidade 300 m/s e tem comprimento de onda 0,6 m. Qual é a frequência dessa onda?",
      solution:
        "v = f·λ => f = v/λ = 300 / 0,6 = 500 Hz.",
      difficulty: "medium",
      year: 2020,
      sourceUrl: "https://exemplo.com/enem/frequencia-onda",
    },
  ];

  await seedQuestions(questions);
}

main().then(() => {
  console.log("[seed] done");
  process.exit(0);
}).catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
