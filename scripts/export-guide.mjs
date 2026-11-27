// Exports docs/submission/one-page-guide.html to a strict 1-page A4 PDF.
// Usage: node scripts/export-guide.mjs
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_PATH,
    join(homedir(), ".local", "share", "mise", "installs", "playwright", "latest", "node_modules", "playwright"),
  ].filter(Boolean);
  for (const modPath of candidates) {
    try {
      return require(modPath);
    } catch {
      // try next candidate
    }
  }
  throw new Error("Could not load playwright module");
}

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

const { chromium } = loadPlaywright();
mkdirSync("submission", { recursive: true });
const executablePath = resolveChromiumExecutable();
const browser = await chromium.launch(executablePath ? { executablePath } : {});

try {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  const htmlUrl = pathToFileURL(resolve("docs/submission/one-page-guide.html")).href;
  await page.goto(htmlUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const overflowCheck = await page.evaluate(() => {
    const el = document.querySelector(".page");
    return el ? { scrollH: el.scrollHeight, clientH: el.clientHeight } : null;
  });
  if (overflowCheck && overflowCheck.scrollH > overflowCheck.clientH + 2) {
    throw new Error(
      `One-page guide overflows A4 height (${overflowCheck.scrollH}px > ${overflowCheck.clientH}px)`,
    );
  }

  const outPath = "submission/01-MoMo-TrustLoop-HuongDan-A4.pdf";
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  console.log("wrote", outPath);
} finally {
  await browser.close();
}
