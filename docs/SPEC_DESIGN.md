# Đặc Tả Thiết Kế Kỹ Thuật & Kiến Trúc Chi Tiết (`design.md`)
> **Dự án:** MoMo TrustLoop v2 — Live MVP (10 ngày)
> **Nguyên tắc kiến trúc:** Gọn nhẹ để chạy thật 100% online, **Cloud & LLM-Agnostic**, khóa chặt JSON Schema chống lỗi dây chuyền giữa các Agent, cô lập phiên chấm thi, và dễ triển khai chỉ với 1 lệnh.

---

## 1. Kiến trúc Tổng thể (Cloud & LLM-Agnostic)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│        NEXT.JS 15 APP ROUTER (TypeScript + Tailwind v3 + React Flow)    │
│  [Role Switcher: 5 Vai trò] | [Session ?session=xxx] | [Reset Demo]     │
│  [Tab 1: B2C Phút 00] | [Tab 2: Family Co-Sign] | [Tab 3: War-Room]     │
│  (Light MoMo Warm)     (1 màn hình duyệt ẩn PII)  (Dark Command Center) │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ REST API + SSE Streaming
┌───────────────────────────────────▼─────────────────────────────────────┐
│        NEXT.JS ROUTE HANDLERS (Session Isolation + Rate Limiter)        │
│                                                                         │
│  ┌──────────────────┐   ┌─────────────────────┐   ┌──────────────────┐  │
│  │ 2-Tier Immunity  │   │  PII Redactor Layer │   │ 4-Layer Maker -> │  │
│  │ Lookup (Pre/Post)│   │ (Regex + Diff + Tag)│   │ Checker & Audit  │  │
│  └────────┬─────────┘   └──────────┬──────────┘   └────────┬─────────┘  │
│           └────────────────────────┼───────────────────────┘            │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │    Hybrid 4+1 Agent Orchestrator (Promise.allSettled + SSE)       │  │
│  │  [GraphTracer] [EvidenceCorr] [ComplianceRAG(BM25)] [FP_Defender] │  │
│  │   + DebateSynthesizer (LLM) + Deterministic Guardrail (>=2 src)   │  │
│  │             + Strict Zod Schema Validator + 1x Repair             │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │           LLMProvider Adapter Interface (Biến môi trường)         │  │
│  │  [AWS Bedrock: Nova Pro + Claude] | [Gemini REST] | [OpenAI API]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│     PRISMA 6 ORM (Dual Parity Schema: SQLite Dev / PostgreSQL Prod)     │
│  user_consents | scan_sessions | held_transactions | investigation_cases│
│  immunity_indicators (TTL) | appeals | audit_logs (append-only)         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tầng Trừu tượng `LLMProvider` (3 Adapter Thực thi qua `LLM_BACKEND`)
* `LLM_BACKEND=bedrock`: Gọi **Amazon Nova Pro** (`apac.amazon.nova-pro-v1:0`) cho Vision và **Claude Sonnet** (`apac.anthropic.claude-sonnet-4-20250514-v1:0`) cho suy luận 4+1 Agent tại `BEDROCK_REGION=ap-southeast-1` qua `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`), tùy chọn `BEDROCK_GUARDRAIL_ID`.
* `LLM_BACKEND=gemini`: Gọi Gemini REST API (`gemini-2.5-flash` hoặc model tùy chọn) với `responseMimeType: "application/json"`, hỗ trợ inline image base64.
* `LLM_BACKEND=openai`: Gọi bất kỳ endpoint OpenAI-compatible (`/chat/completions`) với `response_format: { type: "json_object" }`.
* **Trung thực 100%:** Khi thiếu API key hợp lệ, hệ thống trả HTTP `503` mã `LLM_NOT_CONFIGURED` kèm hướng dẫn `.env.example`, tuyệt đối không giả lập AI trên runtime. Mọi lời gọi đo `latency_ms` bằng `performance.now()`.

---

## 2. Cấu trúc Thư mục Kho Mã nguồn

