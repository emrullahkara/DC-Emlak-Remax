#!/usr/bin/env node
/**
 * Sözleşme şablonlarını uygulama paketine taşır.
 *
 *   ../docs/sablonlar/*.md (README.md hariç)
 *     → content/sablonlar/*.md            (sürüm kontrolünde, okunabilir kopya)
 *     → src/domain/templates.generated.ts (tarayıcıda da çalışan ham metinler)
 *
 * Çalışma zamanında dosya sistemi kullanılmaz; şablonlar derlemeye gömülür.
 * Kullanım: `node scripts/sync-templates.mjs` (package.json: "sync:templates").
 * `--check` bayrağı ile yalnızca güncel olup olmadığını denetler (CI için).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..");
const srcDir = join(appDir, "..", "docs", "sablonlar");
const outDir = join(appDir, "content", "sablonlar");
const genFile = join(appDir, "src", "domain", "templates.generated.ts");
const check = process.argv.includes("--check");

if (!existsSync(srcDir)) {
  // Uygulama tek başına (docs olmadan) derleniyorsa mevcut üretilmiş dosyalar kullanılır.
  console.warn(`[sync-templates] ${srcDir} bulunamadı; mevcut üretilmiş dosyalar korunuyor.`);
  process.exit(0);
}

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
  .sort();

const entries = files.map((f) => [f, readFileSync(join(srcDir, f), "utf8").replace(/\r\n/g, "\n")]);

const gen =
  "// OTOMATİK ÜRETİLDİ — elle düzenlemeyin. Kaynak: docs/sablonlar/*.md\n" +
  "// Yeniden üretmek için: npm run sync:templates\n\n" +
  "export const TEMPLATE_SOURCES: Record<string, string> = {\n" +
  entries.map(([f, body]) => `  ${JSON.stringify(f)}: ${JSON.stringify(body)},`).join("\n") +
  "\n};\n";

if (check) {
  let stale = !existsSync(genFile) || readFileSync(genFile, "utf8") !== gen;
  for (const [f, body] of entries) {
    const p = join(outDir, f);
    if (!existsSync(p) || readFileSync(p, "utf8") !== body) stale = true;
  }
  if (stale) {
    console.error("[sync-templates] Üretilmiş şablonlar güncel değil. `npm run sync:templates` çalıştırın.");
    process.exit(1);
  }
  console.log(`[sync-templates] ${entries.length} şablon güncel.`);
  process.exit(0);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [f, body] of entries) writeFileSync(join(outDir, f), body);
writeFileSync(genFile, gen);
console.log(`[sync-templates] ${entries.length} şablon → content/sablonlar ve src/domain/templates.generated.ts`);
