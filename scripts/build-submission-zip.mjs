// Builds a clean source submission archive from git HEAD (excludes .env, *.db, node_modules, .next, submission).
// Usage: node scripts/build-submission-zip.mjs
import { execSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

mkdirSync("submission", { recursive: true });
const outZip = "submission/02-MoMo-TrustLoop-Source.zip";

execSync(`git archive --format=zip --prefix=momo-trustloop/ HEAD -o ${outZip}`, {
  stdio: "inherit",
});

const listing = execSync(`unzip -Z1 ${outZip}`, { encoding: "utf8" });
const lines = listing.trim().split("\n").filter(Boolean);
const forbidden = lines.filter((f) =>
  /(^|\/)\.env($|\.(?!example))|\.db$|\.sqlite$|node_modules\/|\.next\/|\.git\//.test(f),
);

if (forbidden.length > 0) {
  throw new Error(`Forbidden files detected in submission zip: ${forbidden.join(", ")}`);
}

const sizeMb = (statSync(outZip).size / (1024 * 1024)).toFixed(2);
console.log(`OK ${outZip}: ${lines.length} files, ${sizeMb} MB, 0 forbidden files.`);