```text
momo_contest/
├── README.md
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── prisma/
│   ├── schema.prisma              # SQLite cho dev & test nhanh
│   └── schema.postgres.prisma     # PostgreSQL parity 100% cho Vercel / Neon / Docker
├── scripts/
│   └── generate-demo-images.mjs   # Render 2 ảnh PNG tiếng Việt bằng HTML/CSS + Playwright
├── public/
│   └── demo-images/
│       ├── zalo-fake-police.png   # CASE-01 Bác Hùng (có PII giả lập + dấu đỏ ghép lệch)
│       └── shipper-apk.png        # CASE-02 Minh Anh (tin nhắn dụ tải .apk + bật Accessibility)
├── docs/
│   ├── PRODUCT_IDEA.md
│   ├── SPEC_REQUIREMENTS.md
│   └── SPEC_DESIGN.md
├── tests/
│   └── trustloop.test.ts          # Unit + E2E Integration tests (E2E-01, E2E-02, E2E-03, isolation)
└── src/
    ├── lib/
    │   └── prisma.ts
    ├── core/
    │   ├── llm/
    │   │   ├── provider.ts        # Interface LLMProvider + extractJsonObject + invokeWithSchemaRepair
    │   │   ├── bedrockAdapter.ts
    │   │   ├── geminiAdapter.ts
    │   │   └── openaiAdapter.ts
    │   ├── security/
    │   │   ├── piiRedactor.ts     # Ẩn CCCD/SĐT/số dư + tạo piiDiff + bọc <untrusted_user_content>
    │   │   ├── actor.ts           # 5 vai trò + assertRole
    │   │   └── rateLimit.ts       # Sliding-window IP rate limiter
    │   ├── kb/
    │   │   ├── vnPolicies.json    # ~14 chunk pháp lý & bảo hiểm MoMo (có chunk_id)
    │   │   └── retriever.ts       # Bộ truy xuất BM25 + tag boost
    │   ├── agents/
    │   │   ├── schemas.ts         # Zod v3 Schema cứng cho Vision & 4+1 Agent
    │   │   ├── visionScanner.ts
    │   │   ├── graphTracer.ts
    │   │   ├── evidenceCorrelator.ts
    │   │   ├── complianceRag.ts
    │   │   ├── fpDefender.ts
    │   │   └── orchestrator.ts    # Promise.allSettled + SSE events + DebateSynthesizer + hard guardrail
    │   ├── governance/
    │   │   └── immunityService.ts # 4-Layer: Soft Warning, >=2 nguồn, Maker-Checker (403/400), TTL, Appeal, Rollback
    │   └── session/
    │       └── sessionService.ts  # Cookie tl_session / ?session=xxx + lazy seed + reset
    ├── data/
    │   └── seedScenarios.ts       # 100% synthetic data: CASE-01, CASE-02, CASE-03
    ├── components/
    │   ├── TrustLoopApp.tsx       # 5-role switcher + session badge + 3-min guide + Reset
    │   ├── B2CShieldPanel.tsx     # Opt-in + Scan + PII Diff + Hold 24h + APK report + Appeal modal
    │   ├── FamilyCoSignPanel.tsx  # 1 màn hình duyệt tối giản ẩn PII
    │   ├── WarRoomPanel.tsx       # SSE 4 Agent + Debate + CSKH Card + RAG inspector + Maker/Checker
    │   ├── MoneyFlowGraph.tsx     # @xyflow/react đồ thị tương tác + click node inspector
    │   └── ImmunityRegistryBar.tsx# Bảng 4 lớp miễn dịch + hàng đợi Khiếu nại + Audit Logs
    └── app/
        ├── layout.tsx
        ├── globals.css
        ├── page.tsx
        └── api/                   # 18 REST API route handlers
```

---

## 3. Thiết kế Cơ sở Dữ liệu (Prisma Dual Parity: SQLite & PostgreSQL)

