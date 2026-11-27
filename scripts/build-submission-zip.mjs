// Builds a clean source submission archive from git HEAD (excludes .env, *.db, node_modules, .next, submission).
// Usage: node scripts/build-submission-zip.mjs
import { execSync } from "node:child_process";
import { mkdirSync, statSync, unlinkSync } from "node:fs";

const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (dirty) {
  console.warn("WARNING: Working tree has uncommitted changes; zip only packs committed HEAD:\n" + dirty);
}

mkdirSync("submission", { recursive: true });
const outZip = "submission/02-MoMo-TrustLoop-Source.zip";

execSync(`git archive --format=zip --prefix=momo-trustloop/ HEAD -o ${outZip}`, {
  stdio: "inherit",
});

const trackedFiles = execSync("git ls-tree -r --name-only HEAD", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const forbidden = trackedFiles.filter((f) =>
  /(^|\/)\.env($|\.(?!example))|\.db(-journal|-wal|-shm)?$|\.sqlite\d*$|\.pem$|\.key$|\.p12$|\.npmrc$|credentials\.json$|^submission\/|node_modules\/|\.next\/|\.git\//.test(
    f,
  ),
);

if (forbidden.length > 0) {
  try {
    unlinkSync(outZip);
  } catch {
    // ignore unlink errors
  }
  throw new Error(`Forbidden files detected in submission zip: ${forbidden.join(", ")}`);
}

const sizeMb = (statSync(outZip).size / (1024 * 1024)).toFixed(2);
console.log(`OK ${outZip}: ${trackedFiles.length} files, ${sizeMb} MB, 0 forbidden files.`);
