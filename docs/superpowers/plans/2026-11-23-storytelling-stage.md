# Storytelling Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 5-page demo into a projector-friendly story: a before/after home page and a single `/story` stage where each action and its real effect sit side by side.

**Architecture:** No contract, schema or API-logic change except the War-Room replay (same pattern as scan replay). `/story` is a client page driven by a pure state machine (`lib/story/machine.ts`) and a thin API client (`lib/story/actions.ts`) that calls the existing routes. Old pages stay; leaks are moved behind `.tech-only`.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v3 (DESIGN.md tokens), Zod contracts in `@/contracts`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-storytelling-stage-design.md`

## Global Constraints

- Hold copy: import `NEUTRAL_HOLD_MESSAGE` from `@/contracts`, never retype it.
- Every simulated scenario/lane carries `DEMO_SIMULATION_LABEL` ("MẪU MÔ PHỎNG").
- No fabricated AI output: missing credentials → 503 `LLM_NOT_CONFIGURED`; replay only from a committed real run, always labelled "phát lại" with time + model.
- No hardcoded SLA; times shown come from `measuredLatencyMs` / `debate.total_latency_ms` / `performance.now()`.
- Maker≠Checker enforced by server (403); the stage only sends `RISK_MAKER_HUYEN` then `RISK_CHECKER_TUAN`.
- `/story` text: stage ≥16px, phone frame ≥18px; no `text-[10px]` / `text-[11px]` anywhere in `app/story`, `components/story`.
- Exactly one primary button visible at a time on `/story`; it never requires scrolling at 1280×720.
- Signal Orange 700 surface appears once per page: the hold headline on beat ②.1.
- Contracts frozen; `contracts/b2c/` is a stray untracked copy — do not import from or commit it.
- Each task = one GitHub ticket, branch `ticket/<N>-<slug>` from `origin/main`, then code-review → PR (`Refs #N`, evidence) → close ticket. Commits without Co-Authored-By.
- Run tests with `DATABASE_URL=file:./dev.db npx vitest run <file>` from Git Bash.

## Review Focus

1. **Refresh mid-story** — expectation: a fresh session starts at ①, no half-applied state is shown as done. Test in Task 3 (`initialStoryState` has only ①.1 unlocked; no persistence).
2. **API error on any beat** (429 rate limit, 503 not configured, 502) — expectation: the real Vietnamese error shows next to the button, the beat stays retryable, the story does not advance. Test in Task 3 (`beatFailed` keeps chapter/beat, stores message).
3. **Double-click the primary button** — expectation: one API call. Test in Task 3 (`beatStarted` while `running` is a no-op).
4. **War-Room live call fails mid-demo** — expectation: labelled replay, Maker can still propose. Test in Task 1 (route returns 200 with `(phát lại` model and persisted `PENDING_DECISION`).
5. **Maker draft rejected by governance** (one source type / SOFT_WARNING) — expectation: never happens with the prefilled body. Test in Task 4 (`buildMakerDecision` yields ACTIVE + ≥2 distinct source TYPEs).

---

### Task 1: War-Room replay (ticket #15)

**Files:**
- Create: `data/replays/warroom-CASE-01.json` (from the untracked `warroom-CASE-01.raw.json`; delete the raw file after)
- Modify: `lib/replay.ts`, `lib/replay-label.ts`, `app/api/warroom/cases/[caseId]/investigate/route.ts`
- Test: `tests/wave5-replay.test.ts`

**Interfaces:**
- Produces:
  - `parseWarRoomReplayRecord(raw: unknown): WarRoomReplayRecord` — `{ kind: "warroom"; scenarioCode: "CASE-01"|"CASE-02"|"CASE-03"; recordedAt: string(datetime); modelUsed: string (not a NON_LLM model); debate: WarRoomDebate }`
  - `loadWarRoomReplay(scenarioCode: string): { debate: WarRoomDebate; noticeVi: string } | null` — returned `debate.model_used === replayModelLabel(record.modelUsed)`.
  - `isReplayModel(model: string): boolean` in `lib/replay-label.ts` (true when it ends with `" (phát lại)"`).

