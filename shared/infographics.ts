export const disciplines = ["Física", "Matemática"] as const;
export type InfographicDiscipline = (typeof disciplines)[number];

export const infographicTopics = {
  Física: [
    "Mecânica",
    "Termodinâmica",
    "Fluidos",
    "Ondas",
    "Eletricidade",
    "Magnetismo",
    "Eletromagnetismo",
    "Física moderna",
  ],
  Matemática: [
    "Números",
    "Álgebra",
    "Geometria",
    "Grandezas e medidas",
    "Probabilidade e estatística",
  ],
} as const satisfies Record<InfographicDiscipline, readonly string[]>;

export type InfographicTopic = (typeof infographicTopics)[InfographicDiscipline][number];

export function normalizeInfographicTopic(topic: string) {
  return topic.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const imageTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export const infographicTypes = [...imageTypes, "application/pdf"] as const;
export const maxInfographicBytes = 3 * 1024 * 1024;

export type InfographicItem = {
  id: string;
  title: string;
  topic: string;
  discipline: InfographicDiscipline;
  fileType: (typeof infographicTypes)[number];
  hasCover: boolean;
};
