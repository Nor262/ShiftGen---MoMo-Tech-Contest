# MoMo TrustLoop v2 — Tài liệu Bàn giao Dự án (Handover)

> **Trạng thái mã nguồn:** Hoàn thành Waves 0–4 trên nhánh `main` (commit `0ba6b0f`); Wave 5 (`wave5/glossary-fixes`, commit `11a74f4`) căn chỉnh Giải phóng tạm giữ & người xét Khiếu nại theo [GLOSSARY.md](../GLOSSARY.md)  
> **Kiểm định cục bộ:** `npm test` **77/77 PASS** (7 file test) · `npm run typecheck` **0 lỗi** · `next build` **PASS**

---

## 1. Phạm vi Đã Bàn giao (3 Trụ cột Khép kín)

1. **B2C Phút 00 & Người giám hộ (`/shield`, `/family` — nhãn UI hiện ghi "Family Co-Sign"):**
   - Quét ảnh chụp màn hình chat / link `.apk` (ảnh giám khảo tải lên hoặc 3 kịch bản mẫu `CASE-01/02/03` gắn nhãn `MẪU MÔ PHỎNG`).
   - `PII_Redactor` 2 chiều (ẩn CCCD, SĐT gồm cả `+84 ...`, số dư, lịch sử chi tiêu; không lưu raw PII xuống DB và không gửi ảnh gốc sang Family/B2E).
   - Bảo vệ 24h Opt-in với Thông báo trung tính `NEUTRAL_HOLD_MESSAGE` (không mạo danh NHNN/Công an/Tòa án); hết hạn giữ mà chưa Chuyển cấp thì Giải phóng (`RELEASED`).
   - Màn hình Người giám hộ không chứa PII; Người giám hộ chỉ có quyền Chuyển cấp (kéo dài Tạm giữ tới khi B2E phán quyết), không có quyền Giải phóng.
2. **B2E FinCrime War-Room (`/warroom`):**
   - Thuật toán đồ thị phát hiện Chia nhỏ giao dịch dưới ngưỡng xác thực sinh trắc học (`<10M/lần`, `>20M/ngày`, theo ngày UTC+7) và cụm ví/thiết bị dùng chung (`@xyflow/react`). Căn cứ: Luật PCRT Điều 29, TT 40/2024 Phụ lục 01 (QĐ 2345 đã bị bãi bỏ từ 01/01/2025 — xem [RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md)).
   - 4 Agent chạy song song (`GraphTracer`, `EvidenceCorrelator`, `ComplianceRAG` BM25 trên `data/vnPolicies.json`, `FalsePositiveDefender`) + `DebateSynthesizer` tổng hợp tranh biện 2 chiều & Thẻ bàn giao CSKH.
   - Hỗ trợ SSE streaming (`?stream=1`) và fallback cô lập lỗi từng agent (`AGENT_DEGRADED`).
   - Minh oan (`DISMISSED_FP`) Giải phóng ngay giao dịch bị giữ của Vụ.
3. **Quản trị Miễn dịch Cộng đồng 4 Lớp (`/checker`):**
   - Lớp 1 (`SOFT_WARNING`) → Lớp 2 (`>=2` nguồn độc lập `400`, Maker≠Checker `403`) → Lớp 3 (TTL `72h`/`720h` + nút demo hết hạn) → Lớp 4 (Khiếu nại do Checker **khác** Checker đã Kích hoạt xét — `403 APPEAL_REVIEWER_CONFLICT`, persona demo `RISK_CHECKER_LAN` — + `OVERTURNED_ROLLBACK` + `AuditLog` chỉ-ghi-thêm). Bốn lớp là thiết kế quản trị của TrustLoop, không phải yêu cầu của TT 53/2026.
   - Đồng bộ khép kín ngược về B2C `/api/shield/scan`.

---

## 2. Tài liệu Tham chiếu trong Repo

- Tổng quan & hướng dẫn cài đặt: [README.md](../README.md)
- Kịch bản demo 3 phút cho Giám khảo: [docs/ONE_PAGE_GUIDE.md](./ONE_PAGE_GUIDE.md)
- Thuật ngữ chuẩn: [GLOSSARY.md](../GLOSSARY.md); số liệu & căn cứ pháp lý: [docs/RESEARCH_PROBLEM.md](./RESEARCH_PROBLEM.md), [docs/RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md)
- Bảng số đo độ trễ thực tế (Slide 9): [docs/MEASURED_LATENCIES.md](./MEASURED_LATENCIES.md)
- Đặc tả sản phẩm, yêu cầu & thiết kế: [docs/PRODUCT_IDEA.md](./PRODUCT_IDEA.md), [docs/SPEC_REQUIREMENTS.md](./SPEC_REQUIREMENTS.md), [docs/SPEC_DESIGN.md](./SPEC_DESIGN.md)
- Triển khai container: [Dockerfile](../Dockerfile), [docker-compose.yml](../docker-compose.yml)

---

## 3. Hạ tầng & Biến Môi trường (Không lưu Secret trong Git)

- **Vercel Project (hiện tại; sẽ giữ làm dự phòng):** `momo-trustloop` (team `nor262s-projects`, region `sin1`, domain `https://momo-trustloop.vercel.app`).
- **AWS Sandbox (Kế hoạch, bắt buộc cho cuộc thi):** `LLM_BACKEND=bedrock`, Docker trên EC2/Amplify `ap-southeast-1`.
- **Database Production:** Supabase PostgreSQL miễn phí (`ap-southeast-1`, pooler `:6543` cho `DATABASE_URL`, direct `:5432` cho `DIRECT_URL`).
- **Biến môi trường cần thiết** (xem mẫu tại `.env.example`, tuyệt đối không commit `.env`):
  - `DATABASE_URL`, `DIRECT_URL`
  - `LLM_BACKEND=gemini` (mặc định) và `GEMINI_API_KEY` (hoặc cấu hình `bedrock` / `openai` qua `LLM_FALLBACK_BACKEND`)

---

## 4. Việc Cần Làm Tiếp Khi Tiếp Nhận

> Mốc: sơ khảo kết thúc **03/12/2026**, chung kết **11/12/2026** tại TP.HCM. Thứ tự ưu tiên: (1) sửa nội dung & căn cứ pháp lý → (2) chuyển sang AWS → (3) nút "Yêu cầu xét lại tạm giữ" → (4) deploy + đo độ trễ thật → (5) tính năng từ luật → (6) pitch. Danh sách đầy đủ ở [PRODUCT_IDEA.md mục 10](./PRODUCT_IDEA.md#10-lộ-trình).

1. **Đẩy mã nguồn lên GitHub:**
   - Đăng nhập GitHub CLI (`gh auth login`) hoặc thêm remote repo (`git remote add origin <url>`), sau đó `git push -u origin main`.
2. **Chuyển sang AWS Sandbox:**
   - Build Docker, chạy trên EC2/Amplify `ap-southeast-1` với `LLM_BACKEND=bedrock`; vẫn deploy nhánh `main` mới nhất lên Vercel `momo-trustloop` làm dự phòng.
3. **Đo độ trễ Live LLM cho Slide 9:**
   - Trên bản AWS (Bedrock), chạy 10 lượt thật và cập nhật `measured_latency_ms` & `model_used` vào `docs/MEASURED_LATENCIES.md`.
4. **Giữ Supabase Free không tự tạm dừng:**
   - Đặt lịch ping `GET https://momo-trustloop.vercel.app/api/health` mỗi **1–2 ngày** cho tới hết **11/12/2026**.