- [ ] **Step 1: Convert the raw run** — write `data/replays/warroom-CASE-01.json` as `{ kind:"warroom", scenarioCode:"CASE-01", recordedAt: raw.recordedAt, modelUsed: raw.response.debate.model_used, debate: raw.response.debate }`. Check no raw PII (`redactText(JSON) === JSON`), then `git rm`/delete `warroom-CASE-01.raw.json`.
- [ ] **Step 2: Failing tests** in `tests/wave5-replay.test.ts`, new `describe("war-room replay")`:
  - `loadWarRoomReplay("CASE-01")` not null; `noticeVi` matches `/^Kết quả đã chạy thật lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4} · model .+ · phát lại$/`; `debate.model_used` ends with `" (phát lại)"`.
  - `loadWarRoomReplay("CASE-03")` is `null`.
  - `parseWarRoomReplayRecord` throws on empty `modelUsed`, bad `recordedAt`, and `modelUsed` in `[DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL]`.
  - Route: with `setLLMProviderForTest` provider whose calls throw `LLMTimeoutError`, `POST investigate` (JSON, non-stream) for `${session}::CASE-01` → 200, `isReplayModel(body.debate.model_used)`, and the DB case row is `PENDING_DECISION` with `agentDebateJson` set.
  - Route, same failing provider, stream mode (`?stream=1`) → last SSE event is `completed` with a replay `model_used`.
  - Route, provider `isConfigured() === false` → 503 `LLM_NOT_CONFIGURED` (unchanged).
  - Route, failing provider on a CASE-03 case → non-200 (nothing invented).
- [ ] **Step 3: Run** `DATABASE_URL=file:./dev.db npx vitest run tests/wave5-replay.test.ts` → new tests FAIL.
- [ ] **Step 4: Implement** loader next to `SCAN_REPLAY_RECORDS` (same shortcut comment). In the route, wrap both `runWarRoomInvestigation` calls: on any error except `LLMNotConfiguredError`, call `loadWarRoomReplay(caseDto.scenarioCode)`; if present, build `output = { debate: replay.debate, annotatedGraph: analyzeCaseGraph({ graphData, caseContext }).annotatedGraph }` (deterministic, no LLM — import from where `lib/agents/orchestrator.ts` gets it), call `persistInvestigationResult`, and return it (JSON) or push `{ event:"completed", debate }` (SSE). If absent, keep the current error behaviour. Daily-quota exhaustion: same replay preference as scan.
- [ ] **Step 5: Run** the file again → PASS; then full `npm test`, `npm run typecheck`.
- [ ] **Step 6: Commit** `feat(warroom): labelled replay of the recorded real run when the live call fails (#15)`.

### Task 2: Plain-language cleanup + readable sizes on the old pages

**Files:**
- Modify: `app/(checker)/CheckerWorkspace.tsx`, `components/b2c/ScanResultPanel.tsx`, `components/b2c/B2CShieldWorkspace.tsx`, `components/b2c/TransferHoldPanel.tsx`, `components/warroom/*.tsx`, `components/DemoStepBar.tsx`
- Create: `lib/cast.ts`
- Test: `tests/ui-plain-language.test.ts`

**Interfaces:**
- Produces: `CAST: Record<"USER_B2C_HUNG"|"USER_B2C_NEW"|"FAMILY_MINH"|"RISK_MAKER_HUYEN"|"RISK_CHECKER_TUAN"|"RISK_CHECKER_LAN", { name: string; role: string }>` — names: Bác Hùng (người dùng), Người dùng mới, Chị Minh (con gái, người giám hộ — matches existing code), Chuyên viên Huyền (Risk Maker), Chuyên viên Tuấn (Risk Checker), Chuyên viên Lan (Risk Checker). Task 3–6 use this for every displayed name.

- [ ] **Step 1: Failing test** `tests/ui-plain-language.test.ts` — reads every `.tsx` under `app/` and `components/` (excluding `contracts/`) and asserts:
  - no `text-[10px]` or `text-[11px]`;
  - each of `OVERTURNED_ROLLBACK`, `immunity-registry-tier1`, `Trước Vision`, `Dismiss FP`, `FR-0`, `HTTP 400` appears only on lines that also contain `tech-only` or inside a `{/* */}`/`//` comment (line-based check is enough; shortcut comment).
  - `CAST` has a non-empty `name` for each key.
