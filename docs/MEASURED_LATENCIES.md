# MoMo TrustLoop v2 — Bảng Số đo Độ trễ Thực tế (Slide 9 Telemetry Sheet)

> **Nguyên tắc trung thực:** Tuyệt đối **không** ghi các cam kết chưa đo đạc (như `<1s`, `99%`, `<15s`). Mọi số đo bên dưới được thu trực tiếp từ `performance.now()` (`measured_latency_ms`).

---

## 1. Số đo Thuần thuật toán Cục bộ (Đã đo trực tiếp trên Node 22)

Đo trung bình trên **100 vòng lặp** bằng `node:perf_hooks` (`performance.now()`) trên mã nguồn nhánh `wave4/docs` (không gọi mạng ngoài):

| Thành phần | Hàm / Module | Độ trễ trung bình đo được | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Ẩn PII & Bọc thẻ chống Prompt Injection** | `redactText()` — `lib/pii/redactor.ts` | **`0.027 ms`** | Ẩn CCCD 12 số, SĐT, số dư ví, bọc `<untrusted_user_content>` |
| **Truy xuất Chính sách Pháp lý (BM25 RAG)** | `retrievePolicyChunks()` — `lib/agents/retriever.ts` | **`0.123 ms`** | Chỉ mục BM25 trên 12 chunk `data/vnPolicies.json` |
| **Phân tích Đồ thị Chia nhỏ giao dịch & Ví trung gian** | `analyzeCaseGraph()` — `lib/graph/analyzer.ts` | **`0.409 ms`** | Phát hiện chia nhỏ 4×9,5M dưới ngưỡng xác thực sinh trắc học (UTC+7) & thiết bị dùng chung |

---

## 2. Mẫu Bảng Đo 10 Lần Chạy Thực tế Live LLM (Dành cho Slide 9 PDF)

> **Trạng thái hiện tại trong môi trường build:** `GEMINI_API_KEY` chưa được nạp (`UNSET`), do đó phần độ trễ gọi LLM mạng ngoài **chưa đo** và được để trống có chủ đích. Khi cấu hình `GEMINI_API_KEY` (hoặc AWS Bedrock), chạy 10 lượt trên Live UI / `curl` và điền đúng giá trị `measured_latency_ms` & `model_used` trả về từ API trước khi xuất PDF Slide 9.

### 2.1. Endpoint `POST /api/shield/scan` (`gemini-2.5-flash` Vision)

| Lượt đo | Kịch bản | `model_used` | `measured_latency_ms` | `risk_score` | Ghi chú |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `CASE-01` (Bác Hùng) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 2 | `CASE-01` (Bác Hùng) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 3 | `CASE-01` (Bác Hùng) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 4 | `CASE-02` (Minh Anh APK) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 5 | `CASE-02` (Minh Anh APK) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 6 | `CASE-02` (Minh Anh APK) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 7 | `CASE-03` (Chị Hoa) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 8 | `CASE-03` (Chị Hoa) | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 9 | Ảnh tự tải lên #1 | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| 10 | Ảnh tự tải lên #2 | `[Điền từ API]` | `[Chờ đo]` | `[Chờ đo]` | |
| **Trung bình / P95** | — | — | **`[Chờ đo]`** | — | Tính sau khi đủ 10 lượt |

### 2.2. Endpoint `POST /api/warroom/cases/:caseId/investigate` (4+1 Agents Parallel + SSE)

| Lượt đo | Kịch bản | `GraphTracer` (ms) | `EvidenceCorrelator` (ms) | `ComplianceRAG` (ms) | `FP_Defender` (ms) | `Synthesizer` (ms) | `Total War-Room` (ms) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `CASE-01` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 2 | `CASE-01` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 3 | `CASE-01` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 4 | `CASE-02` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 5 | `CASE-02` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 6 | `CASE-03` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 7 | `CASE-03` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 8 | `CASE-03` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 9 | `CASE-01` (SSE) | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| 10 | `CASE-03` (SSE) | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` | `[Chờ đo]` |
| **Trung bình / P95** | — | **`[Chờ đo]`** | **`[Chờ đo]`** | **`[Chờ đo]`** | **`[Chờ đo]`** | **`[Chờ đo]`** | **`[Chờ đo]`** |
