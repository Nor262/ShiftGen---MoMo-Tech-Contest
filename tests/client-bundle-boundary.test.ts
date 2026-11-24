import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Seam: nothing a browser component imports may reach the Prisma client (ticket #36). */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

function resolve(spec: string): string | null {
  const base = spec.replace(/^@\//, "");
  for (const c of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) if (existsSync(c)) return c;
  return null;
}

/** Every "@/..." module reachable from `file`, following value and type imports alike. */
function reachable(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
    // type-only imports are erased at build time and cannot pull Prisma into a bundle
    const stmt = src.slice(src.lastIndexOf("import", m.index), m.index);
    if (/^import\s+type\b/.test(stmt)) continue;
    const r = resolve(m[1]);
    if (r) reachable(r, seen);
  }
  return seen;
}

describe("client bundle boundary", () => {
  it("no 'use client' module can reach @/lib/prisma", () => {
    const clientFiles = [...files("app"), ...files("components")].filter((f) =>
      readFileSync(f, "utf8").trimStart().startsWith('"use client"'),
    );
    expect(clientFiles.length).toBeGreaterThan(5);
    const offenders = clientFiles.filter((f) => [...reachable(f)].some((m) => /lib[\\/]prisma\.ts$/.test(m)));
    expect(offenders).toEqual([]);
  });
});
