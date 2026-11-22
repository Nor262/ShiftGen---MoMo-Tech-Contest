# AGENTS.md — MoMo TrustLoop v2 Engineering & Swarm Rules

All agents working in this repository MUST follow these rules without exception.

## 1. Engineering Discipline — Ponytail Level `full` (Mandatory)
- **Active level:** `full` for EVERY agent across Waves 0–4. **NEVER** use `ultra` (do not push back on frozen scope or approved specs).
- **Minimal complete change:** Solve the full assigned task with the least new code. No speculative abstractions, pass-through wrappers, unused config knobs, or "for later" scaffolding.
- **Documented shortcuts:** Any intentional MVP limit MUST carry a single-line comment:
  `// shortcut: <the limit>, <when to upgrade>`
- **Self-checked:** Every non-trivial unit (validation, algorithm, security boundary, API route) ships with focused automated tests.
- **Never cut:**
  1. Trust-boundary validation (Zod v3 schemas, file magic bytes & size limits, `<untrusted_user_content>` wrapping).
  2. Security & secret guards (`.githooks/pre-commit`, session isolation by `demoSessionId`, IP+session rate limiting, Maker≠Checker `403`, `<2 sources` `400`).
  3. PII redaction (`CCCD`, `SĐT`, balance hidden before Family/B2E, never forwarding raw images).
  4. Accessibility (semantic landmarks, contrast, keyboard focus, large readable guidance for elderly users).
  5. Honest, neutral, legally compliant copy.

## 2. Product & Legal Guardrails (Hard Constraints)
- **NO impersonation of authorities:** NEVER impersonate NHNN, Police, Courts, or any government body anywhere in UI, prompts, or API responses.
- **Exact Neutral Hold Message (FR-03.1):**
  `"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."`
  Import `NEUTRAL_HOLD_MESSAGE` from `@/contracts` — do not duplicate or paraphrase it.
- **Synthetic Data Labeling:** Label all simulated/synthetic scenarios and seed records with `"MẪU MÔ PHỎNG"` (`DEMO_SIMULATION_LABEL` from `@/contracts`). Never include real CCCD, real phone numbers, or real bank accounts.
- **Honest Observability — No Hardcoded SLAs:** NEVER hardcode unmeasured performance claims (`"99%"`, `"<1s"`, `"<15s"`). Measure real runtime latency via `performance.now()` (`measured_latency_ms`) and report `model_used`.
- **No Runtime AI Faking:** When LLM credentials are absent, return HTTP `503` with code `LLM_NOT_CONFIGURED`; never fabricate AI outputs at runtime.
- **No Secrets in Git:** Only read secrets from environment variables (`.env` is gitignored and blocked by `.githooks/pre-commit`).

## 3. Contract Freeze & Directory Ownership
- `contracts/` is frozen after Wave 0. Any schema, enum, or API contract change requires **Orchestrator approval**.
- Edit ONLY files inside your assigned directories listed in [contracts/OWNERSHIP.md](./contracts/OWNERSHIP.md).
- Keep dual Prisma parity: every change to `prisma/schema.prisma` (SQLite) MUST be mirrored identically in `prisma/schema.postgres.prisma` (PostgreSQL).

## 4. Model Routing, Branching & Review Rules
- **Branching:** Work on your wave/feature branch (`wave0/foundation`, `wave1/...`, etc.). Do not commit directly to `main`; the Orchestrator merges after Reviewer sign-off.
- **Model tiers:** Tier A/B (high-reasoning models) own contracts, security, graph algorithms, agent orchestration, and 4-layer governance; Tier C/D own UI workspaces, synthetic assets, QA suites, and documentation.
- **Reviewer Gate:** Every branch must pass `npx prisma validate`, `npm run typecheck`, `npm test`, and `npm run build` before review. Reviewers verify guardrail compliance, contract conformance, and absence of out-of-scope edits or dead bloat.
