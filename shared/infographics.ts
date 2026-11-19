export const disciplines = ["Física", "Matemática"] as const;
export const imageTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export const infographicTypes = [...imageTypes, "application/pdf"] as const;
export const maxInfographicBytes = 3 * 1024 * 1024;

export type InfographicItem = {
  id: string;
  title: string;
  topic: string;
  discipline: (typeof disciplines)[number];
  fileType: (typeof infographicTypes)[number];
  hasCover: boolean;
};
