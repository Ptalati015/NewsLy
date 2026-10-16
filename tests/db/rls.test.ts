// Runs the real migration and seed in an in-memory Postgres and checks the
// access rules: signed-in readers can read reference data and only their own
// profile; anonymous visitors get nothing; nobody but the service role writes
// reference data.

import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const READER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

// Runs statements as an API role, the way Supabase's Data API would, inside a
// transaction that is rolled back. Returns the last statement's result.
async function as<T>(
  role: "anon" | "authenticated",
  sub: string | null,
  sql: string | string[],
) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(sub ? { sub, role } : { role }),
    ]);
    await db.exec(`set local role ${role}`);
    const statements = Array.isArray(sql) ? sql : [sql];
    let result = await db.query<T>(statements[0] ?? "select 1");
    for (const statement of statements.slice(1))
      result = await db.query<T>(statement);
    return result;
  } finally {
    await db.exec("rollback");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read("tests/support/supabase-shim.sql"));
  const migrations = readdirSync(new URL("supabase/migrations/", root)).sort();
  for (const file of migrations)
    await db.exec(read(`supabase/migrations/${file}`));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(`insert into auth.users (id, email) values
    ('${READER}', 'reader@example.com'), ('${OTHER}', 'other@example.com')`);
  await db.exec(
    `insert into public.profiles (id, home_state) values ('${OTHER}', 'CA')`,
  );
});

afterAll(async () => {
  await db?.close();
});

describe("seed", () => {
  it("loads 50 states and the 12 California races, and is safe to re-run", async () => {
    await db.exec(read("supabase/seed.sql"));
    const states = await db.query<{ n: number }>(
      "select count(*)::int as n from public.states",
    );
    const races = await db.query<{ n: number }>(
      "select count(*)::int as n from public.races",
    );
    expect(states.rows[0]?.n).toBe(50);
    expect(races.rows[0]?.n).toBe(12);
  });
});

describe("signed-in reader", () => {
  it("can read reference tables", async () => {
    const { rows } = await as<{ name: string }>(
      "authenticated",
      READER,
      "select name from public.states where enabled",
    );
    expect(rows.map((r) => r.name)).toEqual(["California"]);
    const races = await as<{ n: number }>(
      "authenticated",
      READER,
      "select count(*)::int as n from public.races",
    );
    expect(races.rows[0]?.n).toBe(12);
  });

  it("cannot write reference tables", async () => {
    await expect(
      as(
        "authenticated",
        READER,
        "insert into public.states values ('ZZ', 'Nowhere', true)",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as("authenticated", READER, "update public.states set enabled = true"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as("authenticated", READER, "delete from public.races"),
    ).rejects.toThrow(/permission denied/);
  });

  it("saves and reads their own state, and only their own", async () => {
    const { rows } = await as<{ home_state: string; n: number }>(
      "authenticated",
      READER,
      [
        "select public.set_home_state('CA')",
        `select (select home_state from public.profiles where id = '${READER}') as home_state,
                (select count(*)::int from public.profiles) as n`,
      ],
    );
    // Sees one profile (their own), not the other reader's.
    expect(rows[0]).toEqual({ home_state: "CA", n: 1 });
  });

  it("cannot pick a state that isn't open", async () => {
    await expect(
      as("authenticated", READER, "select public.set_home_state('TX')"),
    ).rejects.toThrow(/not available/);
  });

  it("cannot read, change or create someone else's profile", async () => {
    const seen = await as<{ n: number }>(
      "authenticated",
      READER,
      `select count(*)::int as n from public.profiles where id = '${OTHER}'`,
    );
    expect(seen.rows[0]?.n).toBe(0);
    const updated = await as(
      "authenticated",
      READER,
      `update public.profiles set home_state = null where id = '${OTHER}'`,
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    await expect(
      as(
        "authenticated",
        READER,
        `insert into public.profiles (id, home_state) values ('${OTHER}', 'CA')`,
      ),
    ).rejects.toThrow(/row-level security|duplicate key/);
  });
});

describe("anonymous visitor", () => {
  it("can't read anything", async () => {
    for (const table of [
      "states",
      "elections",
      "races",
      "candidates",
      "profiles",
    ]) {
      await expect(
        as("anon", null, `select * from public.${table}`),
        table,
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("can't save a state", async () => {
    await expect(
      as("anon", null, "select public.set_home_state('CA')"),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("row level security", () => {
  it("is on for every public table", async () => {
    const { rows } = await db.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(
      `select c.relname, c.relrowsecurity from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });
});
