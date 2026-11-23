# MoMo TrustLoop v2 — Bảng Số đo Độ trễ Thực tế (Slide 9 Telemetry Sheet)

> **Nguyên tắc trung thực:** Tuyệt đối **không** ghi các cam kết chưa đo đạc (như `<1s`, `99%`, `<15s`). Mọi số đo bên dưới được thu trực tiếp từ `performance.now()` (`measured_latency_ms`).

---

## 1. Số đo thuần thuật toán cục bộ (lịch sử, trước 23/11/2026)

> Đo trên nhánh `wave4/docs` trước khi có script đo trong repo; không tái hiện tự động được và corpus nay có 13 chunk. Giữ làm tham khảo, **không dùng cho Slide 9**.

Đo trung bình trên **100 vòng lặp** bằng `node:perf_hooks` (`performance.now()`) trên mã nguồn nhánh `wave4/docs` (không gọi mạng ngoài):

| Thành phần | Hàm / Module | Độ trễ trung bình đo được | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Ẩn PII & Bọc thẻ chống Prompt Injection** | `redactText()` — `lib/pii/redactor.ts` | **`0.027 ms`** | Ẩn CCCD 12 số, SĐT, số dư ví, bọc `<untrusted_user_content>` |
| **Truy xuất Chính sách Pháp lý (BM25 RAG)** | `retrievePolicyChunks()` — `lib/agents/retriever.ts` | **`0.123 ms`** | Chỉ mục BM25 trên 12 chunk `data/vnPolicies.json` |
| **Phân tích Đồ thị Chia nhỏ giao dịch & Ví trung gian** | `analyzeCaseGraph()` — `lib/graph/analyzer.ts` | **`0.409 ms`** | Phát hiện chia nhỏ 4×9,5M dưới ngưỡng xác thực sinh trắc học (UTC+7) & thiết bị dùng chung |

---

## 2. Độ trễ thật của 2 luồng AI trên bản deploy (Slide 9)

Đo trên `https://momo-trustloop.vercel.app` (Vercel, region `sin1`; LLM: FPT AI Factory), **10 lượt mỗi luồng**, mỗi lượt một phiên mới, từ 2026-11-23T18:51:57.622Z đến 2026-11-23T18:53:42.975Z (UTC).
Chỉ tính lượt chạy thật: lượt phát lại (`model_used` chứa "(phát lại"), lượt lỗi và lượt War-Room có agent không `OK` bị loại — lần đo này loại **0** lượt phát lại, **0** lượt lỗi/suy giảm.

Số ghi bằng mili-giây, không dấu phân cách hàng nghìn (3516 ms = 3,5 giây). Median của số lượt chẵn là trung bình 2 giá trị giữa, làm tròn tới 1 ms.

| Luồng | `model_used` | Lượt hợp lệ | min | median | max | Phía client (min / median / max) |
| :--- | :--- | :---: | ---: | ---: | ---: | :--- |
| Lượt quét ảnh CASE-01 (`POST /api/shield/scan`) | `gemma-4-31B-it` | 10/10 | **3387 ms** | **3516 ms** | **3689 ms** | 3623 ms / 3797 ms / 3953 ms |
| War-Room 4 agent CASE-01 (`POST …/investigate`) | `Qwen3.8-27B` | 10/10 | **6261 ms** | **7357 ms** | **8551 ms** | 6500 ms / 7688 ms / 8876 ms |

* min/median/max là `measured_latency_ms` (quét) và `debate.total_latency_ms` (War-Room) do máy chủ đo bằng `performance.now()`.
* Cột "phía client" là thời gian một lần gọi HTTP đo từ máy chạy script (gồm mạng tới Vercel), tính cùng cách bằng `summarize()`.
* Đây là số đo của một lần chạy, không phải cam kết hiệu năng. Model, region hay tải của nhà cung cấp đổi thì số đổi; đo lại trước khi xuất slide.

