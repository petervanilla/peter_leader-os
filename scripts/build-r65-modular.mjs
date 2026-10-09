import { readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = new URL("../", import.meta.url);
const canonicalManifest = JSON.parse(await readFile(new URL("legacy/canonical/r64/manifest.json", root), "utf8"));
const moduleManifest = JSON.parse(await readFile(new URL("src/canonical-r64/module-manifest.json", root), "utf8"));

let html = "";
for (const part of canonicalManifest.part_order) {
  html += await readFile(new URL(part, root), "utf8");
}
const bytes = Buffer.byteLength(html, "utf8");
const sha = createHash("sha256").update(html, "utf8").digest("hex");
if (bytes !== canonicalManifest.source_bytes) throw new Error(`R64 byte mismatch: ${bytes}`);
if (sha !== canonicalManifest.source_sha256) throw new Error(`R64 sha mismatch: ${sha}`);

const marker = "const MODULES = ";
const markerAt = html.indexOf(marker);
if (markerAt < 0) throw new Error("R64_MODULE_MAP_NOT_FOUND");
const scriptStart = html.lastIndexOf("<script type=\"module\">", markerAt);
const scriptClose = html.indexOf("</script>", markerAt);
if (scriptStart < 0 || scriptClose < 0) throw new Error("R64_MODULE_LOADER_SCRIPT_NOT_FOUND");
const scriptEnd = scriptClose + "</script>".length;

const replacement = '<script type="module" src="/src/canonical-r64/app.js"></script>';
const modularHtml = html.slice(0, scriptStart) + replacement + html.slice(scriptEnd);
if (modularHtml.includes("const MODULES = ")) throw new Error("R65_INLINE_MODULE_MAP_STILL_PRESENT");
if (!modularHtml.includes('/src/canonical-r64/app.js')) throw new Error("R65_DIRECT_MODULE_ENTRY_MISSING");

const names = new Set(moduleManifest.modules.map(x => x.path));
if (!names.has("app.js") || !names.has("runtime.js") || !names.has("supabase-auth.js")) {
  throw new Error("R65_REQUIRED_CANONICAL_MODULE_MISSING");
}
const importRe = /(?:from\s+|import\s*)["'](\.\.?\/[^"']+\.js)["']/g;
for (const name of names) {
  if (!name.endsWith(".js")) continue;
  const source = await readFile(new URL("src/canonical-r64/" + name, root), "utf8");
  let match;
  while ((match = importRe.exec(source))) {
    const base = path.posix.dirname(name);
    const resolved = path.posix.normalize(path.posix.join(base, match[1]));
    if (!names.has(resolved)) throw new Error(`R65_IMPORT_TARGET_MISSING:${name} -> ${resolved}`);
  }
}

const dist = new URL("dist/", root);
await mkdir(dist, { recursive: true });
await cp(new URL("src/canonical-r64/", root), new URL("dist/src/canonical-r64/", root), { recursive: true });
await writeFile(new URL("dist/index.html", root), modularHtml, "utf8");

console.log(`R65 modular build PASS · canonical ${sha} · ${names.size} modules · inline loader removed`);
