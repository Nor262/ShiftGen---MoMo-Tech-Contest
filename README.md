# MoMo TrustLoop v2 — Vòng Phòng vệ Niềm tin Số Khép kín (B2C → Người giám hộ → B2E)

> **MoMo Tech Contest 2026** — *"Imagine the Future Workspace (Human Centered. AI Powered)"*
> Toàn bộ dữ liệu kịch bản và nhân vật trong bản demo đều là **`MẪU MÔ PHỎNG`** tổng hợp 100%, cô lập theo từng phiên chấm thi (`demoSessionId`).
> **Định vị:** TrustLoop là lớp **bổ sung** trên SIMO của NHNN và các lớp bảo vệ MoMo đang có (cảnh báo tài khoản nhận tiền, Bảo hiểm An toàn chuyển tiền): bắt kịch bản thao túng ở **Phút 00** khi tài khoản nhận còn "sạch", và thêm quy trình Khiếu nại/người thật xem lại minh bạch. Sinh trắc học chứng minh đúng người đang thao tác, không chứng minh người đó không bị thao túng. Chi tiết: [Ý tưởng Sản phẩm](./docs/PRODUCT_IDEA.md); thuật ngữ: [GLOSSARY.md](./GLOSSARY.md).

---

## 1. Giới thiệu & Hướng dẫn Chạy (Live URL, Local, PostgreSQL/Vercel & Docker)

