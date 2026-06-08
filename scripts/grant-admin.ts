import Database from "better-sqlite3";
import { loadEnv, databasePath } from "../lib/config";

// Usage:
//   npm run admin:grant -- "Mike"      grant admin to the profile named "Mike"
//   npm run admin:grant -- --list      list current admins
//   npm run admin:grant -- --revoke "Mike"

loadEnv();

type Row = { id: string; name: string; pin_hash: string | null; is_admin: number };

function main() {
  const args = process.argv.slice(2);
  const db = new Database(databasePath());

  if (args[0] === "--list" || args.length === 0) {
    const admins = db.prepare("SELECT name, pin_hash FROM students WHERE is_admin = 1").all() as Row[];
    if (admins.length === 0) {
      console.log("No admin profiles yet. Grant one with:  npm run admin:grant -- \"<profile name>\"");
    } else {
      console.log("Admin profiles:");
      for (const a of admins) console.log(`  • ${a.name}${a.pin_hash ? " (PIN set)" : "  ⚠ NO PIN SET"}`);
    }
    db.close();
    return;
  }

  const revoke = args[0] === "--revoke";
  const name = (revoke ? args[1] : args[0])?.trim();
  if (!name) {
    console.error('Please provide a profile name, e.g.  npm run admin:grant -- "Mike"');
    process.exit(1);
  }

  const matches = db
    .prepare("SELECT id, name, pin_hash, is_admin FROM students WHERE lower(name) = lower(?)")
    .all(name) as Row[];

  if (matches.length === 0) {
    console.error(`No profile named "${name}". Create it first in the app, then re-run this.`);
    db.close();
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(`Multiple profiles named "${name}" exist. Rename one so the target is unambiguous.`);
    db.close();
    process.exit(1);
  }

  const target = matches[0];
  db.prepare("UPDATE students SET is_admin = ? WHERE id = ?").run(revoke ? 0 : 1, target.id);
  console.log(`${revoke ? "Revoked admin from" : "Granted admin to"} "${target.name}".`);
  if (!revoke && !target.pin_hash) {
    console.log(
      "\n⚠ This profile has NO PIN. Anyone could select it and reach the admin portal.\n" +
        "  Set a PIN: create the profile with a PIN, or protect access another way."
    );
  }
  db.close();
}

main();
