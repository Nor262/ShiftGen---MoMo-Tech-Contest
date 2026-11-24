// Exports docs/pitch/trustloop-pitch.html to a 10-page 16:9 PDF (ticket #9).
// Usage: node scripts/export-pitch.mjs [--png]   (--png also writes per-slide previews to .superpowers/pitch/)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const html = pathToFileURL(resolve("docs/pitch/trustloop-pitch.html")).href;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => document.fonts.check('16px "Be Vietnam Pro"'));
if (!fonts) throw new Error("Be Vietnam Pro did not load; check network before exporting.");
await page.pdf({ path: "docs/pitch/TrustLoop-pitch.pdf", width: "1280px", height: "720px", printBackground: true });
if (process.argv.includes("--png")) {
  mkdirSync(".superpowers/pitch", { recursive: true });
  const slides = await page.$$("section.slide");
  for (const [i, s] of slides.entries()) await s.screenshot({ path: `.superpowers/pitch/slide-${i + 1}.png` });
}
await browser.close();
console.log("wrote docs/pitch/TrustLoop-pitch.pdf");
