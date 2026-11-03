// Creates the database tables. Run once with:  npm run db:setup
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

// Load DATABASE_URL from .env.local if it isn't already set.
for (const file of [".env.local", ".env"]) {
  if (process.env.DATABASE_URL || !existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local first (see .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
await client.end();
console.log("Database is ready.");
