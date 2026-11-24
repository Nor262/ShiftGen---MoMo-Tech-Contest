import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";

/** Seam: nothing a browser component imports may reach the Prisma client (ticket #36). */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

function resolve(spec: string, fromFile: string): string | null {
  const base = spec.startsWith("@/") ? spec.slice(2) : spec.startsWith(".") ? join(dirname(fromFile), spec) : null;
  if (base === null) return null; // a package, not our source
  for (const c of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) if (existsSync(c)) return normalize(c);
  return null;
}

// one match per import/export statement, so "import type" is judged per statement
const STATEMENT = /^\s*(import|export)\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gm;
const DYNAMIC = /import\(\s*["']([^"']+)["']\s*\)/g;

/** Every source module reachable from `file` through value imports, re-exports and dynamic imports. */
function reachable(file: string, seen = new Set<string>()): Set<string> {
  const key = normalize(file);
  if (seen.has(key)) return seen;
  seen.add(key);
  const src = readFileSync(file, "utf8");
  const specs = [
    ...[...src.matchAll(STATEMENT)].filter((m) => !m[2]).map((m) => m[3]), // type-only is erased at build time
    ...[...src.matchAll(DYNAMIC)].map((m) => m[1]),
  ];
  for (const spec of specs) {
    const r = resolve(spec, file);
    if (r) reachable(r, seen);
  }
  return seen;
}

const reachesPrisma = (f: string) => [...reachable(f)].some((m) => /lib[\\/]prisma\.ts$/.test(m));

describe("client bundle boundary", () => {
  it("the walker does see Prisma through relative imports (positive control)", () => {
    expect(reachesPrisma("lib/session/index.ts")).toBe(true); // index.ts → "./shield" → "@/lib/prisma"
  });

  it("no 'use client' module can reach @/lib/prisma", () => {
    const clientFiles = [...files("app"), ...files("components")].filter((f) =>
      /^\s*["']use client["']/.test(readFileSync(f, "utf8")),
    );
    expect(clientFiles.length).toBeGreaterThan(5);
    expect(clientFiles.filter(reachesPrisma)).toEqual([]);
  });
});