- [ ] **Step 2: Run** it → FAIL listing offenders.
- [ ] **Step 3: Fix** each offender: plain Vietnamese sentence in normal mode, original code in a sibling `<span className="tech-only">`. Maker/Checker ids on `/checker` cards → `CAST[id].name`. `text-[10px]|text-[11px]` → `text-xs` on B2E, `text-sm` on B2C (B2C body to 18px per DESIGN.md via existing `.b2c-large`). Fix the Hold Banner `border-signal-500` → `border-signal-700` (DESIGN.md drift found by the detector). Fix `DEMO_STEPS` hints to use `CAST` names.
- [ ] **Step 4: Run** test → PASS; `npm run typecheck`; screenshot `/checker`, `/shield`, `/warroom` before/after into `docs/screenshots/ticket-<N>/`.
- [ ] **Step 5: Commit** `fix(ui): plain language in normal mode, readable sizes, one cast list`.

### Task 3: Story state machine

**Files:**
- Create: `lib/story/machine.ts`
- Test: `tests/story-machine.test.ts`

**Interfaces:**
- Produces:
  - `type BeatId = "1.1"|"1.2"|"2.1"|"2.2"|"3.1"|"3.2"|"4.1"|"4.2"`
  - `STORY_BEATS: readonly { id: BeatId; chapter: 1|2|3|4; actor: keyof typeof CAST; buttonLabel: string; lockedReason: string; narration: string }[]` — order and copy from spec §5.2 "Hai nhịp mỗi chương".
  - `type StoryState = { current: BeatId | "done"; done: BeatId[]; running: boolean; error: string | null; viewing: 1|2|3|4; results: Partial<Record<BeatId, unknown>> }`
  - `initialStoryState(): StoryState` — current `"1.1"`, nothing done.
  - `storyReducer(s: StoryState, a: { type:"beatStarted" } | { type:"beatSucceeded"; result: unknown } | { type:"beatFailed"; message: string } | { type:"viewChapter"; chapter: 1|2|3|4 }): StoryState`
  - `isBeatLocked(s, id): boolean`

- [ ] **Step 1: Failing tests:**
  - initial: `current === "1.1"`, `isBeatLocked(s,"1.2") === true`.
  - `beatStarted` then `beatSucceeded({scanId:"x"})` → `current === "1.2"`, `done` contains `"1.1"`, `results["1.1"]` stored, `running === false`, `error === null`.
  - `beatStarted` twice → second returns the identical object (no-op).
  - `beatFailed("Đã đạt hạn mức…")` → `current` unchanged, `error` set, `running === false`.
  - after `"4.2"` succeeds → `current === "done"`.
  - `viewChapter(1)` after reaching chapter 3 → `viewing === 1`, `current` unchanged; `viewChapter(4)` when chapter 4 not reached → unchanged.
  - every `STORY_BEATS` entry has non-empty `buttonLabel`, `lockedReason`, `narration`.
