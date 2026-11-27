# MoMo TrustLoop v2 — Vòng Phòng vệ Niềm tin Số Khép kín (B2C → Người giám hộ → B2E)

> **MoMo Tech Contest 2026** — *"Imagine the Future Workspace (Human Centered. AI Powered)"*
> Toàn bộ dữ liệu kịch bản và nhân vật trong bản demo đều là **`MẪU MÔ PHỎNG`** tổng hợp 100%, cô lập theo từng phiên chấm thi (`demoSessionId`).
> **Định vị:** TrustLoop là lớp **bổ sung** trên SIMO của NHNN và các lớp bảo vệ MoMo đang có (cảnh báo tài khoản nhận tiền, Bảo hiểm An toàn chuyển tiền): bắt kịch bản thao túng ở **Phút 00** khi tài khoản nhận còn "sạch", và thêm quy trình Khiếu nại/người thật xem lại minh bạch. Sinh trắc học chứng minh đúng người đang thao tác, không chứng minh người đó không bị thao túng. Chi tiết: [Ý tưởng Sản phẩm](./docs/PRODUCT_IDEA.md); thuật ngữ: [GLOSSARY.md](./GLOSSARY.md).

---

## 1. Giới thiệu & Hướng dẫn Chạy (Live URL, Local, PostgreSQL/Vercel & Docker)

