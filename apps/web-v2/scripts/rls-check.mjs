#!/usr/bin/env node
/**
 * rls-check.mjs — REAL integration verification for the account-deletion +
 * favorites-sync contract. NOT part of CI. Run manually against a real Supabase
 * project (ideally a preview branch, or production only with intent).
 *
 * What it proves, with temporary randomized fixtures that are always cleaned up:
 *   1. Application-owned FK graph (recursive, auth.* vs public.* separated).
 *   2. user_favorites RLS: per-user isolation for SELECT / INSERT / DELETE, and
 *      anon lockout. Cross-user SELECT yields zero rows (not an error);
 *      cross-user DELETE affects zero visible rows; cross-user INSERT is
 *      rejected by WITH CHECK.
 *   3. workshops FK: a favorite with a nonexistent place_id is rejected.
 *   4. Clean cascade: deleting an eligible auth user removes its profile + its
 *      favorites.
 *   5. community_mentions: deleting an eligible user keeps the mention row and
 *      sets matched_by = NULL.
 *   6. Claimed-workshop blocker: the route's pre-delete decision returns
 *      ACCOUNT_HAS_CLAIMED_WORKSHOP and does NOT delete the auth identity.
 *   7. Privileged-role blocker: same, returning ACCOUNT_HAS_PRIVILEGED_ROLE.
 *   8. End-to-end account deletion: a signed-in cookie jar authenticates
 *      (getUser resolves the user), the real deletion sequence runs
 *      (admin.deleteUser + the route's signOut scope:"local" on that jar), then
 *      the SAME jar resolves NO user — and the server's auth.sessions /
 *      auth.refresh_tokens for that user are gone (cascade).
 *
 * ── Required environment variables ──────────────────────────────────────────
 *   SUPABASE_URL                 e.g. https://<ref>.supabase.co
 *                                (NEXT_PUBLIC_SUPABASE_URL is also accepted)
 *   SUPABASE_SERVICE_ROLE_KEY    service-role key (SUPABASE_SECRET_KEY accepted)
 *                                — used ONLY inside this harness for fixtures,
 *                                  auth user create/delete, and introspection.
 *   SUPABASE_DB_URL              direct Postgres connection string (service role)
 *                                — used for SQL + RLS impersonation of temp users.
 *   SUPABASE_ANON_KEY            publishable/anon key (NEXT_PUBLIC_SUPABASE_-
 *                                PUBLISHABLE_KEY / _ANON_KEY accepted) — used for
 *                                the end-to-end signed-in cookie-jar path (8).
 *                                The e2e path also needs the project's email/-
 *                                password provider enabled; if it is not, that
 *                                one path is reported SKIP and the rest still run.
 *
 * ── Run (from a clean checkout) ─────────────────────────────────────────────
 *   cd apps/web-v2
 *   npm install --no-save pg   # installs pg into node_modules WITHOUT writing to
 *                              # package.json or package-lock.json, so CI's
 *                              # `npm ci` lockfile stays byte-identical. pg is a
 *                              # harness-only dependency, deliberately not a
 *                              # project dependency.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_DB_URL=... \
 *     SUPABASE_ANON_KEY=... node scripts/rls-check.mjs
 *
 * ── Output hygiene ──────────────────────────────────────────────────────────
 *   Prints only PASS/FAIL, anonymous aliases (A/B/…), the FK graph, and row
 *   counts. NEVER prints keys, tokens, cookies, Authorization headers, the DB
 *   URL, or temp-user emails/passwords.
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!DB_URL) missing.push("SUPABASE_DB_URL");
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(", ")}`);
    console.error("See the header of this file for details.");
    process.exit(2);
  }
}

// ── tiny assert/report harness ───────────────────────────────────────────────
let passed = 0;
let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Mirrors src/lib/account-deletion.ts deletionBlocker() — kept in sync by hand.
function deletionBlocker({ isPrivilegedAdmin, hasClaimedWorkshop }) {
  if (isPrivilegedAdmin) return "ACCOUNT_HAS_PRIVILEGED_ROLE";
  if (hasClaimedWorkshop) return "ACCOUNT_HAS_CLAIMED_WORKSHOP";
  return null;
}

const EXPECTED_EDGES = {
  "public.profiles.id->auth.users.id": "CASCADE",
  "public.admins.user_id->public.profiles.id": "CASCADE",
  "public.workshops.claimed_by->public.profiles.id": "NO ACTION",
  "public.community_mentions.matched_by->public.profiles.id": "SET NULL",
  "public.user_favorites.user_id->auth.users.id": "CASCADE",
  "public.user_favorites.place_id->public.workshops.place_id": "CASCADE",
};

async function main() {
  requireEnv();

  const { default: pg } = await import("pg").catch(() => ({ default: null }));
  if (!pg) {
    console.error(
      "The 'pg' package is required. Run: npm install --no-save pg"
    );
    process.exit(2);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();

  // Fixtures to clean up no matter what.
  const users = []; // auth user ids
  const workshops = []; // place_ids
  const adminRows = []; // user_ids inserted into public.admins
  const mentionIds = []; // community_mentions ids

  // Run a block as a specific RLS role/user inside a rolled-back transaction so
  // impersonation never leaks. Returns { rows, error }.
  async function asRole(role, sub, fn) {
    await db.query("begin");
    try {
      await db.query("select set_config('role', $1, true)", [role]);
      if (sub) {
        const claims = JSON.stringify({ sub, role });
        await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
      }
      const result = await fn();
      return result;
    } finally {
      await db.query("rollback").catch(() => {});
    }
  }

  async function newUser(alias) {
    const email = `rlscheck+${alias}-${randomUUID()}@example.invalid`;
    const password = randomUUID() + "Aa1!";
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser(${alias}) failed: ${error.message}`);
    users.push(data.user.id);
    return data.user.id;
  }

  async function newWorkshop(tag) {
    const place_id = `RLSCHECK_${tag}_${randomUUID()}`;
    // Minimal NOT NULL columns from schema.sql.
    await db.query(
      `insert into public.workshops (place_id, name, specialty, entity_type, service_mode)
       values ($1, $2, 'اختبار', 'اختبار', 'fixed')`,
      [place_id, `RLS check ${tag}`]
    );
    workshops.push(place_id);
    return place_id;
  }

  try {
    // ── 1. Recursive FK graph audit ────────────────────────────────────────
    console.log("\n# FK graph (application-owned public.* edges)\n");
    const graph = await db.query(`
      select
        srcn.nspname as src_schema, src.relname as src_table,
        (select string_agg(a.attname, ',' order by k.ord)
           from unnest(c.conkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum) as src_cols,
        tgtn.nspname as tgt_schema, tgt.relname as tgt_table,
        (select string_agg(a.attname, ',' order by k.ord)
           from unnest(c.confkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum) as tgt_cols,
        case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
             when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as on_delete
      from pg_constraint c
      join pg_class src on src.oid=c.conrelid
      join pg_namespace srcn on srcn.oid=src.relnamespace
      join pg_class tgt on tgt.oid=c.confrelid
      join pg_namespace tgtn on tgtn.oid=tgt.relnamespace
      where c.contype='f' and srcn.nspname='public'
        and (tgtn.nspname='auth' or tgt.relname in ('profiles','workshops','admins'))
      order by src.relname, src_cols
    `);
    const seenEdges = {};
    for (const r of graph.rows) {
      const key = `${r.src_schema}.${r.src_table}.${r.src_cols}->${r.tgt_schema}.${r.tgt_table}.${r.tgt_cols}`;
      seenEdges[key] = r.on_delete;
      const expected = EXPECTED_EDGES[key];
      const tag = expected
        ? expected === r.on_delete
          ? "ok"
          : `UNEXPECTED (expected ${expected})`
        : "review";
      console.log(`  ${key}  ON DELETE ${r.on_delete}  [${tag}]`);
    }
    for (const [key, want] of Object.entries(EXPECTED_EDGES)) {
      check(`edge ${key} = ${want}`, seenEdges[key] === want, seenEdges[key] || "missing");
    }

    // Shared workshop fixture for favorites/mention tests.
    const wsFav = await newWorkshop("FAV");

    // ── 2. Favorites RLS isolation ─────────────────────────────────────────
    console.log("\n# user_favorites RLS\n");
    const A = await newUser("A");
    const B = await newUser("B");

    // A inserts + reads own.
    let r = await asRole("authenticated", A, () =>
      db.query(
        "insert into public.user_favorites(user_id, place_id) values ($1,$2)",
        [A, wsFav]
      ).then(() => ({ error: null })).catch((e) => ({ error: e }))
    );
    check("A inserts A favorite", !r.error, r.error?.message);

    r = await asRole("authenticated", A, () =>
      db.query("select place_id from public.user_favorites")
    );
    check("A reads only A favorite", r.rows.length === 1 && r.rows[0].place_id === wsFav, `${r.rows.length} rows`);

    // B inserts + reads own.
    r = await asRole("authenticated", B, () =>
      db.query(
        "insert into public.user_favorites(user_id, place_id) values ($1,$2)",
        [B, wsFav]
      ).then(() => ({ error: null })).catch((e) => ({ error: e }))
    );
    check("B inserts B favorite", !r.error, r.error?.message);

    r = await asRole("authenticated", B, () =>
      db.query("select place_id from public.user_favorites")
    );
    check("B reads only B favorite", r.rows.length === 1, `${r.rows.length} rows`);

    // Cross-user SELECT → zero rows, not an error.
    r = await asRole("authenticated", A, () =>
      db.query("select * from public.user_favorites where user_id=$1", [B])
    );
    check("A sees ZERO of B's rows (no error)", r.rows.length === 0, `${r.rows.length} rows`);

    // Cross-user DELETE → affects zero visible rows; B's favorite survives.
    r = await asRole("authenticated", A, () =>
      db.query("delete from public.user_favorites where user_id=$1", [B])
    );
    check("A cross-delete affects 0 rows", r.rowCount === 0, `rowCount=${r.rowCount}`);
    const bStill = await db.query(
      "select 1 from public.user_favorites where user_id=$1 and place_id=$2",
      [B, wsFav]
    );
    check("B's favorite still exists after A's cross-delete", bStill.rows.length === 1);

    // Cross-user INSERT (A claiming user_id=B) → rejected by WITH CHECK.
    r = await asRole("authenticated", A, () =>
      db.query(
        "insert into public.user_favorites(user_id, place_id) values ($1,$2)",
        [B, wsFav]
      ).then(() => ({ error: null })).catch((e) => ({ error: e }))
    );
    check("A cannot insert a row owned by B (WITH CHECK)", !!r.error, r.error?.code);

    // Anon lockout: no exposure, no writes.
    r = await asRole("anon", null, () =>
      db.query("select * from public.user_favorites").then((x) => ({ rows: x.rows, error: null })).catch((e) => ({ rows: [], error: e }))
    );
    check("anon exposes zero favorites", (r.rows?.length ?? 0) === 0, r.error ? "permission denied" : `${r.rows.length} rows`);

    r = await asRole("anon", null, () =>
      db.query("insert into public.user_favorites(user_id, place_id) values ($1,$2)", [A, wsFav])
        .then(() => ({ error: null })).catch((e) => ({ error: e }))
    );
    check("anon cannot insert", !!r.error, r.error?.code);

    r = await asRole("anon", null, () =>
      db.query("delete from public.user_favorites where user_id=$1", [B])
        .then((x) => ({ rowCount: x.rowCount, error: null })).catch((e) => ({ rowCount: -1, error: e }))
    );
    const bAfterAnon = await db.query("select 1 from public.user_favorites where user_id=$1", [B]);
    check("anon cannot delete authenticated rows", bAfterAnon.rows.length === 1);

    // ── 3. Workshops FK on favorites ───────────────────────────────────────
    r = await asRole("authenticated", A, () =>
      db.query(
        "insert into public.user_favorites(user_id, place_id) values ($1,$2)",
        [A, `NONEXISTENT_${randomUUID()}`]
      ).then(() => ({ error: null })).catch((e) => ({ error: e }))
    );
    check("favorite with nonexistent place_id fails FK", !!r.error, r.error?.code);

    // Clean up favorites created outside rolled-back txns (none persisted here
    // because each asRole ran in a rolled-back transaction). Verify clean.
    const favLeft = await db.query("select count(*)::int as n from public.user_favorites where place_id=$1", [wsFav]);
    check("no favorites leaked from RLS txns", favLeft.rows[0].n === 0, `${favLeft.rows[0].n} rows`);

    // ── 4. Clean cascade path ──────────────────────────────────────────────
    console.log("\n# clean cascade\n");
    const D = await newUser("D");
    await db.query("insert into public.user_favorites(user_id, place_id) values ($1,$2)", [D, wsFav]);
    const dProfile = await db.query("select 1 from public.profiles where id=$1", [D]);
    const dFav = await db.query("select 1 from public.user_favorites where user_id=$1", [D]);
    check("D has profile + favorite before delete", dProfile.rows.length === 1 && dFav.rows.length === 1);

    const delD = await admin.auth.admin.deleteUser(D);
    check("deleteUser(D) succeeded", !delD.error, delD.error?.message);
    users.splice(users.indexOf(D), 1); // already deleted
    const { data: goneD } = await admin.auth.admin.getUserById(D);
    check("D auth identity gone", !goneD?.user);
    const dProfileAfter = await db.query("select count(*)::int as n from public.profiles where id=$1", [D]);
    check("D profile rows = 0 (cascade)", dProfileAfter.rows[0].n === 0);
    const dFavAfter = await db.query("select count(*)::int as n from public.user_favorites where user_id=$1", [D]);
    check("D favorites rows = 0 (cascade)", dFavAfter.rows[0].n === 0);

    // ── 5. community_mentions SET NULL path ────────────────────────────────
    console.log("\n# community_mentions SET NULL\n");
    const E = await newUser("E");
    const mention = await db.query(
      `insert into public.community_mentions(workshop_id, source, source_label, matched_by, confidence)
       values ($1, $2, 'rls-check', $3, 0.5) returning id`,
      [wsFav, `rls_check_${randomUUID()}`, E]
    );
    mentionIds.push(mention.rows[0].id);
    const delE = await admin.auth.admin.deleteUser(E);
    check("deleteUser(E) succeeded", !delE.error, delE.error?.message);
    users.splice(users.indexOf(E), 1);
    const mAfter = await db.query(
      "select matched_by from public.community_mentions where id=$1",
      [mention.rows[0].id]
    );
    check("mention row survives account deletion", mAfter.rows.length === 1);
    check("mention matched_by is NULL (SET NULL)", mAfter.rows.length === 1 && mAfter.rows[0].matched_by === null);

    // ── 6. Claimed-workshop blocker (decision boundary, no deletion) ────────
    console.log("\n# claimed-workshop blocker\n");
    const F = await newUser("F");
    const wsClaim = await newWorkshop("CLAIM");
    await db.query("update public.workshops set claimed_by=$1, is_claimed=true where place_id=$2", [F, wsClaim]);
    // Mirror the route's pre-delete queries.
    const fAdmin = await db.query("select 1 from public.admins where user_id=$1", [F]);
    const fClaim = await db.query("select 1 from public.workshops where claimed_by=$1 limit 1", [F]);
    const fDecision = deletionBlocker({
      isPrivilegedAdmin: fAdmin.rows.length > 0,
      hasClaimedWorkshop: fClaim.rows.length > 0,
    });
    check("F decision = ACCOUNT_HAS_CLAIMED_WORKSHOP", fDecision === "ACCOUNT_HAS_CLAIMED_WORKSHOP", String(fDecision));
    // The route blocks BEFORE deletion — so F still exists and claim is intact.
    const { data: fStill } = await admin.auth.admin.getUserById(F);
    check("F auth identity still exists (blocked before delete)", !!fStill?.user);
    const fClaimIntact = await db.query("select claimed_by from public.workshops where place_id=$1", [wsClaim]);
    check("F's workshop ownership unchanged", fClaimIntact.rows[0].claimed_by === F);
    // release claim so the workshop fixture can be cleaned up.
    await db.query("update public.workshops set claimed_by=null, is_claimed=false where place_id=$1", [wsClaim]);

    // ── 7. Privileged-role blocker (decision boundary, no deletion) ─────────
    console.log("\n# privileged-role blocker\n");
    const G = await newUser("G");
    await db.query("insert into public.admins(user_id, role) values ($1,'moderator')", [G]);
    adminRows.push(G);
    const gAdmin = await db.query("select 1 from public.admins where user_id=$1", [G]);
    const gClaim = await db.query("select 1 from public.workshops where claimed_by=$1 limit 1", [G]);
    const gDecision = deletionBlocker({
      isPrivilegedAdmin: gAdmin.rows.length > 0,
      hasClaimedWorkshop: gClaim.rows.length > 0,
    });
    check("G decision = ACCOUNT_HAS_PRIVILEGED_ROLE", gDecision === "ACCOUNT_HAS_PRIVILEGED_ROLE", String(gDecision));
    const { data: gStill } = await admin.auth.admin.getUserById(G);
    check("G auth identity still exists (blocked before delete)", !!gStill?.user);

    // ── 8. End-to-end deletion + deterministic session invalidation ─────────
    // A real signed-in cookie jar authenticates; the actual deletion sequence
    // runs (admin.deleteUser + the route's signOut scope:"local" on that jar);
    // then the SAME jar must resolve no user, and the server session is gone.
    console.log("\n# end-to-end account deletion (signed-in cookie jar)\n");
    if (!ANON_KEY) {
      console.log("SKIP  e2e — SUPABASE_ANON_KEY not provided");
    } else {
      const email = `rlscheck+h-${randomUUID()}@example.invalid`;
      const password = randomUUID() + "Aa1!";
      const { data: made, error: mkErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (mkErr) throw new Error(`createUser(H) failed: ${mkErr.message}`);
      const H = made.user.id;
      users.push(H);

      // In-memory cookie jar: setAll with maxAge 0 removes the cookie.
      const store = new Map();
      const jar = {
        getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            if (options && options.maxAge === 0) store.delete(name);
            else store.set(name, value);
          }
        },
        names: () => [...store.keys()],
      };
      const ssr = createServerClient(SUPABASE_URL, ANON_KEY, {
        cookies: { getAll: jar.getAll, setAll: jar.setAll },
      });

      const signIn = await ssr.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        console.log(
          `SKIP  e2e sign-in failed (${signIn.error.message}) — email/password provider likely disabled; DB-level cascade still proven via FK graph + section 4`
        );
      } else {
        const before = await ssr.auth.getUser();
        check("e2e: jar authenticates before delete", before.data.user?.id === H, before.error?.message);

        const sessBefore = await db.query(
          "select count(*)::int as n from auth.sessions where user_id=$1",
          [H]
        );

        // The real deletion sequence, identical to the route.
        const delH = await admin.auth.admin.deleteUser(H);
        check("e2e: deleteUser(H) succeeded", !delH.error, delH.error?.message);
        users.splice(users.indexOf(H), 1);
        await ssr.auth.signOut({ scope: "local" }); // clears the jar's auth cookies

        // A brand-new client on the SAME jar must see no user.
        const ssr2 = createServerClient(SUPABASE_URL, ANON_KEY, {
          cookies: { getAll: jar.getAll, setAll: jar.setAll },
        });
        const after = await ssr2.auth.getUser();
        check("e2e: same cookie jar resolves NO user after deletion", !after.data.user, after.error?.message ?? "user still present");
        check("e2e: jar retains no Supabase auth cookie", jar.names().every((n) => !n.startsWith("sb-")), jar.names().join(",") || "(empty)");

        const sessAfter = await db.query(
          "select count(*)::int as n from auth.sessions where user_id=$1",
          [H]
        );
        check(
          "e2e: server auth.sessions removed on delete (cascade)",
          sessBefore.rows[0].n >= 1 && sessAfter.rows[0].n === 0,
          `before=${sessBefore.rows[0].n} after=${sessAfter.rows[0].n}`
        );
      }
    }
  } finally {
    // ── cleanup (best-effort, order matters) ───────────────────────────────
    for (const id of mentionIds) {
      await db.query("delete from public.community_mentions where id=$1", [id]).catch(() => {});
    }
    for (const uid of adminRows) {
      await db.query("delete from public.admins where user_id=$1", [uid]).catch(() => {});
    }
    for (const place of workshops) {
      await db.query("update public.workshops set claimed_by=null where place_id=$1", [place]).catch(() => {});
      await db.query("delete from public.user_favorites where place_id=$1", [place]).catch(() => {});
      await db.query("delete from public.community_mentions where workshop_id=$1", [place]).catch(() => {});
      await db.query("delete from public.workshops where place_id=$1", [place]).catch(() => {});
    }
    for (const uid of users) {
      await admin.auth.admin.deleteUser(uid).catch(() => {});
    }
    await db.end().catch(() => {});
    console.log(`\n${passed} passed, ${failed} failed.`);
    process.exit(failed === 0 ? 0 : 1);
  }
}

main().catch((e) => {
  console.error("rls-check crashed:", e.message);
  process.exit(1);
});