### 2.1. Từng lượt — Lượt quét

| # | Bắt đầu (UTC) | `model_used` | measured_latency_ms | Client | Mức rủi ro |
| :---: | :--- | :--- | ---: | ---: | :--- |
| 1 | 2026-11-23T18:51:57.622Z | `gemma-4-31B-it` | 3470 ms | 3953 ms | CRITICAL |
| 2 | 2026-11-23T18:52:10.454Z | `gemma-4-31B-it` | 3629 ms | 3845 ms | CRITICAL |
| 3 | 2026-11-23T18:52:22.246Z | `gemma-4-31B-it` | 3535 ms | 3749 ms | CRITICAL |
| 4 | 2026-11-23T18:52:33.572Z | `gemma-4-31B-it` | 3497 ms | 3686 ms | CRITICAL |
| 5 | 2026-11-23T18:52:43.943Z | `gemma-4-31B-it` | 3689 ms | 3934 ms | CRITICAL |
| 6 | 2026-11-23T18:52:54.728Z | `gemma-4-31B-it` | 3656 ms | 3878 ms | CRITICAL |
| 7 | 2026-11-23T18:53:05.625Z | `gemma-4-31B-it` | 3387 ms | 3636 ms | CRITICAL |
| 8 | 2026-11-23T18:53:17.061Z | `gemma-4-31B-it` | 3435 ms | 3623 ms | CRITICAL |
| 9 | 2026-11-23T18:53:27.183Z | `gemma-4-31B-it` | 3676 ms | 3948 ms | CRITICAL |
| 10 | 2026-11-23T18:53:39.300Z | `gemma-4-31B-it` | 3490 ms | 3674 ms | CRITICAL |

### 2.2. Từng lượt — War-Room

| # | Bắt đầu (UTC) | `model_used` | total_latency_ms | Client |
| :---: | :--- | :--- | ---: | ---: |
| 1 | 2026-11-23T18:52:01.577Z | `Qwen3.8-27B` | 8551 ms | 8876 ms |
| 2 | 2026-11-23T18:52:14.298Z | `Qwen3.8-27B` | 7420 ms | 7948 ms |
| 3 | 2026-11-23T18:52:25.995Z | `Qwen3.8-27B` | 7293 ms | 7576 ms |
| 4 | 2026-11-23T18:52:37.258Z | `Qwen3.8-27B` | 6435 ms | 6685 ms |
| 5 | 2026-11-23T18:52:47.877Z | `Qwen3.8-27B` | 6572 ms | 6851 ms |
| 6 | 2026-11-23T18:52:58.606Z | `Qwen3.8-27B` | 6777 ms | 7019 ms |
| 7 | 2026-11-23T18:53:09.261Z | `Qwen3.8-27B` | 7485 ms | 7800 ms |
| 8 | 2026-11-23T18:53:20.684Z | `Qwen3.8-27B` | 6261 ms | 6500 ms |
| 9 | 2026-11-23T18:53:31.131Z | `Qwen3.8-27B` | 7926 ms | 8169 ms |
| 10 | 2026-11-23T18:53:42.975Z | `Qwen3.8-27B` | 7644 ms | 7896 ms |

## 3. Cách đo lại

```bash
node scripts/measure-latency.mjs https://momo-trustloop.vercel.app 10 > .superpowers/latency.json
```

(`.superpowers/` nằm trong `.gitignore`.) Script gọi đúng 2 API mà giao diện dùng, mỗi lượt một `?session=` mới (dữ liệu seed), rồi tính min/median/max bằng `scripts/latency-stats.mjs` (có test `tests/latency-stats.test.ts`). Lượt không có số đo từ máy chủ bị tính là lỗi, không bao giờ ghi 0 ms. Mỗi lượt tốn 1 lượt gọi AI cho bước quét và 1 cho War-Room trong hạn mức `DAILY_LLM_CALL_LIMIT`.
