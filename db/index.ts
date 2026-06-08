import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { loadEnv, databasePath } from "../lib/config";
import * as schema from "./schema";

loadEnv();

// Reuse a single connection across hot-reloads / requests.
const globalForDb = globalThis as unknown as {
  __sqlite?: Database.Database;
};

function createConnection(): Database.Database {
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  // WAL lets multiple concurrent LAN users read while one writes.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export const sqlite = globalForDb.__sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