Mọi bảng đều có cột `demoSessionId` để cô lập hoàn toàn dữ liệu giữa các giám khảo, dùng `String` và `Float` thay cho native `enum` hoặc `BigInt` để tương thích tuyệt đối giữa SQLite và PostgreSQL:
1. `UserConsent` (`id`, `demoSessionId`, `userId`, `optIn24hHold`, `guardianId`, `consentVersion`, `consentedAt`) — `@@unique([demoSessionId, userId])`.
2. `ScanSession` (`scanId`, `demoSessionId`, `userId`, `inputType`, `imageHash`, `riskScore`, `riskLevel`, `resultJson`, `sanitizedEvidenceJson`, `piiDiffJson`, `immunityHitId`, `modelUsed`, `measuredLatencyMs`, `createdAt`).
3. `HeldTransaction` (`txId`, `demoSessionId`, `scanId`, `senderId`, `senderLabel`, `recipientAccount`, `recipientBank`, `amountVnd`, `status`, `neutralMessage`, `holdExpiresAt`, `createdAt`, `updatedAt`).
4. `InvestigationCase` (`caseId`, `demoSessionId`, `txId`, `scenarioCode`, `title`, `subtitle`, `status`, `graphDataJson`, `caseContextJson`, `sanitizedMinute0Json`, `agentDebateJson`, `totalLatencyMs`, `createdAt`, `updatedAt`).
5. `ImmunityIndicator` (`indicatorId`, `demoSessionId`, `caseId`, `indicatorType`, `indicatorValue`, `severity`, `status`, `evidenceSourcesJson`, `makerId`, `checkerId`, `ttlHours`, `expiresAt`, `rollbackReason`, `createdAt`, `updatedAt`).
6. `Appeal` (`appealId`, `demoSessionId`, `indicatorId`, `appellantName`, `appellantNote`, `status`, `reviewerId`, `resolutionNote`, `createdAt`, `updatedAt`).
7. `AuditLog` (`logId`, `demoSessionId`, `actorId`, `actorRole`, `action`, `targetId`, `rationale`, `metadataJson`, `createdAt`).

---

## 4. Hợp đồng REST API Chính (18 Endpoints)

| Method & Endpoint | Mô tả chức năng | Đầu ra / Kiểm soát trọng tâm |
| :--- | :--- | :--- |
| `GET /api/session` | Lấy/tạo `demoSessionId`, seed dữ liệu phiên, trả trạng thái hiện tại | `sessionId`, `consents`, `scans`, `holds`, `cases`, `indicators`, `appeals`, `auditLogs`, `llmStatus` |
| `POST /api/demo/reset` | Khôi phục sạch 3 kịch bản cho riêng phiên hiện tại | `{ ok: true, sessionId }` |
| `POST /api/b2c/consent` | Lưu trạng thái Opt-in Bảo vệ 24h & liên kết Family Guardian | `UserConsent` + audit log |
| `POST /api/b2c/scan` | Kiểm tra Kho Miễn dịch Tầng 1 → gọi Vision LLM → `PII_Redactor` → kiểm tra Miễn dịch Tầng 2 | `ScanResultJSON` + `piiDiff` + `immunityHit` + `measured_latency_ms` |
| `POST /api/b2c/transfer` | Thực hiện chuyển tiền; nếu rủi ro cao & có Opt-in thì giữ `ON_HOLD_24H` câu trung tính | `txId`, `status`, `neutralMessage` |
| `POST /api/b2c/transfer/:txId/cancel` | Người dùng tự hủy giao dịch đang tạm giữ khi đã an toàn | `status: CANCELLED_BY_USER` + audit log |
| `POST /api/b2c/report-cyber` | Đẩy cảnh báo link/APK độc hại (CASE-02) đã ẩn PII sang B2E War-Room | `caseId` mới tạo trong `InvestigationCase` |
| `GET /api/family/holds` | Lấy danh sách giao dịch tạm giữ đã ẩn PII cho Tab Family Co-Sign | Mảng holds đã lược bỏ hoàn toàn số dư/CCCD/SĐT |
| `POST /api/family/escalate/:txId` | Chị Minh xác nhận giữ 24h & đẩy bằng chứng ẩn PII sang B2E War-Room | `caseId` mới hoặc cập nhật |
| `GET /api/b2e/cases` | Lấy hàng đợi B2E War-Room của phiên hiện tại | Danh sách cases |
| `POST /api/b2e/cases/:caseId/investigate` | Chạy song song 4 Agent (`Promise.allSettled`) + `DebateSynthesizer` (hỗ trợ SSE `?stream=1` & JSON) | `WarRoomDebateJSON` + `agent_latencies_ms` |
| `POST /api/b2e/cases/:caseId/decision` | Maker chọn: `DISMISS_FP` hoặc `PROPOSE_IMMUNITY` (`SOFT_WARNING` / `ACTIVE` — chặn `400` nếu `<2` nguồn lên `ACTIVE`) | `ImmunityIndicator` hoặc `DISMISSED_FP` |
| `GET /api/b2e/immunity` | Lấy danh sách chỉ báo, khiếu nại và nhật ký kiểm toán | `indicators`, `appeals`, `auditLogs` |
| `POST /api/b2e/immunity/:id/approve` | Checker (`!== makerId`, vi phạm trả `403`) duyệt chỉ báo lên `ACTIVE` kèm `TTL` | `status: ACTIVE` |
| `POST /api/b2e/immunity/:id/appeal` | Tạo đơn khiếu nại đưa vào hàng đợi người thật rà soát (TT 53/2026) | `appealId`, `status: PENDING_HUMAN_REVIEW` |
| `POST /api/b2e/immunity/:id/resolve-appeal` | Checker xử lý khiếu nại (`UPHELD` hoặc `OVERTURNED_ROLLBACK`) | Cập nhật `Appeal` & `ImmunityIndicator` + audit log |
| `POST /api/b2e/immunity/:id/rollback` | Checker thu hồi tức thì chỉ báo, gỡ khỏi B2C ngay lập tức | `status: ROLLED_BACK` + audit log |
| `POST /api/b2e/immunity/:id/expire-demo` | Checker giả lập hết hạn TTL để kiểm chứng Lớp 3 | `status: EXPIRED` + audit log |

