import fs from "node:fs";

// Runs once before the whole test run: start from a clean test database so
// results are deterministic and never mixed with the dev database.
export default function setup() {
  for (const f of ["./data/test.db", "./data/test.db-wal", "./data/test.db-shm"]) {
    try {
      fs.rmSync(f, { force: true });
    } catch {
      /* ignore */
    }
  }
}
