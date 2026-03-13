export type SubjectItem = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  order?: number | null;
};

export const FALLBACK_SUBJECTS: SubjectItem[] = [
  { id: 1, name: "Mecânica", description: "Movimento, força e energia", order: 1 },
  { id: 2, name: "Eletromagnetismo", description: "Eletricidade e magnetismo", order: 2 },
  { id: 3, name: "Ondulatória", description: "Ondas e fenômenos ondulatórios", order: 3 },
  { id: 4, name: "Termodinâmica", description: "Calor e temperatura", order: 4 },
  { id: 5, name: "Óptica", description: "Luz e óptica", order: 5 },
  { id: 6, name: "Cinemática", description: "Descrição do movimento", order: 6 },
  { id: 7, name: "Dinâmica", description: "Forças e leis de Newton", order: 7 },
  { id: 8, name: "Hidrostática", description: "Fluidos em equilíbrio", order: 8 },
  { id: 101, name: "Aritmética", description: "Números e operações", order: 101 },
  { id: 102, name: "Álgebra", description: "Expressões e equações", order: 102 },
  { id: 103, name: "Funções", description: "Estudo de funções", order: 103 },
  { id: 104, name: "Geometria", description: "Plana e espacial", order: 104 },
  { id: 105, name: "Trigonometria", description: "Razões trigonométricas", order: 105 },
  { id: 106, name: "Probabilidade", description: "Contagem e chance", order: 106 },
  { id: 107, name: "Estatística", description: "Leitura de dados", order: 107 },
];

export function getSubjectArea(name: string): "Física" | "Matemática" {
  const normalized = name.toLowerCase();
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