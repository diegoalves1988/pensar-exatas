import type { Express, Request, Response } from "express";
import type { Sql } from "postgres";
import { z } from "zod";
import { disciplines, imageTypes, infographicTypes, maxInfographicBytes, infographicTopics } from "../shared/infographics.js";

const base64 = z.string().min(4).max(maxInfographicBytes * 4 / 3)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/);
const publication = z.object({
  title: z.string().trim().min(1).max(160),
  topic: z.string().trim().min(1).max(100),
  discipline: z.enum(disciplines),
  file: z.object({ type: z.enum(infographicTypes), data: base64 }),
  cover: z.object({ type: z.enum(imageTypes), data: base64 }).optional(),
});

function matchesType(file: Buffer, type: string) {
  switch (type) {
    case "application/pdf": return file.subarray(0, 5).toString() === "%PDF-";
    case "image/png": return file.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
    case "image/jpeg": return file.subarray(0, 3).toString("hex") === "ffd8ff";
    case "image/webp": return file.subarray(0, 4).toString() === "RIFF" &&
      file.subarray(8, 12).toString() === "WEBP";
    default: return false;
  }
}

export function registerInfographicRoutes(
  app: Express,
  getSql: () => Sql | null,
  getUser: (req: Request, sql: Sql) => Promise<{ role: string } | null>,
) {
  let schemaReady: Promise<unknown> | undefined;

  function ensureSchema(sql: Sql) {
    schemaReady ??= sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(598122, 1)`;
      await tx`
        CREATE TABLE IF NOT EXISTS public.infographics (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title varchar(160) NOT NULL,
          topic varchar(100) NOT NULL,
          discipline text NOT NULL CHECK (discipline IN ('Física', 'Matemática')),
          file_type text NOT NULL CHECK (file_type IN ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
          file_data bytea NOT NULL,
          cover_type text,
          cover_data bytea,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await tx`ALTER TABLE public.infographics ENABLE ROW LEVEL SECURITY`;
    }).catch(error => {
      schemaReady = undefined;
      throw error;
    });
    return schemaReady;
  }

  function route(handler: (req: Request, res: Response, sql: Sql) => Promise<unknown>, admin = false) {
    return async (req: Request, res: Response) => {
      try {
        const sql = getSql();
        if (!sql) return res.status(503).json({ error: "Banco de dados indisponível." });
        if (admin) {
          const user = await getUser(req, sql);
          if (!user) return res.status(401).json({ error: "Entre na sua conta para publicar." });
          if (user.role !== "admin") return res.status(403).json({ error: "Acesso restrito a administradores." });
        }
        await ensureSchema(sql);
        return await handler(req, res, sql);
      } catch (error) {
        console.error("[Infographics]", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ error: "Não foi possível concluir a operação." });
      }
    };
  }

  app.get("/api/infographics", route(async (_req, res, sql) => {
    const items = await sql`
      SELECT id, title, topic, discipline, file_type AS "fileType",
        cover_type IS NOT NULL AS "hasCover"
      FROM public.infographics ORDER BY created_at DESC, id DESC
    `;
    res.json({ items });
  }));

  app.get("/api/infographics/:id/:asset", route(async (req, res, sql) => {
    const id = z.uuid().safeParse(req.params.id);
    const asset = z.enum(["file", "cover"]).safeParse(req.params.asset);
    if (!id.success || !asset.success) return res.sendStatus(404);

    const [item] = asset.data === "cover"
      ? await sql`SELECT cover_type AS type, cover_data AS data FROM public.infographics WHERE id = ${id.data}`
      : await sql`SELECT file_type AS type, file_data AS data FROM public.infographics WHERE id = ${id.data}`;
    if (!item?.data) return res.sendStatus(404);
    res.set({
      "Content-Type": item.type,
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    }).send(item.data);
  }));

  app.post("/api/admin/infographics", route(async (req, res, sql) => {
    if (!req.is("application/json")) return res.sendStatus(415);
    const parsed = publication.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Confira o título, o tema e os arquivos enviados." });

    const { title, topic, discipline, file, cover } = parsed.data;
    if (!infographicTopics[discipline].some(option => option === topic)) {
      return res.status(400).json({ error: `Selecione um dos tópicos de ${discipline}.` });
    }
    const content = Buffer.from(file.data, "base64");
    const thumbnail = cover ? Buffer.from(cover.data, "base64") : null;
    if (content.length + (thumbnail?.length ?? 0) > maxInfographicBytes) {
      return res.status(413).json({ error: "O arquivo e a capa juntos devem ter até 3 MB." });
    }
    if (!matchesType(content, file.type) || (thumbnail && cover && !matchesType(thumbnail, cover.type))) {
      return res.status(400).json({ error: "O conteúdo do arquivo não corresponde ao formato selecionado." });
    }
    const [item] = await sql`
      INSERT INTO public.infographics (title, topic, discipline, file_type, file_data, cover_type, cover_data)
      VALUES (${title}, ${topic}, ${discipline}, ${file.type}, ${content}, ${cover?.type ?? null}, ${thumbnail})
      RETURNING id
    `;
    res.status(201).json({ id: item.id });
  }, true));

  app.delete("/api/admin/infographics/:id", route(async (req, res, sql) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Infográfico inválido." });

    await sql`DELETE FROM public.infographics WHERE id = ${id.data}`;
    res.sendStatus(204);
  }, true));
}
