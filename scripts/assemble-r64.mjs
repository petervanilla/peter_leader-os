import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const manifest = JSON.parse(await readFile(new URL("../legacy/canonical/r64/manifest.json", import.meta.url), "utf8"));
let html = "";
for (const path of manifest.part_order) {
  html += await readFile(new URL("../" + path, import.meta.url), "utf8");
}
const bytes = Buffer.byteLength(html, "utf8");
const sha256 = createHash("sha256").update(html, "utf8").digest("hex");
if (bytes !== manifest.source_bytes) throw new Error(`R64 byte length mismatch: ${bytes}`);
if (sha256 !== manifest.source_sha256) throw new Error(`R64 SHA-256 mismatch: ${sha256}`);
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
const out = new URL("../dist/" + manifest.canonical_file, import.meta.url);
await writeFile(out, html, "utf8");
console.log(`R64 canonical assembled: ${manifest.canonical_file} · ${bytes} bytes · ${sha256}`);
