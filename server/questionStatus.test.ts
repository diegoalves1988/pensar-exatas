import { createServer } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
const state = vi.hoisted(() => ({ status: "active", inserts: [] as unknown[][] }));
vi.mock("postgres", () => ({
  default: () => {
    const sql = async (parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("?");
      if (query.includes("FROM users")) return [{ id: 1, openId: "test-student" }];
      if (query.includes('SELECT status, choices, "correctChoice"')) {
        return [{ status: state.status, choices: ["A", "B", "C"], correctChoice: 1 }];
      }
      if (query.includes("INSERT INTO user_question_resolutions")) state.inserts.push(values);
      if (query.includes("FROM user_progress")) return [{ id: 1 }];
      return [];
    };
    return Object.assign(sql, { end: async () => {} });
  },
}));
import app from "../api/index";
let server: ReturnType<typeof createServer>;
let base: string, cookie: string;
beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://test.invalid/test";
  process.env.JWT_SECRET = "test-only-secret-for-status-tests-123";
  cookie = "app_session_id=" + await new SignJWT({ openId: "test-student" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + (server.address() as {port:number}).port;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});
beforeEach(() => { state.status = "active"; state.inserts = []; });
async function answer(selectedChoice: number, answeredCorrect = true) {
  return fetch(base + "/api/questions/904/resolve", {
    method: "POST", headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ selectedChoice, answeredCorrect }),
  });
}
describe("question scoring", () => {
  it.each(["annulled", "archived"])("rejects %s without saving an attempt", async status => {
    state.status = status;
    expect((await answer(1)).status).toBe(409);
    expect(state.inserts).toHaveLength(0);
  });
  it.each([-1, 0.5, 3])("rejects invalid option %s", async choice => {
    expect((await answer(choice)).status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });
  it("computes correctness from the stored answer, ignoring the client flag", async () => {
    expect((await answer(0, true)).status).toBe(200);
    expect(state.inserts[0].slice(0,4)).toEqual([1,904,0,false]);
    expect((await answer(1, false)).status).toBe(200);
    expect(state.inserts[1].slice(0,4)).toEqual([1,904,1,true]);
  });
});