---

## 5. JSON Schema Cứng cho Vision Scanner & 4+1 Agents

Mọi lời gọi LLM đều parse qua **Zod v3** (`src/core/agents/schemas.ts`) với tối đa 1 lần sửa lỗi định dạng tự động:
- `ScanResultSchema`: `status` (`ANALYZED` | `INCONCLUSIVE`), `risk_score` (0–100), `risk_level`, `scam_category`, `visual_tampering_flags[]`, `psych_manipulation_cues[]`, `cyber_threat_flags[]`, `extracted_entities`, `calm_guidance_vi`, `deescalation_questions_vi[]`.
- `WarRoomDebateSchema`: gồm `agents` (`graph_tracer`, `evidence_correlator`, `compliance_rag`, `false_positive_defender` — mỗi agent có `status: 'OK' | 'AGENT_DEGRADED'` và `latency_ms`), `synthesis` (`recommendation`, `eligible_for_active_immunity`, `eligibility_reason`, `risk_summary_points`, `defense_summary_points`, `cskh_empathetic_card`), `retrieved_chunks[]`, `total_latency_ms`, `model_used`.
- **Hậu kiểm code cứng (`orchestrator.ts`):** `eligible_for_active_immunity` luôn được tính lại từ `independentSources.length >= 2` bất kể LLM gợi ý thế nào.

---

## 6. Dữ liệu Mô phỏng Gốc (`seedScenarios.ts`) & Checklist `README.md`

* **`CASE-01` (Bác Hùng):** Ảnh chat Zalo giả `"Cán bộ Điều tra — Phòng Hình sự"` + lệnh bắt giả dấu đỏ ghép lệch + TK đích `990123456789` + 4 lệnh `9.500.000đ` né QĐ 2345 + cụm ví mule `ACC_MULE_01/02/03` chung thiết bị `DEV_ANDROID_99` + cờ SIMO mô phỏng.
* **`CASE-02` (Minh Anh):** Ảnh Zalo giả shipper/dịch vụ công gửi link `https://dichvucong-xacminh-hoso.example/capnhat.apk` + hướng dẫn bật quyền `Accessibility Services` (mô thức mã độc RedHook/RatHat).
* **`CASE-03` (Chị Hoa — Tiểu thương Livestream):** Shop Gia Dụng Hoa Mai hoạt động 14 tháng, 35 giao dịch nhỏ (`150k–450k`) trong khung `20:00–21:00` (gom thành 5 cụm đại diện + badge trên đồ thị), thiết bị chính chủ cố định, `sanitizedMinute0Json = null`, `0` khiếu nại.
* **`README.md` bắt buộc đủ 5 mục:** Hướng dẫn chạy & Live URL, Công nghệ & Mô hình AI, Khai báo 100% Dữ liệu tổng hợp + Nguồn tham khảo công khai, Danh sách Thư viện Mã nguồn mở & License, Tuyên bố Trách nhiệm & Ranh giới Thật/Mô phỏng.
