// Exports docs/submission/one-page-guide.html to a strict 1-page A4 PDF.
// Usage: node scripts/export-guide.mjs
import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function resolveChromiumExecutable() {
  const cacheDir = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cacheDir)) return undefined;
  const dirs = readdirSync(cacheDir)
    .filter((d) => d.startsWith("chromium-"))
    .sort()
    .reverse();
  for (const dir of dirs) {
    const candidate = join(cacheDir, dir, "chrome-linux64", "chrome");
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

mkdirSync("submission", { recursive: true });
const executablePath = resolveChromiumExecutable();
const browser = await chromium.launch(
  executablePath ? { executablePath } : { channel: "chrome" },
);
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
const htmlUrl = pathToFileURL(resolve("docs/submission/one-page-guide.html")).href;
await page.goto(htmlUrl, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const outPath = "submission/01-MoMo-TrustLoop-HuongDan-A4.pdf";
await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();
console.log("wrote", outPath);
