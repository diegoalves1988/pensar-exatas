import "dotenv/config";
import { getAllQuestions } from "../server/db";

const NEED_IMAGE_REGEX =
  /(figura|gr[aá]fico|imagem|tabela|mapa|esquema|ilustra|charge|cartum|tirinha|fotografia)/i;

async function main() {
  const all = await getAllQuestions();
  const rows = all.filter((q) => q.year === 2025);

  const noImage = rows.filter((q) => !q.imageUrl);
  const noImageLikelyNeed = noImage.filter((q) => NEED_IMAGE_REGEX.test(String(q.statement || "")));

  const titleNoNumber = rows.filter((q) => !/Quest[aã]o\s+\d+/i.test(String(q.title || "")));

  console.log(
    JSON.stringify(
      {
        total2025: rows.length,
        withImageCount: rows.length - noImage.length,
        noImageCount: noImage.length,
        noImageLikelyNeedCount: noImageLikelyNeed.length,
        noImageLikelyNeedSample: noImageLikelyNeed.slice(0, 20).map((q) => ({
          id: q.id,
          title: q.title,
        })),
        titleNoNumberCount: titleNoNumber.length,
        titleNoNumberSample: titleNoNumber.slice(0, 20).map((q) => ({
          id: q.id,
          title: q.title,
        })),
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
