# contracts/OWNERSHIP.md — Locked Directory Ownership & Contract Freeze

> **Global Rule:** ALL agents across all waves strictly operate at **ponytail level `full`** (NEVER `ultra`). See [AGENTS.md](../AGENTS.md).
> **Contract Freeze:** Files under `contracts/` are frozen at Wave 0 exit. Any contract modification requires explicit **Orchestrator approval** before editing.

## Per-Agent Ownership Matrix

| Wave | Agent | Tier / Model | Exclusive Owned Paths | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Wave 0** | `wave0-foundation` | Tier A (Neon) | `contracts/`, `AGENTS.md`, `PLAN.md`, `middleware.ts`, `lib/prisma.ts`, `lib/rate-limit.ts`, `app/api/health/`, `app/api/session/`, `app/api/demo/reset/`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.githooks/` | Also creates minimal Wave 0 placeholder routes & baseline `prisma/seed.ts` + `lib/session/index.ts` skeleton handed off to Wave 1. |
| **Wave 1** | `core-backend` | Tier B (Neon) | `lib/llm/`, `lib/session/`, `lib/pii/`, `app/api/shield/` | Expands `lib/session/` beyond Wave 0 skeleton without breaking Wave 0 API contracts. |
| **Wave 1** | `b2c-ui` | Tier C (Hydrogen) | `app/(b2c)/`, `app/(family)/`, `components/b2c/` | Replaces Wave 0 placeholder pages in `app/(b2c)/` and `app/(family)/`. |
| **Wave 1** | `assets` | Tier D (Hydrogen) | `demo-assets/`, `public/demo-images/`, `prisma/seed.ts`, `prisma/seed/`, `data/` | Expands Wave 0 minimal `prisma/seed.ts` stubs into full `CASE-01/02/03` synthetic fixtures (`MẪU MÔ PHỎNG`). |
| **Wave 2** | `graph-algo` | Tier B (Neon) | `lib/graph/` | Pure deterministic smurfing (`<10M/tx`, `<20M/day`) & mule cluster analysis over `GraphDataSchema`. |
| **Wave 2** | `warroom-agents` | Tier A/B (Neon) | `lib/agents/`, `app/api/warroom/` | 4 parallel agents + `DebateSynthesizer` + BM25 policy retriever + SSE/JSON endpoints. |
| **Wave 2** | `warroom-ui` | Tier C (Hydrogen) | `app/(warroom)/`, `components/warroom/` | Replaces Wave 0 placeholder in `app/(warroom)/`; uses `@xyflow/react` + `GraphDataSchema`. |
| **Wave 3** | `immunity` | Tier A (Neon) | `lib/immunity/`, `app/api/immunity/`, `app/(checker)/` | 4-Layer governance (`400`/`403` enforcement, TTL, Appeals, Rollback, AuditLog) + Checker UI. |
| **Wave 4** | `qa` | Tier D (Hydrogen) | `tests/` | Extends `tests/wave0.test.ts` cleanly; must not delete Wave 0 contract/isolation tests. |
| **Wave 4** | `docs` | Tier D (Hydrogen) | `docs/`, `README.md` | Updates docs with measured latencies and 5 mandatory `README.md` sections. |

## Cross-Boundary Rules
1. **No cross-editing:** Never modify another agent's owned files. If an upstream interface or contract is missing a field, raise a request to `@coordinator` for Orchestrator-approved contract revision.
2. **Shared Prisma schemas:** `prisma/schema.prisma` and `prisma/schema.postgres.prisma` are frozen at Wave 0. Any schema change requires Orchestrator approval and identical updates to both files.
3. **Shared `package.json`:** Do not add new npm dependencies without Orchestrator approval.
