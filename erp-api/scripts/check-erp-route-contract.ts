import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "src", "modules", "erp");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(root).filter((file) => file.endsWith(".routes.ts"));
const routes: Array<{ method: string; path: string; file: string }> = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const regex = /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(regex)) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: relative(process.cwd(), file).replaceAll("\\", "/"),
    });
  }
}

const duplicateKeys = routes
  .map((route) => `${route.method} ${route.path}`)
  .filter((key, index, all) => all.indexOf(key) !== index);

if (duplicateKeys.length > 0) {
  console.error("Duplicate ERP routes found:");
  for (const key of [...new Set(duplicateKeys)]) console.error(`- ${key}`);
  process.exitCode = 1;
} else {
  console.info(`ERP route contract OK: ${routes.length} routes across ${files.length} feature modules.`);
}

for (const route of routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
  console.info(`${route.method.padEnd(6)} ${route.path.padEnd(60)} ${route.file}`);
}
