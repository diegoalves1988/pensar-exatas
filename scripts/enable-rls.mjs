/**
 * Enables Row Level Security (RLS) on all public tables and adds
 * appropriate policies so the Supabase Security Advisor is satisfied.
 * Run once: node scripts/enable-rls.mjs
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, ssl: { rejectUnauthorized: false } });

const statements = [
  // ── Enable RLS on all tables ──────────────────────────────────────────────
  `ALTER TABLE public.questions         ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.subjects          ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.lessons           ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.question_lessons  ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.portfolio_items   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.portfolio_profile ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.user_badges       ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.user_favorites    ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.user_progress     ENABLE ROW LEVEL SECURITY`,

  // ── Public read-only content (questions, subjects, lessons) ───────────────
  `CREATE POLICY "rls_questions_public_read"
     ON public.questions FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "rls_subjects_public_read"
     ON public.subjects FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "rls_lessons_public_read"
     ON public.lessons FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "rls_question_lessons_public_read"
     ON public.question_lessons FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "rls_portfolio_items_public_read"
     ON public.portfolio_items FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "rls_portfolio_profile_public_read"
     ON public.portfolio_profile FOR SELECT TO anon, authenticated USING (true)`,

  // ── User data: block PostgREST access entirely (app uses direct SQL only) ─
  // No SELECT policy on users, user_badges, user_favorites, user_progress
  // means PostgREST anon/authenticated roles cannot access them.
  // The app's direct postgres connection (service_role / superuser) bypasses RLS.
];

let ok = 0;
let failed = 0;
for (const stmt of statements) {
  const label = stmt.trim().split("\n")[0].slice(0, 80);
  try {
    await sql.unsafe(stmt);
    console.log(`✓ ${label}`);
    ok++;
  } catch (err) {
    // "already exists" errors are fine — policies may already be there
    if (err.message?.includes("already exists") || err.message?.includes("IF NOT EXISTS")) {
      console.log(`⚠ already exists — skipping: ${label}`);
      ok++;
    } else {
      console.error(`✗ FAILED: ${label}\n  ${err.message}`);
      failed++;
    }
  }
}

await sql.end();
console.log(`\nDone: ${ok} ok, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