- [ ] **Step 2: Run** `npx vitest run tests/story-machine.test.ts` → FAIL.
- [ ] **Step 3: Implement** — pure functions, no React import.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(story): beat state machine`.

### Task 4: Story API client

**Files:**
- Create: `lib/story/actions.ts`
- Test: `tests/story-actions.test.ts`

**Interfaces:**
- Consumes: `BeatId` (Task 3), `CAST` (Task 2).
- Produces:
  - constants `STORY_RECIPIENT_ACCOUNT = "990123456789"`, `STORY_AMOUNT_VND = 9_500_000`, `STORY_PRESET = "CASE-01"`.
  - `MAKER_DRAFT_VI`, `CHECKER_DRAFT_VI`: prefilled rationale strings (≥3 chars, plain Vietnamese, no legal over-claim — say "Kết luận rủi ro cao", never "xác nhận lừa đảo").
  - pure builders returning request bodies validated by the contract schemas: `buildConsent(): ConsentRequest`, `buildScan(): ShieldScanRequest`, `buildTransfer(scanId: string): TransferRequest`, `buildEscalate(): FamilyEscalateRequest`, `buildInvestigate(): InvestigateCaseRequest`, `buildMakerDecision(debate: WarRoomDebate, rationale: string): CaseDecisionRequest`, `buildApprove(rationale: string): ApproveImmunityRequest`, `buildNewUserProbe(): ShieldScanRequest` (`userId:"USER_B2C_NEW"`, `inputType:"TEXT_LOOKUP"`, `recipientAccount: STORY_RECIPIENT_ACCOUNT`).
  - `runBeat(id: BeatId, ctx: { scanId?: string; txId?: string; caseId?: string; debate?: WarRoomDebate; indicatorId?: string; rationale?: string }): Promise<unknown>` — `fetch` with `cache:"no-store"`, parses with the matching `*ResponseSchema`, throws `Error(body.error)` on non-2xx (Vietnamese message from the API).
- [ ] **Step 1: Failing tests** (builders only; `runBeat` is covered by the page smoke in Task 5):
  - each builder's output passes its `@/contracts` schema `.parse`.
  - `buildTransfer("s1")` → `recipientAccount "990123456789"`, `amountVnd 9500000`, `scanId "s1"`, `userId "USER_B2C_HUNG"`.
  - `buildMakerDecision(replayDebate, MAKER_DRAFT_VI)` (use `loadWarRoomReplay("CASE-01").debate`) → `decision "PROPOSE_IMMUNITY"`, `requestedLevel "ACTIVE"`, `indicatorType "BANK_ACCOUNT"`, `indicatorValue "990123456789"`, `actorId "RISK_MAKER_HUYEN"`, and `new Set(evidenceSources.map(s => s.split("_")[0])).size >= 2`.
  - `buildApprove(...)` → `checkerId "RISK_CHECKER_TUAN"`, `checkerRole "RISK_CHECKER"`.
  - `MAKER_DRAFT_VI`/`CHECKER_DRAFT_VI` do not contain "xác nhận lừa đảo".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (`evidenceSources` = `debate.synthesis.independent_sources`). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(story): API client and governance-valid drafts`.

### Task 5: `/story` stage shell + chapters ①–②

**Files:**
- Create: `app/story/page.tsx`, `components/story/Stage.tsx`, `components/story/PhoneFrame.tsx`, `components/story/Backstage.tsx`, `components/story/ChapterRail.tsx`
- Test: `tests/story-guardrails.test.ts`

**Interfaces:**
- Consumes: `storyReducer`, `STORY_BEATS`, `isBeatLocked` (Task 3); `runBeat`, builders, constants (Task 4); `CAST` (Task 2); `isReplayNotice`, `isReplayModel` (`lib/replay-label.ts`).
- Produces: `<Stage>` renders any beat from `STORY_BEATS`; Task 6 only adds per-beat phone/backstage content via `PhoneFrame`/`Backstage` props `{ beat: BeatId; state: StoryState }`.

Layout (spec §5.2): narration bar → actor badge (`CAST[actor].name`) → grid `[PhoneFrame 360px | arrow | Backstage]` → `ChapterRail` (`<ol>`, `aria-current="step"`) with the one primary `<button>` fixed at its right. `<1024px`: stack, button `sticky bottom-0`. Focus moves to the chapter `<h2>` on advance; `Backstage` has `aria-live="polite"`. Backstage = one headline line + ≤3 detail lines + `<details><summary>Xem thêm</summary>` (no inner scrollbar). Rationale beats render `<label>` + `<textarea>` prefilled, auto-focused, directly above the button.

Beat content ①–②:
- 1.1 consent → phone "Bác Hùng bật Bảo vệ 24h"; backstage headline "Đã bật Bảo vệ 24h".
- 1.2 scan → phone shows `/demo-assets` CASE-01 image (same path as `DEMO_PRESETS`); backstage headline = risk level in words, ≤3 cues, `model · {measuredLatencyMs/1000} s`, replay notice when `fallbackNoticeVi` is a replay.
- 2.1 transfer → phone shows `NEUTRAL_HOLD_MESSAGE`; backstage headline "Tiền đang tạm giữ — chưa rời ví" on the Signal Orange 700 surface.
- 2.2 escalate (actor FAMILY_MINH) → backstage "Đã chuyển cho đội Risk", case created.

