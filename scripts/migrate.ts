import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadEnv, databasePath } from "../lib/config";
import { applySchema } from "../db/ddl";

loadEnv();

function main() {
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  applySchema(sqlite);
  sqlite.close();
  console.log(`[migrate] schema ready at ${file}`);
}

main();
