# MoMo TrustLoop v2 — Tài liệu Bàn giao Dự án (Handover)

> **Trạng thái mã nguồn:** Hoàn thành Waves 0–4 trên nhánh `main` (commit `0ba6b0f`)  
> **Kiểm định cục bộ:** `npm test` **77/77 PASS** (7 file test) · `npm run typecheck` **0 lỗi** · `next build` **PASS**

---

## 1. Phạm vi Đã Bàn giao (3 Trụ cột Khép kín)

1. **B2C Phút 00 & Family Co-Sign (`/shield`, `/family`):**
   - Quét ảnh chụp màn hình chat / link `.apk` (ảnh giám khảo tải lên hoặc 3 kịch bản mẫu `CASE-01/02/03` gắn nhãn `MẪU MÔ PHỎNG`).
   - `PII_Redactor` 2 chiều (ẩn CCCD, SĐT gồm cả `+84 ...`, số dư, lịch sử chi tiêu; không lưu raw PII xuống DB và không gửi ảnh gốc sang Family/B2E).
   - Chế độ tạm giữ 24h Opt-in với thông báo trung tính `NEUTRAL_HOLD_MESSAGE` (không mạo danh NHNN/Công an/Tòa án) và màn hình duyệt gia đình không chứa PII.
2. **B2E FinCrime War-Room (`/warroom`):**
   - Thuật toán đồ thị phát hiện chia nhỏ giao dịch QĐ 2345 (`<10M/lần`, `>20M/ngày`, theo ngày UTC+7) và cụm ví/thiết bị dùng chung (`@xyflow/react`).
   - 4 Agent chạy song song (`GraphTracer`, `EvidenceCorrelator`, `ComplianceRAG` BM25 trên `data/vnPolicies.json`, `FalsePositiveDefender`) + `DebateSynthesizer` tổng hợp tranh biện 2 chiều & Thẻ bàn giao CSKH.
   - Hỗ trợ SSE streaming (`?stream=1`) và fallback cô lập lỗi từng agent (`AGENT_DEGRADED`).
3. **Quản trị Miễn dịch Cộng đồng 4 Lớp (`/checker`):**
   - Lớp 1 (`SOFT_WARNING`) → Lớp 2 (`>=2` nguồn độc lập `400`, Maker≠Checker `403`) → Lớp 3 (TTL `72h`/`720h` + nút demo hết hạn) → Lớp 4 (khiếu nại TT 53/2026 + `OVERTURNED_ROLLBACK` + `AuditLog` bất biến).
   - Đồng bộ khép kín ngược về B2C `/api/shield/scan`.

---

## 2. Tài liệu Tham chiếu trong Repo

- Tổng quan & hướng dẫn cài đặt: [README.md](../README.md)
- Kịch bản demo 3 phút cho Giám khảo: [docs/ONE_PAGE_GUIDE.md](./ONE_PAGE_GUIDE.md)
- Bảng số đo độ trễ thực tế (Slide 9): [docs/MEASURED_LATENCIES.md](./docs/MEASURED_LATENCIES.md)
- Đặc tả sản phẩm, yêu cầu & thiết kế: [docs/PRODUCT_IDEA.md](./PRODUCT_IDEA.md), [docs/SPEC_REQUIREMENTS.md](./SPEC_REQUIREMENTS.md), [docs/SPEC_DESIGN.md](./SPEC_DESIGN.md)
- Triển khai container: [Dockerfile](../Dockerfile), [docker-compose.yml](../docker-compose.yml)

---

## 3. Hạ tầng & Biến Môi trường (Không lưu Secret trong Git)

- **Vercel Project:** `momo-trustloop` (team `nor262s-projects`, region `sin1`, domain `https://momo-trustloop.vercel.app`).
- **Database Production:** Supabase PostgreSQL miễn phí (`ap-southeast-1`, pooler `:6543` cho `DATABASE_URL`, direct `:5432` cho `DIRECT_URL`).
- **Biến môi trường cần thiết** (xem mẫu tại `.env.example`, tuyệt đối không commit `.env`):
  - `DATABASE_URL`, `DIRECT_URL`
  - `LLM_BACKEND=gemini` (mặc định) và `GEMINI_API_KEY` (hoặc cấu hình `bedrock` / `openai` qua `LLM_FALLBACK_BACKEND`)

---

## 4. Việc Cần Làm Tiếp Khi Tiếp Nhận

1. **Đẩy mã nguồn lên GitHub:**
   - Đăng nhập GitHub CLI (`gh auth login`) hoặc thêm remote repo (`git remote add origin <url>`), sau đó `git push -u origin main`.
2. **Cập nhật bản Production lên Vercel:**
   - Deploy nhánh `main` mới nhất lên `momo-trustloop` để thay thế bản Wave 0 đang chạy.
3. **Đo độ trễ Live LLM cho Slide 9:**
   - Điền `GEMINI_API_KEY` vào `.env` và Vercel Env, chạy 10 lượt thật và cập nhật kết quả vào `docs/MEASURED_LATENCIES.md`.
4. **Giữ Supabase Free không tự tạm dừng:**
   - Đặt lịch ping `GET https://momo-trustloop.vercel.app/api/health` mỗi **1–2 ngày** cho tới hết **11/12/2026**.