- [ ] **Step 1: Failing test** `tests/story-guardrails.test.ts` (source-level, like Task 2): files under `components/story` + `app/story` contain `NEUTRAL_HOLD_MESSAGE` import, `DEMO_SIMULATION_LABEL`, `aria-live`, `aria-current`; no literal copy of the hold sentence; no `text-[10px]|text-[11px]`; no `localStorage` use for story state.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `npm run typecheck`; `npm run build`.
- [ ] **Step 5: Drive it** at 1280×720 in the browser with a fresh `?session=`: run ①.1→②.2; confirm no page scroll needed and only one primary button visible; screenshot each beat to `docs/screenshots/ticket-<N>/`.
- [ ] **Step 6: Commit** `feat(story): stage with chapters 1–2`.

### Task 6: Chapters ③–④ + summary card

**Files:**
- Modify: `components/story/PhoneFrame.tsx`, `components/story/Backstage.tsx`, `components/story/Stage.tsx`
- Create: `components/story/SummaryCard.tsx`
- Test: extend `tests/story-guardrails.test.ts`

Beat content:
- 3.1 investigate (Maker) → phone still on hold; backstage headline = recommendation in words; 4 agent lines (one conclusion each, `CAST`-free agent names in Vietnamese); citations in "Xem thêm"; `isReplayModel` → replay label.
- 3.2 maker decision (rationale beat) → backstage "Đề xuất bật Chỉ báo — chờ người thứ hai duyệt".
- 4.1 approve (Checker, rationale beat) → backstage "Chỉ báo đã bật · giao dịch của Bác Hùng bị hủy" (status from response, show the 403 message verbatim if it ever comes back).
- 4.2 new-user probe → phone switches to "Người dùng mới"; backstage headline = immunity hit warning + latency.
- `done` → `SummaryCard`: amount kept (`STORY_AMOUNT_VND`), per-beat measured times from stored results, "Chạy lại từ đầu" link to `/story?session=${newSessionSlug()}`.

- [ ] **Step 1: Failing test additions:** SummaryCard source has no `%`, no "<1s"/"99%" style literals; uses `DEMO_SIMULATION_LABEL`.
- [ ] **Step 2–4:** run FAIL → implement → PASS; typecheck; build.
- [ ] **Step 5: Drive the whole story** ①.1→④.2 on a fresh session with FPT configured; then once with the provider forced to fail (bad `LLM_BASE_URL` in a throwaway shell env) to see the War-Room replay label. Screenshots + one GIF.
- [ ] **Step 6: Commit** `feat(story): chapters 3–4 and summary`.

### Task 7: Home = two lanes, slim nav

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`
- Test: extend `tests/story-guardrails.test.ts`

- [ ] **Step 1: Failing test additions:** `app/page.tsx` contains `DEMO_SIMULATION_LABEL`, links to `/story?session=`, and does not contain `text-error`/`red-` classes in the "Hôm nay" lane (neutral Steel tone); `app/layout.tsx` nav renders the 4 old pages only inside `tech-only`.
- [ ] **Step 2: Implement** lanes per spec §5.1 (lane "Có TrustLoop" *is* the Minute Timeline: Phút 00 / 89 / 90+; lane "Hôm nay": 4 lệnh × 9,5 triệu → mất 38.000.000đ, illustrative). One CTA "Xem chuyện xảy ra thế nào" → `router.push(\`/story?session=${newSessionSlug()}\`)`. Remove the illustrative hold card and LOOP block; keep tech-only status/reset. Nav: "Tổng quan", "Xem câu chuyện"; old four inside `tech-only`. Fix "Tự thử với ảnh của bạn" to open a fresh session.
- [ ] **Step 3: Run** tests → PASS; typecheck; build; screenshot home before/after at 1280×720 and 390px.
- [ ] **Step 4: Commit** `feat(home): before/after lanes leading into the story`.
