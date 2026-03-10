import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

export const config = { runtime: "nodejs18.x" } as const;

const handler = createHTTPHandler({
  router: appRouter,
  createContext,
  // Use basePath so procedure paths like `auth.me` are resolved instead of
  // including the `/api/trpc` prefix in the lookup.
  basePath: "/api/trpc/",
});

export default async function trpcHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  await handler(req, res);
}
