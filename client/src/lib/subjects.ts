export type SubjectItem = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  area?: string | null; // 'physics' | 'math'
  order?: number | null;
};

export const FALLBACK_SUBJECTS: SubjectItem[] = [
  { id: 1,   name: "Mecânica",         description: "Movimento, força e energia",     area: "physics", order: 1   },
  { id: 2,   name: "Eletromagnetismo", description: "Eletricidade e magnetismo",      area: "physics", order: 4   },
  { id: 3,   name: "Ondulatória",      description: "Ondas e fenômenos ondulatórios", area: "physics", order: 5   },
  { id: 4,   name: "Termodinâmica",    description: "Calor e temperatura",            area: "physics", order: 6   },
  { id: 5,   name: "Óptica",           description: "Luz e óptica",                  area: "physics", order: 7   },
  { id: 6,   name: "Cinemática",       description: "Descrição do movimento",         area: "physics", order: 2   },
  { id: 7,   name: "Dinâmica",         description: "Forças e leis de Newton",        area: "physics", order: 3   },
  { id: 8,   name: "Hidrostática",     description: "Fluidos em equilíbrio",          area: "physics", order: 8   },
  { id: 101, name: "Aritmética",       description: "Números e operações",            area: "math",    order: 101 },
  { id: 102, name: "Álgebra",          description: "Expressões e equações",          area: "math",    order: 102 },
  { id: 103, name: "Funções",          description: "Estudo de funções",              area: "math",    order: 103 },
  { id: 104, name: "Geometria",        description: "Plana e espacial",               area: "math",    order: 104 },
  { id: 105, name: "Trigonometria",    description: "Razões trigonométricas",         area: "math",    order: 105 },
  { id: 106, name: "Probabilidade",    description: "Contagem e chance",              area: "math",    order: 106 },
  { id: 107, name: "Estatística",      description: "Leitura de dados",               area: "math",    order: 107 },
];

/** Accepts a SubjectItem (uses DB area when available) or a plain name string (falls back to heuristic). */
export function getSubjectArea(subject: SubjectItem | string): "Física" | "Matemática" {
  if (typeof subject === "object") {
    if (subject.area === "physics") return "Física";
    if (subject.area === "math") return "Matemática";
    return getSubjectArea(subject.name);
  }
  const normalized = subject.toLowerCase();
  const physicsTerms = [
    "mec", "cinem", "din", "eletro", "onda", "termo", "opt", "ópt", "hidro", "física", "fisica",
  ];
  return physicsTerms.some((term) => normalized.includes(term)) ? "Física" : "Matemática";
}

export function sortSubjects(subjects: SubjectItem[]) {
  return subjects
    .slice()
    .sort((a, b) => Number(a.order ?? 9999) - Number(b.order ?? 9999) || a.id - b.id);
}