### Live URL (Production)
- **Public Demo:** [`https://momo-trustloop.vercel.app`](https://momo-trustloop.vercel.app)
- **Hạ tầng triển khai (Kế hoạch — bắt buộc cho cuộc thi):** chuyển sang **AWS Sandbox** — `LLM_BACKEND=bedrock`, Docker (mục "Chạy 1 Lệnh với Docker") trên EC2/Amplify `ap-southeast-1`; bản Vercel bên dưới giữ làm dự phòng.
- **Hạ tầng hiện tại:** Vercel (`sin1` Singapore, Fluid Compute `maxDuration` up to `300s`; route `/api/shield/scan` đặt `maxDuration = 60`, `/api/warroom/cases/[caseId]/investigate` đặt `maxDuration = 120`) + Supabase PostgreSQL (`ap-southeast-1`).
- **Lưu ý Supabase Free Tier (Keep-Alive):** Supabase Free tự tạm dừng (*auto-pause*) sau 7 ngày không có truy vấn. Khuyến nghị ping định kỳ endpoint kiểm tra sức khỏe `GET /api/health` (trả HTTP `200` kèm trạng thái DB & LLM) để giữ kết nối luôn sẵn sàng.
- **Đồng bộ 2 thiết bị cho BGK:** Mở cùng URL với tham số `?session=momo-final` trên cả Laptop và Điện thoại.
- **Tài liệu đi kèm:** [Hướng dẫn Demo 1 Trang (3 phút)](./docs/ONE_PAGE_GUIDE.md) | [Bảng Số đo Độ trễ Thực tế](./docs/MEASURED_LATENCIES.md) | [Ý tưởng Sản phẩm](./docs/PRODUCT_IDEA.md) | [Đặc tả Yêu cầu](./docs/SPEC_REQUIREMENTS.md) | [Đặc tả Thiết kế](./docs/SPEC_DESIGN.md) | [Căn cứ pháp lý](./docs/RESEARCH_LEGAL.md) | [Số liệu vấn đề](./docs/RESEARCH_PROBLEM.md).

### Chạy Local (SQLite — Phát triển & Kiểm thử nhanh)
```bash
npm install
cp .env.example .env   # Điền GEMINI_API_KEY (hoặc OPENAI_API_KEY / AWS Bedrock)
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
- **Primary (`LLM_BACKEND=gemini`):** Google Gemini REST API (`gemini-2.5-flash` cho cả Vision & Reasoning).
- **AWS Bedrock (`LLM_BACKEND=bedrock`, `ap-southeast-1`):** `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`) với **Amazon Nova Pro** (`apac.amazon.nova-pro-v1:0`) cho Vision và **Claude Sonnet** (`apac.anthropic.claude-sonnet-4-20250514-v1:0`) cho 4+1 Agents, tùy chọn `BEDROCK_GUARDRAIL_ID`.
- **Fallback (`LLM_FALLBACK_BACKEND=openai`):** Bất kỳ endpoint OpenAI-compatible (`/chat/completions`).
- **Bảo vệ hạn mức & Trung thực:** Thiếu API key trả HTTP `503` (`LLM_NOT_CONFIGURED`). Khi chạm ngưỡng `DAILY_LLM_CALL_LIMIT` (mặc định `100` lượt/ngày), hệ thống ghi nhận rõ trạng thái fallback thay vì âm thầm giả mạo AI.

### Phân tách Thuật toán Thuần (Deterministic) vs Nhiệm vụ LLM
| Lớp xử lý | Cơ chế | Trách nhiệm cụ thể |
| :--- | :--- | :--- |
| **Thuần thuật toán (Không dùng LLM)** | `lib/graph/analyzer.ts` | Phát hiện Chia nhỏ giao dịch (*smurfing*) dưới ngưỡng xác thực sinh trắc học 10M/lần & 20M/ngày (múi giờ `Asia/Ho_Chi_Minh`) và cụm Ví trung gian (*mule*) dùng chung thiết bị/IP — dấu hiệu đáng ngờ theo Luật PCRT 2022 Điều 29 & TT 40/2024 Phụ lục 01. |
| **Thuần thuật toán (Không dùng LLM)** | `lib/agents/retriever.ts` | Chỉ mục **BM25** chuẩn hóa tiếng Việt trên 12 chunk pháp lý & bảo hiểm trong `data/vnPolicies.json`. |
| **Thuần thuật toán (Không dùng LLM)** | `lib/pii/redactor.ts`, `lib/immunity/service.ts` | Che mờ CCCD 12 số, SĐT, số dư; bọc `<untrusted_user_content>`; hậu kiểm cứng `>= 2` nguồn độc lập (`400`), tách vai trò Maker ≠ Checker (`403`), TTL & `AuditLog`. |
| **Runtime LLM** | `Vision Scanner` + `4+1 War-Room Agents` | Phân tích ảnh chat/biên lai/link `.apk` (Multimodal Vision), giải thích ấm áp cho người cao tuổi, tranh biện 4 Agent song song (`Promise.allSettled` + SSE) gồm `False-Positive Defender`, và soạn **Thẻ Bàn giao CSKH Thấu cảm**. |

---

## 3. Khai báo Dữ liệu, Xóa ảnh tải lên & Điều khoản API

### Dữ liệu Tổng hợp 100% & Tài liệu Công khai
- Toàn bộ hồ sơ `CASE-01` (Bác Hùng), `CASE-02` (Minh Anh), `CASE-03` (Chị Hoa) và 3 ảnh mẫu trong `public/demo-images/` (`zalo-fake-police.png`, `vneid-apk.png`, `livestream-merchant.png`) đều là **`MẪU MÔ PHỎNG`** tổng hợp 100% — **không** chứa CCCD thật, số điện thoại thật hay tài khoản ngân hàng thật.
- Kho tri thức `data/vnPolicies.json` (12 chunk) tổng hợp từ văn bản pháp lý công khai và điều khoản sản phẩm. **Đã biết sai lệch:** một số chunk còn dẫn QĐ 2345/QĐ-NHNN (đã bị bãi bỏ bởi QĐ 2872/QĐ-NHNN từ 01/01/2025) và gán cho TT 53/2026 nội dung chưa xác minh. *Kế hoạch:* làm sạch kho để chỉ còn tóm tắt văn bản pháp luật theo [RESEARCH_LEGAL.md](./docs/RESEARCH_LEGAL.md).

### Chính sách Xử lý & Xóa Ảnh Tải lên
- Ảnh tải lên (`JPG`/`PNG`/`WEBP`, tối đa 5 MB, kiểm tra magic bytes) được giữ **trong bộ nhớ RAM theo từng request** để gửi trực tiếp tới nhà cung cấp LLM đang cấu hình (`Gemini API` hoặc `AWS Bedrock`) phục vụ phân tích thời gian thực.
- **Không lưu ảnh gốc vào CSDL** (`ScanSession` chỉ lưu `imageHash` và JSON kết quả đã ẩn PII), **không** chuyển tiếp ảnh gốc sang màn hình Người giám hộ hay `B2E War-Room` (`contains_raw_image: false`), kèm hàm `purgeExpiredUploads()` (TTL mặc định 2 giờ) dọn tệp tạm nếu có.

### Điều khoản Dữ liệu: Gemini API Free Tier vs Paid Tier / AWS Bedrock
- **Gemini API Free Tier (ngoài khu vực EEA/UK/CH, bao gồm Việt Nam):** Theo điều khoản Google Gemini API, dữ liệu đầu vào và hình ảnh gửi qua **Free Tier** có thể được Google sử dụng để cải thiện sản phẩm và có thể qua rà soát thủ công. **Khuyến cáo Ban Giám Khảo tuyệt đối KHÔNG tải ảnh CCCD, giấy tờ tùy thân hoặc sao kê ngân hàng thật khi demo trên Free Tier.**
- **Gemini API Paid Tier (đã bật Billing) & AWS Bedrock:** Dữ liệu đầu vào không được dùng để huấn luyện mô hình nền tảng theo điều khoản doanh nghiệp/trả phí của nhà cung cấp.
- **Chuyển dữ liệu xuyên biên giới (trung thực):** MVP gửi ảnh người dùng tải lên tới LLM đặt **ngoài Việt Nam**; Ẩn PII chạy phía máy chủ **sau** bước Vision. Theo Luật 91/2025 Điều 20.1.c đây là chuyển dữ liệu xuyên biên giới. Điều kiện trước khi dùng với người dùng thật (Lộ trình): hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới & DPIA (Điều 20.2, 21.1), thỏa thuận bên xử lý cấm huấn luyện, và Ẩn PII trên thiết bị.

---

## 4. Thư viện Mã nguồn mở & Công cụ AI Hỗ trợ Lập trình

### Thư viện Mã nguồn mở (từ `package.json`)
| Thư viện | Phiên bản (`package.json`) | Giấy phép (License) | Vai trò |
| :--- | :---: | :---: | :--- |
| `next` | `^15.3.0` | MIT | Full-stack App Router & Route Handlers |
| `react` / `react-dom` | `^19.0.0` | MIT | Giao diện người dùng 3 không gian làm việc |
| `@prisma/client` / `prisma` | `^6.6.0` | Apache-2.0 | ORM song song SQLite (dev) & PostgreSQL (prod) |
| `@xyflow/react` | `^12.5.0` | MIT | Đồ thị dòng tiền & cụm ví *mule* tương tác |
| `zod` | `^3.24.2` | MIT | Khóa chặt schema đầu vào & JSON đầu ra của Agent |
| `tailwindcss` | `^3.4.17` | MIT | Hệ thống thiết kế Light (B2C) & Dark (War-Room) |
| `lucide-react` | `^0.487.0` | ISC | Bộ icon giao diện |
| `@aws-sdk/client-bedrock-runtime` | `^3.780.0` | Apache-2.0 | Kết nối AWS Bedrock Converse API (`ap-southeast-1`) |
| `vitest` | `^3.1.1` | MIT | Kiểm thử đơn vị & tích hợp E2E |

### Công cụ AI Hỗ trợ Lập trình (Minh bạch Phát triển)
- **Điều phối đa tác nhân:** Antigravity Multi-Agent Swarm (`Orchestrator (Neon)`, `Gemini 4 Neon`, `Gemini 4 Hydrogen`) chia theo Waves 0–4 với ranh giới sở hữu thư mục nghiêm ngặt.
- **Kỹ năng kỷ luật mã nguồn:** Áp dụng **`ponytail` skill** (level `full`, giấy phép **MIT**, từ cấu hình cục bộ `~/.gemini/config/skills/ponytail/SKILL.md`) xuyên suốt Waves 0–4 để giữ mã nguồn gọn, không phình to (*anti-bloat*) và ghi nhận mọi giới hạn MVP qua từ khóa `// shortcut:`.

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
Kết quả quét toàn bộ kho mã nguồn bằng lệnh `git grep -nE '(#|//|/[*]) ?(shortcut|ponytail):'` (loại trừ dòng hướng dẫn cú pháp trong `AGENTS.md:9`):

1. `components/b2c/labels.ts:22` — Minh Anh dùng chung khe đồng ý `USER_B2C_NEW` trong enum `PersonaId` đã đóng băng. **Ceiling:** dùng chung consent slot. **Upgrade:** mở rộng enum nếu cần tách dòng đồng ý riêng cho Minh Anh.
2. `lib/agents/retriever.ts:54` — Chỉ mục BM25 trong bộ nhớ RAM trên 12 chunk tĩnh `vnPolicies.json`. **Ceiling:** phù hợp tập chính sách nhỏ tĩnh. **Upgrade:** nâng cấp lên hybrid vector + BM25 khi kho văn bản vượt ~500 chunk.
3. `lib/graph/analyzer.ts:12` — Dải ngưỡng cố định 70%–100% của hạn mức sinh trắc học 10 triệu cho hành vi chia nhỏ gần ngưỡng. **Ceiling:** ngưỡng phần trăm tĩnh. **Upgrade:** chuyển sang ngưỡng phân vị thích ứng theo lịch sử giao dịch.
4. `lib/graph/analyzer.ts:578` — Bố cục lưới cột cố định cho đồ thị suy ra từ giao dịch. **Ceiling:** phù hợp đồ thị nhỏ gọn. **Upgrade:** chuyển sang `dagre`/`elk` nếu đồ thị vượt ~50 nút.
5. `lib/graph/analyzer.ts:850` — Trọng số rủi ro cộng dồn heuristic (smurfing/mule/cyber). **Ceiling:** trọng số chuyên gia chưa hiệu chỉnh thống kê. **Upgrade:** hiệu chỉnh trên tập dữ liệu gian lận lịch sử có nhãn khi lên production.
6. `lib/immunity/service.ts:126` — Giới hạn truy vấn `AuditLog` ở 100 bản ghi mới nhất mỗi phiên. **Ceiling:** tối đa 100 dòng/lần đọc. **Upgrade:** thêm phân trang cursor nếu phiên chạy dài ngày.
7. `lib/rate-limit.ts:30` — Bộ đếm sliding-window bằng `Map` trong bộ nhớ RAM. **Ceiling:** chỉ đồng bộ trên 1 instance server. **Upgrade:** chuyển sang Redis/Upstash khi chạy nhiều instance.
8. `lib/rate-limit.ts:99` — Bộ đếm Prisma fixed-window thay cho sorted set sliding-window trên Redis. **Ceiling:** làm tròn theo cửa sổ cố định. **Upgrade:** dùng Upstash Redis khi chịu tải burst đa vùng.
9. `lib/session/shield.ts:394` — Bộ luật regex/từ khóa chỉ kích hoạt **DUY NHẤT** khi chạm ngưỡng `DAILY_LLM_CALL_LIMIT`; các lượt quét bình thường luôn gọi `LLMProvider` thật. **Ceiling:** chỉ là chốt an toàn khi hết quota demo ngày. **Upgrade:** nâng hoặc gỡ giới hạn `DAILY_LLM_CALL_LIMIT` với billing trả phí.

**Tổng cộng:** `9 markers, 0 with no trigger.`

---

## 6. Bảng Số đo Độ trễ Thực tế (Honest Telemetry)

> **Cam kết trung thực:** Không công bố các chỉ số chưa đo đạc (`"99%"`, `"<1s"`, `"<15s"`). Chi tiết đầy đủ xem tại [docs/MEASURED_LATENCIES.md](./docs/MEASURED_LATENCIES.md).

### Số đo Thuần thuật toán Cục bộ (Đo bằng `performance.now()`, trung bình 100 vòng lặp)
| Thành phần | Độ trễ đo được |
| :--- | :---: |
| `redactText()` — Ẩn PII & bọc thẻ chống prompt injection (`lib/pii/redactor.ts`) | **`0.027 ms`** |
| `retrievePolicyChunks()` — Truy xuất BM25 trên 12 chunk `vnPolicies.json` (`lib/agents/retriever.ts`) | **`0.123 ms`** |
| `analyzeCaseGraph()` — Phân tích đồ thị Chia nhỏ giao dịch & Ví trung gian (`lib/graph/analyzer.ts`) | **`0.409 ms`** |

### Số đo Live LLM (`Gemini API` / `AWS Bedrock`)
- **Trạng thái môi trường build hiện tại:** `GEMINI_API_KEY` chưa được cấu hình (`UNSET`), nên các ô đo thời gian gọi LLM mạng ngoài (`Vision Scanner` và `4+1 War-Room Agents`) được giữ ở trạng thái **`[Chờ đo thực tế khi cấu hình GEMINI_API_KEY]`** trong [docs/MEASURED_LATENCIES.md](./docs/MEASURED_LATENCIES.md) để điền đúng số đo `measured_latency_ms` & `model_used` trước khi xuất PDF Slide 9.
