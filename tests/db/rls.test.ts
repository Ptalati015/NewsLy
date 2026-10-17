// Runs the real migration and seed in an in-memory Postgres and checks the
// access rules: signed-in readers on the beta list can read reference data
// and only their own profile; everyone else, signed in or not, gets nothing;
// nobody but the service role writes reference data.

import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

type Account = { sub: string; email: string };

const READER: Account = {
  sub: "11111111-1111-1111-1111-111111111111",
  email: "reader@example.com",
};
const OTHER: Account = {
  sub: "22222222-2222-2222-2222-222222222222",
  email: "other@example.com",
};
// Signed in with Google, but not on the beta list.
const STRANGER: Account = {
  sub: "33333333-3333-3333-3333-333333333333",
  email: "stranger@example.com",
};

let db: PGlite;

// Runs statements as an API role, the way Supabase's Data API would, inside a
// transaction that is rolled back. Returns the last statement's result.
async function as<T>(
  role: "anon" | "authenticated" | "service_role",
  account: Account | null,
  sql: string | string[],
) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ ...account, role }),
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
    ('${READER.sub}', '${READER.email}'), ('${OTHER.sub}', '${OTHER.email}'),
    ('${STRANGER.sub}', '${STRANGER.email}')`);
  // Listed the way an owner might type it: case and spaces don't matter.
  await db.exec(`insert into public.allowed_emails (email) values
    (' Reader@Example.com '), ('${OTHER.email}')`);
  await db.exec(
    `insert into public.profiles (id, home_state) values ('${OTHER.sub}', 'CA')`,
  );
});

afterAll(async () => {
  await db?.close();
});

describe("seed", () => {
  it("loads 50 states, the 12 California races and their 24 candidates, and is safe to re-run", async () => {
    await db.exec(read("supabase/seed.sql"));
    const states = await db.query<{ n: number }>(
      "select count(*)::int as n from public.states",
    );
    const races = await db.query<{ n: number }>(
      "select count(*)::int as n from public.races",
    );
    const candidates = await db.query<{ n: number }>(
      "select count(*)::int as n from public.candidates",
    );
    expect(states.rows[0]?.n).toBe(50);
    expect(races.rows[0]?.n).toBe(12);
    expect(candidates.rows[0]?.n).toBe(24);
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
        `select (select home_state from public.profiles where id = '${READER.sub}') as home_state,
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
      `select count(*)::int as n from public.profiles where id = '${OTHER.sub}'`,
    );
    expect(seen.rows[0]?.n).toBe(0);
    const updated = await as(
      "authenticated",
      READER,
      `update public.profiles set home_state = null where id = '${OTHER.sub}'`,
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    await expect(
      as(
        "authenticated",
        READER,
        `insert into public.profiles (id, home_state) values ('${OTHER.sub}', 'CA')`,
      ),
    ).rejects.toThrow(/row-level security|duplicate key/);
  });
});

describe("signed-in account that isn't on the beta list", () => {
  it("reads no rows", async () => {
    for (const table of [
      "states",
      "elections",
      "races",
      "candidates",
      "profiles",
    ]) {
      const { rows } = await as<{ n: number }>(
        "authenticated",
        STRANGER,
        `select count(*)::int as n from public.${table}`,
      );
      expect(rows[0]?.n, table).toBe(0);
    }
  });

  it("can't save a state or create a profile", async () => {
    await expect(
      as("authenticated", STRANGER, "select public.set_home_state('CA')"),
    ).rejects.toThrow(/not on the beta list/i);
    await expect(
      as(
        "authenticated",
        STRANGER,
        `insert into public.profiles (id, home_state) values ('${STRANGER.sub}', 'CA')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("is told so by is_allowed, which readers on the list pass", async () => {
    const no = await as<{ ok: boolean }>(
      "authenticated",
      STRANGER,
      "select public.is_allowed() as ok",
    );
    const yes = await as<{ ok: boolean }>(
      "authenticated",
      READER,
      "select public.is_allowed() as ok",
    );
    expect([no.rows[0]?.ok, yes.rows[0]?.ok]).toEqual([false, true]);
  });

  it("loses access as soon as a reader is taken off the list", async () => {
    await db.exec("begin");
    try {
      await db.exec(
        `delete from public.allowed_emails where email = '${OTHER.email}'`,
      );
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ ...OTHER, role: "authenticated" }),
      ]);
      await db.exec("set local role authenticated");
      const { rows } = await db.query<{ states: number; profiles: number }>(
        `select (select count(*)::int from public.states) as states,
                (select count(*)::int from public.profiles) as profiles`,
      );
      expect(rows[0]).toEqual({ states: 0, profiles: 0 });
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("the beta list", () => {
  it("can't be read or changed by readers", async () => {
    await expect(
      as("authenticated", READER, "select * from public.allowed_emails"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(
        "authenticated",
        STRANGER,
        `insert into public.allowed_emails (email) values ('${STRANGER.email}')`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("service role", () => {
  it("can write reference data and the beta list", async () => {
    const { rows } = await as<{ n: number }>("service_role", null, [
      "insert into public.states values ('ZZ', 'Nowhere', false)",
      "insert into public.allowed_emails (email) values ('new@example.com')",
      `select (select count(*)::int from public.states where code = 'ZZ')
            + (select count(*)::int from public.allowed_emails where email = 'new@example.com') as n`,
    ]);
    expect(rows[0]?.n).toBe(2);
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
      "allowed_emails",
    ]) {
      await expect(
        as("anon", null, `select * from public.${table}`),
        table,
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("can't save a state or ask about the beta list", async () => {
    await expect(
      as("anon", null, "select public.set_home_state('CA')"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as("anon", null, "select public.is_allowed()"),
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
