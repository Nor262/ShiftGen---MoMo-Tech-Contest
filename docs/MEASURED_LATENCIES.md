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

## 2. Độ trễ thật của 2 luồng AI trên bản deploy (Slide 9)

Đo trên `https://momo-trustloop.vercel.app` (Vercel, region `sin1`; LLM: FPT AI Factory), **10 lượt mỗi luồng**, mỗi lượt một phiên mới, từ 2026-11-23T18:46:56.035Z đến 2026-11-23T18:48:47.204Z (UTC).
Chỉ tính lượt chạy thật: lượt phát lại (`model_used` chứa "(phát lại") và lượt lỗi bị loại — lần đo này loại **0** lượt phát lại, **0** lượt lỗi.

| Luồng | `model_used` | Lượt hợp lệ | min | median | max | Thời gian phía client (min / median / max) |
| :--- | :--- | :---: | ---: | ---: | ---: | :--- |
| Lượt quét ảnh CASE-01 (`POST /api/shield/scan`) | `gemma-4-31B-it` | 10/10 | **3.332 ms** | **3.466 ms** | **3.682 ms** | 3.529 ms / 3.741 ms / 4.497 ms |
| War-Room 4 agent CASE-01 (`POST …/investigate`) | `Qwen3.8-27B` | 10/10 | **6.477 ms** | **6.899 ms** | **9.691 ms** | 6.975 ms / 7.384 ms / 9.947 ms |

* Cột min/median/max là `measured_latency_ms` (quét) và `debate.total_latency_ms` (War-Room) do máy chủ đo bằng `performance.now()`.
* Cột client là thời gian một lần gọi HTTP đo từ máy chạy script (gồm mạng tới Vercel), chỉ để tham khảo.
* Đây là số đo của một lần chạy, không phải cam kết hiệu năng. Model, region và tải của nhà cung cấp đổi thì số đổi; đo lại trước khi xuất slide.

### 2.1. Từng lượt — Lượt quét

| # | Thời điểm (UTC) | `model_used` | measured_latency_ms | Client | Mức rủi ro |
| :---: | :--- | :--- | ---: | ---: | :--- |
| 1 | 2026-11-23T18:46:56.035Z | `gemma-4-31B-it` | 3.332 ms | 4.496 ms | CRITICAL |
| 2 | 2026-11-23T18:47:08.806Z | `gemma-4-31B-it` | 3.485 ms | 3.746 ms | CRITICAL |
| 3 | 2026-11-23T18:47:20.338Z | `gemma-4-31B-it` | 3.682 ms | 4.497 ms | CRITICAL |
| 4 | 2026-11-23T18:47:31.613Z | `gemma-4-31B-it` | 3.580 ms | 3.763 ms | CRITICAL |
| 5 | 2026-11-23T18:47:42.603Z | `gemma-4-31B-it` | 3.554 ms | 3.735 ms | CRITICAL |
| 6 | 2026-11-23T18:47:53.402Z | `gemma-4-31B-it` | 3.605 ms | 3.798 ms | CRITICAL |
| 7 | 2026-11-23T18:48:03.907Z | `gemma-4-31B-it` | 3.345 ms | 3.529 ms | CRITICAL |
| 8 | 2026-11-23T18:48:15.328Z | `gemma-4-31B-it` | 3.412 ms | 3.637 ms | CRITICAL |
| 9 | 2026-11-23T18:48:28.805Z | `gemma-4-31B-it` | 3.358 ms | 3.530 ms | CRITICAL |
| 10 | 2026-11-23T18:48:40.093Z | `gemma-4-31B-it` | 3.447 ms | 3.656 ms | CRITICAL |

### 2.2. Từng lượt — War-Room

| # | Thời điểm (UTC) | `model_used` | total_latency_ms | Client |
| :---: | :--- | :--- | ---: | ---: |
| 1 | 2026-11-23T18:47:05.060Z | `Qwen3.8-27B` | 7.964 ms | 9.024 ms |
| 2 | 2026-11-23T18:47:15.840Z | `Qwen3.8-27B` | 6.477 ms | 7.034 ms |
| 3 | 2026-11-23T18:47:27.849Z | `Qwen3.8-27B` | 6.661 ms | 7.511 ms |
| 4 | 2026-11-23T18:47:38.868Z | `Qwen3.8-27B` | 6.975 ms | 7.256 ms |
| 5 | 2026-11-23T18:47:49.598Z | `Qwen3.8-27B` | 6.727 ms | 6.995 ms |
| 6 | 2026-11-23T18:48:00.376Z | `Qwen3.8-27B` | 6.658 ms | 6.975 ms |
| 7 | 2026-11-23T18:48:11.691Z | `Qwen3.8-27B` | 7.502 ms | 7.784 ms |
| 8 | 2026-11-23T18:48:25.275Z | `Qwen3.8-27B` | 9.691 ms | 9.947 ms |
| 9 | 2026-11-23T18:48:36.436Z | `Qwen3.8-27B` | 7.356 ms | 7.630 ms |
| 10 | 2026-11-23T18:48:47.204Z | `Qwen3.8-27B` | 6.822 ms | 7.110 ms |

## 3. Cách đo lại

```bash
node scripts/measure-latency.mjs https://momo-trustloop.vercel.app 10 > latency.json
```

Script gọi đúng 2 API mà giao diện dùng, mỗi lượt một `?session=` mới (dữ liệu seed), rồi tính min/median/max bằng `scripts/latency-stats.mjs` (có test `tests/latency-stats.test.ts`). Lượt phát lại, lượt lỗi, và lượt War-Room có agent `AGENT_DEGRADED` không được tính. Mỗi lượt tốn 1 lượt gọi AI cho bước quét và 1 cho War-Room trong hạn mức `DAILY_LLM_CALL_LIMIT`.