### Live URL (Production)
- **Trải nghiệm kể chuyện nhanh (/story):** [`https://momo-trustloop.vercel.app/story`](https://momo-trustloop.vercel.app/story)
- **Không gian làm việc đầy đủ:** [`https://momo-trustloop.vercel.app`](https://momo-trustloop.vercel.app) *(không cần đăng nhập/mật khẩu; tự cô lập theo phiên)*
- **Hạ tầng triển khai hiện tại:** Vercel (`sin1` Singapore, Fluid Compute `maxDuration` up to `300s`; route `/api/shield/scan` đặt `maxDuration = 60`, `/api/warroom/cases/[caseId]/investigate` đặt `maxDuration = 120`) + Supabase PostgreSQL (`ap-southeast-1`) + **FPT AI Factory** (`gemma-4-31B-it` cho Vision, `Qwen3.8-27B` cho War-Room, fallback sang Gemini).
- **Kế hoạch AWS Sandbox (tùy chọn, theo email BTC):** Đã hoàn thiện adapter **AWS Bedrock** (`LLM_BACKEND=bedrock`, region `ap-southeast-2`), sẵn sàng chuyển nếu được cấp quyền model; bản Vercel hiện tại chạy chính thức cho vòng sơ khảo.
- **Lưu ý Supabase Free Tier (Keep-Alive):** Supabase Free tự tạm dừng (*auto-pause*) sau 7 ngày không có truy vấn. Khuyến nghị ping định kỳ endpoint kiểm tra sức khỏe `GET /api/health` (trả HTTP `200` kèm trạng thái DB & LLM) để giữ kết nối luôn sẵn sàng.
- **Đồng bộ 2 thiết bị cho BGK:** Mở cùng URL với tham số `?session=momo-final` trên cả Laptop và Điện thoại.
- **Tài liệu đi kèm:** [Hướng dẫn Demo 1 Trang (3 phút)](./docs/ONE_PAGE_GUIDE.md) | [Kịch bản Video 3 phút](./docs/submission/VIDEO_SCRIPT_3MIN.md) | [Bảng Số đo Độ trễ Thực tế](./docs/MEASURED_LATENCIES.md) | [Ý tưởng Sản phẩm](./docs/PRODUCT_IDEA.md) | [Đặc tả Yêu cầu](./docs/SPEC_REQUIREMENTS.md) | [Đặc tả Thiết kế](./docs/SPEC_DESIGN.md) | [Căn cứ pháp lý](./docs/RESEARCH_LEGAL.md) | [Số liệu vấn đề](./docs/RESEARCH_PROBLEM.md).

### Chạy Local (SQLite — Phát triển & Kiểm thử nhanh)
```bash
npm install
cp .env.example .env   # Điền khóa LLM (nếu dùng Gemini key, đặt LLM_BACKEND=gemini)
npm run db:push
npm run dev
```
Mở `http://localhost:3000`. Khi thiếu khóa API hợp lệ, các endpoint AI trả về **`HTTP 503` (`LLM_NOT_CONFIGURED`)** thay vì giả lập kết quả AI.

### Chạy với PostgreSQL / Vercel
```bash
# Cấu hình DATABASE_URL và DIRECT_URL trỏ tới PostgreSQL trong .env
npm run db:push:postgres
npm run build:postgres
npm start
```
Trên Vercel, `vercel.json` gọi `node scripts/build-vercel.mjs` để tự động chọn `prisma/schema.postgres.prisma` khi `DATABASE_URL` bắt đầu bằng `postgres://` hoặc `postgresql://`.

### Chạy 1 Lệnh với Docker (`postgres:16-alpine` + Node 22 Alpine)
```bash
cp .env.example .env   # Điền GEMINI_API_KEY (hoặc backend LLM mong muốn)
docker compose up --build
```
Container `app` tự đợi `postgres` healthy, chạy `prisma db push --schema=prisma/schema.postgres.prisma --skip-generate`, và khởi động Next.js standalone tại `http://localhost:3000`.

---

## 2. Công nghệ & Kiến trúc AI (Model Sản phẩm vs Công cụ Phát triển)

### Kiến trúc `LLMProvider` (Độc lập Cloud & Mô hình)
Mọi lời gọi AI trong sản phẩm đi qua tầng trừu tượng `LLMProvider` cấu hình qua biến môi trường:
- **Live Production hiện tại (`LLM_BACKEND=openai` — FPT AI Factory):** Endpoint OpenAI-compatible (`/chat/completions` tại `https://token-api.fpt.ai/v1`) chạy **`gemma-4-31B-it`** (Vision) và **`Qwen3.8-27B`** (War-Room 4+1 Agents).
- **Mặc định trong code & Dự phòng (`LLM_BACKEND=gemini` / `LLM_FALLBACK_BACKEND=gemini`):** Google Gemini REST API (`gemini-3-flash-preview` cho Vision & `gemini-3.5-flash-lite` cho Reasoning).
- **AWS Bedrock (`LLM_BACKEND=bedrock`, `ap-southeast-2`):** `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`) với **Amazon Nova Pro** (`apac.amazon.nova-pro-v1:0`) cho Vision và **Claude Sonnet** (`apac.anthropic.claude-sonnet-4-20250514-v1:0`) cho 4+1 Agents, tùy chọn `BEDROCK_GUARDRAIL_ID`.
- **Bảo vệ hạn mức & Trung thực:** Thiếu API key trả HTTP `503` (`LLM_NOT_CONFIGURED`). Khi chạm ngưỡng `DAILY_LLM_CALL_LIMIT` (mặc định `100` lượt/ngày), hệ thống ghi nhận rõ trạng thái fallback thay vì âm thầm giả mạo AI.

### Phân tách Thuật toán Thuần (Deterministic) vs Nhiệm vụ LLM
| Lớp xử lý | Cơ chế | Trách nhiệm cụ thể |
| :--- | :--- | :--- |
| **Thuần thuật toán (Không dùng LLM)** | `lib/graph/analyzer.ts` | Phát hiện Chia nhỏ giao dịch (*smurfing*) dưới ngưỡng xác thực sinh trắc học 10M/lần & 20M/ngày (múi giờ `Asia/Ho_Chi_Minh`) và cụm Ví trung gian (*mule*) dùng chung thiết bị/IP — dấu hiệu đáng ngờ theo Luật PCRT 2022 Điều 29 & TT 40/2024 Phụ lục 01. |
| **Thuần thuật toán (Không dùng LLM)** | `lib/agents/retriever.ts` | Chỉ mục **BM25** chuẩn hóa tiếng Việt trên 13 chunk pháp lý & bảo hiểm trong `data/vnPolicies.json`. |
| **Thuần thuật toán (Không dùng LLM)** | `lib/pii/redactor.ts`, `lib/immunity/service.ts` | Che mờ CCCD 12 số, SĐT, số dư; bọc `<untrusted_user_content>`; hậu kiểm cứng `>= 2` nguồn độc lập (`400`), tách vai trò Maker ≠ Checker (`403`), TTL & `AuditLog`. |
| **Runtime LLM** | `Vision Scanner` + `4+1 War-Room Agents` | Phân tích ảnh chat/biên lai/link `.apk` (Multimodal Vision), giải thích ấm áp cho người cao tuổi, tranh biện 4 Agent song song (`Promise.allSettled` + SSE) gồm `False-Positive Defender`, và soạn **Thẻ Bàn giao CSKH Thấu cảm**. |

---

## 3. Khai báo Dữ liệu, Xóa ảnh tải lên & Điều khoản API

### Dữ liệu Tổng hợp 100% & Tài liệu Công khai
- Toàn bộ hồ sơ `CASE-01` (Bác Hùng), `CASE-02` (Minh Anh), `CASE-03` (Chị Hoa) và 3 ảnh mẫu trong `public/demo-images/` (`zalo-fake-police.png`, `vneid-apk.png`, `livestream-merchant.png`) đều là **`MẪU MÔ PHỎNG`** tổng hợp 100% — **không** chứa CCCD thật, số điện thoại thật hay tài khoản ngân hàng thật.
- Kho tri thức `data/vnPolicies.json` (13 chunk) tổng hợp từ văn bản pháp luật công khai và điều khoản sản phẩm, đã chuẩn hóa theo [RESEARCH_LEGAL.md](./docs/RESEARCH_LEGAL.md) (ghi rõ QĐ 2345/QĐ-NHNN đã bị bãi bỏ bởi QĐ 2872/QĐ-NHNN từ 01/01/2025, ngưỡng sinh trắc học 10M/20M thuộc TT 50/2024 sửa bởi TT 77/2025, và TT 53/2026 ghi rõ là nguồn báo chí chưa xác minh điều khoản).

### Chính sách Xử lý & Xóa Ảnh Tải lên
- Ảnh tải lên (`JPG`/`PNG`/`WEBP`, tối đa 5 MB, kiểm tra magic bytes) được giữ **trong bộ nhớ RAM theo từng request** để gửi trực tiếp tới nhà cung cấp LLM đang cấu hình (**FPT AI Factory**, **Gemini API** hoặc **AWS Bedrock**) phục vụ phân tích thời gian thực.
- **Không lưu ảnh gốc vào CSDL** (`ScanSession` chỉ lưu `imageHash` và JSON kết quả đã ẩn PII), **không** chuyển tiếp ảnh gốc sang màn hình Người giám hộ hay `B2E War-Room` (`contains_raw_image: false`), kèm hàm `purgeExpiredUploads()` (TTL mặc định 2 giờ) dọn tệp tạm nếu có.

### Điều khoản Dữ liệu: Gemini API Free Tier vs Paid Tier / AWS Bedrock
- **Gemini API Free Tier (ngoài khu vực EEA/UK/CH, bao gồm Việt Nam):** Theo điều khoản Google Gemini API, dữ liệu đầu vào và hình ảnh gửi qua **Free Tier** có thể được Google sử dụng để cải thiện sản phẩm và có thể qua rà soát thủ công. **Khuyến cáo Ban Giám Khảo tuyệt đối KHÔNG tải ảnh CCCD, giấy tờ tùy thân hoặc sao kê ngân hàng thật khi demo trên Free Tier.**
- **Gemini API Paid Tier (đã bật Billing) & AWS Bedrock:** Dữ liệu đầu vào không được dùng để huấn luyện mô hình nền tảng theo điều khoản doanh nghiệp/trả phí của nhà cung cấp.
- **Chuyển dữ liệu xuyên biên giới (trung thực):** MVP gửi ảnh người dùng tải lên tới LLM đặt **ngoài Việt Nam**; Ẩn PII chạy phía máy chủ **sau** bước Vision. Theo Luật 91/2025 Điều 20.1.c đây là chuyển dữ liệu xuyên biên giới. Điều kiện trước khi dùng với người dùng thật (Lộ trình): hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới & DPIA (Điều 20.2, 21.1), thỏa thuận bên xử lý cấm huấn luyện, và Ẩn PII trên thiết bị.

---

## 4. Tài sản có sẵn, Thư viện Mã nguồn mở & Công cụ AI Đã dùng

### Tài sản có sẵn (Pre-existing Assets)
- **Nhận diện nhóm `ShiftGen`:** `docs/brand/shiftgen-logo.jpg`, `public/shiftgen-mark.png` (biểu tượng đội thi có sẵn của nhóm).
- **Bộ chữ (Typography):** `Be Vietnam Pro`, `JetBrains Mono`, `Geist Mono` qua Google Fonts (giấy phép mã nguồn mở **SIL Open Font License 1.1**).
- **Biểu tượng giao diện (Icons):** Bộ icon vector từ `lucide-react` (giấy phép **ISC**).
- *Tài sản nhóm tự tạo mới 100% cho cuộc thi:* Toàn bộ 3 ảnh chat/APK mô phỏng (`public/demo-images/*`), bộ kịch bản `data/scenarios.ts`, dữ liệu `data/replays/*`, sơ đồ kiến trúc `docs/diagrams/*` và toàn bộ mã nguồn ứng dụng.

### Thư viện Mã nguồn mở (từ `package.json`)
| Thư viện | Phiên bản (`package.json`) | Giấy phép (License) | Vai trò |
| :--- | :---: | :---: | :--- |
| `next` | `^15.3.0` | MIT | Full-stack App Router & Route Handlers |
| `react` / `react-dom` | `^19.0.0` | MIT | Giao diện người dùng đa không gian làm việc |
| `@prisma/client` / `prisma` | `^6.6.0` | Apache-2.0 | ORM song song SQLite (dev) & PostgreSQL (prod) |
| `@xyflow/react` | `^12.5.0` | MIT | Đồ thị dòng tiền & cụm ví *mule* tương tác |
| `zod` | `^3.24.2` | MIT | Khóa chặt schema đầu vào & JSON đầu ra của Agent |
| `tailwindcss` / `postcss` / `autoprefixer` | `^3.4.17` / `^8.5.0` / `^10.4.21` | MIT | Hệ thống thiết kế Light (B2C) & Dark (War-Room) |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^2.6.0` | MIT | Tiện ích gộp class CSS |
| `lucide-react` | `^0.487.0` | ISC | Bộ icon giao diện |
| `@aws-sdk/client-bedrock-runtime` | `^3.780.0` | Apache-2.0 | Kết nối AWS Bedrock Converse API (`ap-southeast-1`) |
| `typescript` / `tsx` / `vitest` / `playwright` | `^5.8.2` / `^4.19.3` / `^3.1.1` / `^1.65.1` | Apache-2.0 / MIT | Typecheck, seed script, kiểm thử tự động & xuất PDF |

### Công cụ AI Đã dùng (Minh bạch Phát triển)
- **AI hỗ trợ lập trình:**
  - **Antigravity** (hỗ trợ kiến trúc, triển khai Waves 0–4, kiểm định & thiết kế sơ đồ).
  - **Claude Code** (2 thành viên khác trong nhóm sử dụng để phát triển các tính năng Wave 5, rà soát pháp lý, giao diện `/story` và xuất slide pitch).
- **Kỹ năng kỷ luật mã nguồn:** Áp dụng **`ponytail` skill** (MIT) và **`diagram-design` skill** (MIT) để giữ mã nguồn gọn, chống phình to và ghi nhận giới hạn MVP qua `// shortcut:`.

---

## 5. Ranh giới Minh bạch (Chạy thật vs Mô phỏng) & Giới hạn đã biết (`/ponytail-debt`)

### Bảng Ranh giới Chạy thật vs Mô phỏng
| Thành phần | Trạng thái trong Live MVP | Ghi chú minh bạch |
| :--- | :--- | :--- |
| Quét ảnh chat/APK bằng Multimodal Vision LLM & ẩn PII | **Chạy thật 100% online** | Gọi Gemini/Bedrock/OpenAI thật; trả `503` nếu thiếu key. |
| 4 AI Agents song song (`Promise.allSettled` + SSE) & `FP_Defender` | **Chạy thật 100% online** | Validate Zod v3 + 1x sửa định dạng + hậu kiểm cứng `>= 2` nguồn. |
| Đồ thị Chia nhỏ giao dịch, Maker–Checker (`403`/`400`), TTL, Khiếu nại (Checker khác xét) & Thu hồi, Giải phóng tạm giữ | **Chạy thật 100% online** | Lưu CSDL thật theo `demoSessionId`; Thu hồi gỡ cảnh báo ngay ở B2C, hồ sơ điều tra được giữ. |
| Cổng chuyển tiền ngân hàng, API SIMO NHNN thật, lịch sử 3 nhân vật | **Mô phỏng (`MẪU MÔ PHỎNG`)** | Dữ liệu tổng hợp 100% phục vụ kiểm chứng luồng khép kín. |

### Giới hạn đã biết — Ponytail Debt Ledger (`/ponytail-debt`)
9 mục kiến trúc tiêu biểu (trên tổng số **25** ghi chú `// shortcut:` trong toàn kho mã nguồn qua `git grep -nE '(#|//|/[*]) ?(shortcut|ponytail):'`, loại trừ dòng hướng dẫn trong `AGENTS.md`):

1. `components/b2c/labels.ts:23` — Minh Anh dùng chung khe đồng ý `USER_B2C_NEW` trong enum `PersonaId` đã đóng băng. **Ceiling:** dùng chung consent slot. **Upgrade:** mở rộng enum nếu cần tách dòng đồng ý riêng cho Minh Anh.
2. `lib/agents/retriever.ts:54` — Chỉ mục BM25 trong bộ nhớ RAM trên 13 chunk tĩnh `vnPolicies.json`. **Ceiling:** phù hợp tập chính sách nhỏ tĩnh. **Upgrade:** nâng cấp lên hybrid vector + BM25 khi kho văn bản vượt ~500 chunk.
3. `lib/graph/analyzer.ts:12` — Dải ngưỡng cố định 70%–100% của hạn mức sinh trắc học 10 triệu cho hành vi chia nhỏ gần ngưỡng. **Ceiling:** ngưỡng phần trăm tĩnh. **Upgrade:** chuyển sang ngưỡng phân vị thích ứng theo lịch sử giao dịch.
4. `lib/graph/analyzer.ts:578` — Bố cục lưới cột cố định cho đồ thị suy ra từ giao dịch. **Ceiling:** phù hợp đồ thị nhỏ gọn. **Upgrade:** chuyển sang `dagre`/`elk` nếu đồ thị vượt ~50 nút.
5. `lib/graph/analyzer.ts:850` — Trọng số rủi ro cộng dồn heuristic (smurfing/mule/cyber). **Ceiling:** trọng số chuyên gia chưa hiệu chỉnh thống kê. **Upgrade:** hiệu chỉnh trên tập dữ liệu gian lận lịch sử có nhãn khi lên production.
6. `lib/immunity/service.ts:134` — Giới hạn truy vấn `AuditLog` ở 100 bản ghi mới nhất mỗi phiên. **Ceiling:** tối đa 100 dòng/lần đọc. **Upgrade:** thêm phân trang cursor nếu phiên chạy dài ngày.
7. `lib/rate-limit.ts:30` — Bộ đếm sliding-window bằng `Map` trong bộ nhớ RAM. **Ceiling:** chỉ đồng bộ trên 1 instance server. **Upgrade:** chuyển sang Redis/Upstash khi chạy nhiều instance.
8. `lib/rate-limit.ts:99` — Bộ đếm Prisma fixed-window thay cho sorted set sliding-window trên Redis. **Ceiling:** làm tròn theo cửa sổ cố định. **Upgrade:** dùng Upstash Redis khi chịu tải burst đa vùng.
9. `lib/session/shield.ts:398` — Bộ luật regex/từ khóa chỉ kích hoạt **DUY NHẤT** khi chạm ngưỡng `DAILY_LLM_CALL_LIMIT`; các lượt quét bình thường luôn gọi `LLMProvider` thật. **Ceiling:** chỉ là chốt an toàn khi hết quota demo ngày. **Upgrade:** nâng hoặc gỡ giới hạn `DAILY_LLM_CALL_LIMIT` với billing trả phí.

**Tổng cộng:** `25 markers, 0 with no trigger` trên toàn kho mã nguồn (Waves 0–5, gồm các ghi chú demo persona, replay, ngày làm việc và rate-limit).

---

## 6. Bảng Số đo Độ trễ Thực tế (Honest Telemetry)

> **Cam kết trung thực:** Không công bố các chỉ số chưa đo đạc (`"99%"`, `"<1s"`, `"<15s"`). Chi tiết đầy đủ xem tại [docs/MEASURED_LATENCIES.md](./docs/MEASURED_LATENCIES.md).

### Số đo thật trên bản deploy (10 lượt mỗi luồng, đo 24/11/2026 giờ VN / 23/11/2026 UTC)
| Luồng | `model_used` | min / median / max |
| :--- | :--- | :--- |
| Lượt quét ảnh CASE-01 | `gemma-4-31B-it` | 3387 ms / 3516 ms / 3689 ms |
| War-Room 4 agent CASE-01 | `Qwen3.8-27B` | 6261 ms / 7357 ms / 8551 ms |

Đo bằng `node scripts/measure-latency.mjs`; từng lượt, cách loại lượt phát lại và cách đo lại ở [docs/MEASURED_LATENCIES.md](./docs/MEASURED_LATENCIES.md). Đây là số đo, không phải cam kết.
