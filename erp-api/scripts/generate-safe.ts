import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const migrationsDir = join(process.cwd(), "drizzle");
const metaDir = join(migrationsDir, "meta");
const journalPath = join(metaDir, "_journal.json");

type Journal = {
  entries?: Array<{ idx: number; tag: string }>;
};

function readJournal(): Journal {
  return JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
}

function latestSnapshotIndex(): number {
  return readdirSync(metaDir)
    .map((name) => /^(\d+)_snapshot\.json$/.exec(name)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .reduce((max, value) => Math.max(max, value), -1);
}

const journalBefore = readJournal();
const entriesBefore = journalBefore.entries ?? [];
const latestJournalBefore = entriesBefore.reduce(
  (max, entry) => Math.max(max, entry.idx),
  -1,
);
const latestSnapshotBefore = latestSnapshotIndex();

// Migrations 0005-0008 were intentionally written as SQL migrations. Older
// versions of this project did not create Drizzle snapshots for those files.
// Running drizzle-kit generate directly in that state creates a migration that
// tries to CREATE the same tables again. The first generate after those manual
// migrations is therefore treated as a snapshot baseline only.
const needsSnapshotBaseline = latestSnapshotBefore < latestJournalBefore;
const args = ["drizzle-kit", "generate"];
if (needsSnapshotBaseline) {
  args.push("--name", "schema_baseline");
  console.info(
    `Drizzle snapshots are behind migration journal (${latestSnapshotBefore} < ${latestJournalBefore}).`,
  );
  console.info(
    "Creating a safe schema baseline snapshot. Duplicate SQL will not be executed.",
  );
}

const result = spawnSync("npx", args, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (needsSnapshotBaseline) {
  const journalAfter = readJournal();
  const newEntries = (journalAfter.entries ?? []).filter(
    (entry) => entry.idx > latestJournalBefore,
  );

  if (newEntries.length === 0) {
    console.info(
      "No baseline migration file was generated. Nothing else to do.",
    );
    process.exit(0);
  }

  for (const entry of newEntries) {
    const sqlPath = join(migrationsDir, `${entry.tag}.sql`);
    const original = readFileSync(sqlPath, "utf8");

    // Keep the generated snapshot/journal entry, but do not run the generated
    // delta because the same schema changes already exist in migrations 0005-0008.
    writeFileSync(
      sqlPath,
      [
        "-- SAFE SCHEMA BASELINE",
        "-- This migration intentionally performs no schema changes.",
        "-- The schema represented by this snapshot was already applied by migrations 0005-0008.",
        "-- Original drizzle-kit output length: " + original.length + " bytes.",
        "SELECT 1;",
        "",
      ].join("\n"),
      "utf8",
    );
    console.info(
      `Converted ${entry.tag}.sql into a safe no-op baseline migration.`,
    );
  }

  console.info("Schema baseline is ready. You can now run: npm run migrate");
}
