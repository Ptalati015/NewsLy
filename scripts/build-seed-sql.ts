// Regenerates supabase/seed.sql from the files in data/.
// Usage: npm run seed:sql

import { writeFileSync } from "node:fs";
import { electionFiles, statesFile } from "../lib/data/seed-files.ts";
import { buildSeedSql } from "../lib/data/seed-sql.ts";

const target = new URL("../supabase/seed.sql", import.meta.url);
writeFileSync(target, buildSeedSql(statesFile, electionFiles));
console.log(`Wrote ${target.pathname}`);
