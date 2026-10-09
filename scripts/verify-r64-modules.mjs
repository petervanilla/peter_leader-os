import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const canonicalManifest = JSON.parse(await readFile(new URL("legacy/canonical/r64/manifest.json", root), "utf8"));
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
const start = markerAt + marker.length;
let depth = 0, inString = false, escape = false, end = -1;
for (let i = start; i < html.length; i++) {
  const ch = html[i];
  if (inString) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = false; continue; }
    continue;
  }
  if (ch === '"') { inString = true; continue; }
  if (ch === "{") depth++;
  else if (ch === "}") {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
if (end < 0) throw new Error("R64_MODULE_MAP_UNTERMINATED");
const embedded = JSON.parse(html.slice(start, end));
const moduleManifest = JSON.parse(await readFile(new URL("src/canonical-r64/module-manifest.json", root), "utf8"));

const expectedNames = Object.keys(embedded).sort();
const recordedNames = moduleManifest.modules.map(x => x.path).sort();
if (expectedNames.length !== 36) throw new Error(`R64 embedded module count: ${expectedNames.length}`);
if (JSON.stringify(expectedNames) !== JSON.stringify(recordedNames)) throw new Error("R64_MODULE_NAME_SET_MISMATCH");

for (const item of moduleManifest.modules) {
  const disk = await readFile(new URL("src/canonical-r64/" + item.path, root), "utf8");
  if (disk !== embedded[item.path]) throw new Error(`R64_MODULE_CONTENT_MISMATCH:${item.path}`);
  if (disk.length !== item.characters) throw new Error(`R64_MODULE_LENGTH_MISMATCH:${item.path}`);
}
console.log(`R64 module parity PASS · ${expectedNames.length} modules · canonical ${sha}`);
