# PLAN.md — MoMo TrustLoop v2 Architecture & Execution Roadmap

## 1. Architecture Summary
**MoMo TrustLoop v2** is a closed-loop digital trust ecosystem built on **Next.js 15 App Router (TypeScript + Tailwind v3 + React Flow)**, **Prisma 6 (Dual Parity: SQLite dev / PostgreSQL prod)**, and a **Cloud & LLM-Agnostic `LLMProvider`** (`gemini` | `openai` | `bedrock`).

- **Pillar 1 (B2C Minute-00 & Family Co-Sign):** Vision/NLP chat & `.apk` malware scanner + 2-tier Immunity lookup (Pre/Post Vision) + Pre-consented Opt-in 24h Hold (exact neutral copy) + `PII_Redactor` + minimal 1-screen Family Co-Sign.
- **Pillar 2 (B2E 4-Agent War-Room):** Parallel `Promise.allSettled` execution of `GraphTracer`, `EvidenceCorrelator`, `ComplianceRAG (BM25)`, and `FalsePositiveDefender` + `DebateSynthesizer` + deterministic code guardrail (`eligible_for_active_immunity = independent_sources.length >= 2`) + interactive `@xyflow/react` graph + Empathetic CSKH Handover Card.
- **Pillar 3 (4-Layer Community Immunity):** Layer 1 Soft Warning (1 source, 72h) → Layer 2 `>=2` independent sources (`400` enforced) & Maker–Checker (`checkerId !== makerId`, `403` enforced) → Layer 3 TTL (`72h` / `30d` + demo expire) → Layer 4 Human-reviewed Appeals (TT 53/2026) & instant Rollback + append-only `AuditLog`.
- **Session Isolation:** Every table is scoped by `demoSessionId` via `tl_session` cookie / `?session=<slug>` query override so concurrent judges never collide.

## 2. Canonical API Surface (19 Endpoints)
- **Wave 0 (Foundation):** `GET /api/health`, `GET /api/session`, `POST /api/demo/reset`
- **Wave 1 (B2C Shield & Family):**
  - `POST /api/shield/consent`
  - `POST /api/shield/scan`
  - `POST /api/shield/transfer`
  - `POST /api/shield/transfer/[txId]/cancel`
  - `POST /api/shield/report-cyber`
  - `GET /api/shield/family/holds`
  - `POST /api/shield/family/escalate/[txId]`
- **Wave 2 (B2E War-Room):**
  - `GET /api/warroom/cases`
  - `POST /api/warroom/cases/[caseId]/investigate`
  - `POST /api/warroom/cases/[caseId]/decision`
- **Wave 3 (Immunity Governance):**
  - `GET /api/immunity`
  - `POST /api/immunity/[id]/approve`
  - `POST /api/immunity/[id]/appeal`
  - `POST /api/immunity/[id]/resolve-appeal`
  - `POST /api/immunity/[id]/rollback`
  - `POST /api/immunity/[id]/expire-demo`

## 3. Waves 0–4 Execution Plan & Dependency Gates

| Wave | Agents | Deliverables | Exit Gate (Must Pass Before Next Wave) |
| :--- | :--- | :--- | :--- |
| **Wave 0** | `wave0-foundation` | Root App Router layout, `.githooks/pre-commit`, `AGENTS.md`, `PLAN.md`, `contracts/*`, Prisma migrate + baseline seed, `middleware.ts`, `lib/rate-limit.ts`, `lib/session/index.ts`, Wave 0 APIs & deployable UI shell, `tests/wave0.test.ts` | `prisma validate` (SQLite + PG), `typecheck`, `test`, `build`, pre-commit secret test, Reviewer merge to `main` |
| **Wave 1** | `core-backend`, `b2c-ui`, `assets` *(parallel)* | LLMProvider (Gemini/OpenAI/Bedrock) + `PII_Redactor` + `/api/shield/*`; B2C Shield & Family Co-Sign UI; full synthetic `CASE-01/02/03` seed & demo images | B2C scan + PII diff + Opt-in 24h neutral hold + Family Co-Sign escalation + APK cyber report working E2E |
| **Wave 2** | `graph-algo`, `warroom-agents`, `warroom-ui` *(parallel after Wave 1 contracts/seed)* | Deterministic smurfing/mule detection (`lib/graph/`); BM25 `vnPolicies.json` + 4+1 Agent orchestrator (SSE/JSON) + `/api/warroom/*`; War-Room UI + React Flow graph + CSKH card | 4-Agent debate runs on `CASE-01/02/03`, `CASE-03` recommends `RECOMMEND_DISMISS_FP`, `AGENT_DEGRADED` isolation verified |
| **Wave 3** | `immunity` *(after Wave 2)* | 4-Layer governance engine (`lib/immunity/`), `/api/immunity/*`, Checker & Appeals UI (`app/(checker)/`), closed-loop B2C immunity feedback verification | Maker self-approve returns `403`, `<2` sources `ACTIVE` returns `400`, Approve→B2C hit→Appeal→Rollback→Expire-Demo verified |
| **Wave 4** | `qa`, `docs` *(after Wave 3)* | Full `E2E-01/02/03` & session-isolation test suite, real latency measurements, final `README.md` (5 mandatory sections), Docker/deploy verification | All automated tests green, clean production build, zero secret/guardrail violations |

## 4. Directory Ownership
See [contracts/OWNERSHIP.md](./contracts/OWNERSHIP.md) for the locked per-agent directory ownership table. All agents run at ponytail level `full`.

## 5. Priority Cut-Order If Delayed
If schedule pressure occurs, cut strictly in this order from top to bottom:
1. **Cut First — Visual Polish:** Micro-animations, extra graph styling, dark/light transition flourishes.
2. **Cut Second — Demo Conveniences:** Guided 3-minute script overlay, one-click role switcher shortcuts (keep direct route navigation).
3. **Cut Third — Transport Optimization:** Fall back SSE live streaming (`?stream=1`) on `/api/warroom/cases/[caseId]/investigate` to standard JSON response while preserving per-agent `latency_ms` and `AGENT_DEGRADED` status.

**NEVER CUT (Hard Release Blockers):**
- All 3 core pillars (B2C Minute-00 + Opt-in Hold & Family Co-Sign; B2E 4-Agent War-Room with `FalsePositiveDefender` + CSKH card; 4-Layer Community Immunity loop back to B2C).
- `PII_Redactor` + before/after diff verification (never leak CCCD/SĐT/balance/raw image to Family/B2E).
- Maker–Checker enforcement (`403` on same actor/wrong role) and `>=2` sources guardrail (`400` on single-source `ACTIVE`).
- All 3 mandatory synthetic scenarios (`CASE-01` Bác Hùng, `CASE-02` Minh Anh APK, `CASE-03` Chị Hoa False-Positive).
- Exact neutral hold message (`NEUTRAL_HOLD_MESSAGE`) and zero NHNN/police impersonation.
