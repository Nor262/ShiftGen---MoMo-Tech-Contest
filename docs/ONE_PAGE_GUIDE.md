# MoMo TrustLoop v2 — Hướng dẫn Demo 1 Trang cho Ban Giám Khảo (3 Phút)

> **Live URL:** `https://momo-trustloop.vercel.app`
> **Đồng bộ 2 thiết bị (Laptop + Điện thoại):** Mở cùng URL với tham số `?session=momo-final` (ví dụ: `https://momo-trustloop.vercel.app/?session=momo-final`). Mọi dữ liệu đều là **`MẪU MÔ PHỎNG`** cô lập theo phiên.
> **Lưu ý bảo mật:** Không tải ảnh chứa CCCD, số điện thoại hoặc sao kê ngân hàng thật lên bản demo.

---

## 1. Kịch bản Thuyết trình & Kiểm chứng Trực tiếp (3 Phút)

### Phút 0:00 – 1:20 | `CASE-01` Bác Hùng — Khép kín 4 Nhịp (B2C → Family → War-Room → Miễn dịch)
1. **Tab `B2C Phút 00` (vai `Bác Hùng (62t)`):**
   - Bật công tắc **Bảo vệ Giao dịch Rủi ro cao 24h (Opt-in)** (mặc định TẮT theo Luật BVDLCN 91/2025).
   - Chọn ảnh mẫu **`CASE-01: Zalo giả Công an`** (hoặc tải ảnh bất kỳ) → bấm **Quét Ảnh Chat Phút 00**.
   - Quan sát: AI Vision bóc trần dấu đỏ giả, 4 đòn thao túng tâm lý, và bảng **Đối chiếu Ẩn PII Trước/Sau** (`CCCD`, `SĐT`, `Số dư` đã che mờ).
   - Bấm **Chuyển tiền 9.500.000 đ** → giao dịch vào trạng thái `ON_HOLD_24H` với thông báo trung tính bắt buộc: *"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."* (tuyệt đối không mạo danh NHNN/Công an).
2. **Tab `Family Co-Sign` (vai `Chị Minh`):**
   - Kiểm chứng 1 màn hình duyệt tối giản: **không** thấy số dư ví hay lịch sử chi tiêu của bố, chỉ thấy số tiền nghi vấn & bằng chứng đã ẩn PII → bấm **Xác nhận giữ chậm 24h & Chuyển MoMo Risk**.
3. **Tab `FinCrime War-Room` (vai `Maker: Chị Huyền` → `Checker: Anh Tuấn`):**
   - Chọn hồ sơ `CASE-01` → bấm **Chạy Điều tra 4 Agent** (xem SSE streaming 4 Agent song song + đồ thị `@xyflow/react` cụm ví *mule* 4×9,5M né QĐ 2345 + **Thẻ Bàn giao CSKH Thấu cảm**).
   - Thử bấm duyệt trực tiếp hoặc đề xuất `ACTIVE`: Maker đề xuất **Phát hành Cảnh báo Rủi ro Cao (`ACTIVE`)** → chuyển sang vai **`Checker: Anh Tuấn`** bấm **Phê duyệt Phát hành (mặc định TTL `720h` / 30 ngày, tùy chọn `72h`)** *(Maker tự duyệt bị chặn HTTP `403`)*.
4. **Tab `B2C Phút 00` (vai `Người dùng mới`):**
   - Tra cứu lại TK `990123456789` → nhận ngay **Cảnh báo từ Mạng lưới Miễn dịch MoMo TrustLoop**.

### Phút 1:20 – 2:10 | `CASE-02` Minh Anh — An ninh mạng (`.APK`) & Lớp 1 (Chặn `400` khi `<2` nguồn)
1. Chọn vai **`Minh Anh (21t)`** + ảnh mẫu **`CASE-02: Shipper/APK`** → Quét → thấy cờ `APK_ACCESSIBILITY_BAIT` & cảnh báo không cài tệp ngoài kho.
2. Bấm **Báo cáo link/APK độc hại sang War-Room** → sang War-Room chạy 4 Agent.
3. Vì mới có **1 nguồn** bằng chứng, nếu Maker cố đẩy thẳng lên `ACTIVE` hệ thống chặn **`HTTP 400`** → chỉ được phát hành **`SOFT_WARNING` (72h)** (Lớp 1).

### Phút 2:10 – 2:50 | `CASE-03` Chị Hoa — `False-Positive Defender` (Chống khóa oan)
1. Tại War-Room chọn **`CASE-03: Chị Hoa (Tiểu thương Livestream)`** → chạy 4 Agent.
2. Quan sát **`False-Positive Defender`** phản biện: 14 tháng bán hàng sạch, thiết bị chính chủ, không có bằng chứng Phút 00 → đề xuất `RECOMMEND_DISMISS_FP` → Maker bấm **Đóng cảnh báo giả** (bảo vệ tiểu thương hợp pháp, không đưa vào kho miễn dịch).

### Phút 2:50 – 3:00 | Khiếu nại Con người, `Rollback` & `Reset Demo`
- Tại bảng **Quản trị Miễn dịch 4 Lớp**, thử gửi **Khiếu nại (TT 53/2026)** và bấm **Thu hồi tức thì (`Rollback`)** → cảnh báo gỡ ngay trên B2C kèm `AuditLog` bất biến.
- Bấm **Reset Dữ liệu Demo** trên trang Tổng quan (`/`) để khôi phục sạch phiên `?session=momo-final`.

---

## 2. Tóm tắt Tuân thủ Pháp lý Việt Nam 2026 (Compliance-by-Design)

| Văn bản pháp lý | Yêu cầu trọng tâm | Hiện thực hóa trong TrustLoop v2 |
| :--- | :--- | :--- |
| **QĐ 2345/QĐ-NHNN** (01/07/2024) | Sinh trắc học >10M/lần, >20M/ngày | `lib/graph/analyzer.ts` phát hiện chia nhỏ 4×9,5M (*smurfing*). |
| **Luật BVDLCN 91/2025 & NĐ 356/2025** (01/01/2026) | Đồng ý tự nguyện, bảo vệ dữ liệu nhạy cảm | Opt-in mặc định TẮT; `PII_Redactor` ẩn CCCD, SĐT, số dư. |
| **Luật AI 134/2025/QH15** (01/03/2026) | Con người làm trung tâm, minh bạch | Thông báo giữ chậm trung thực; không khóa tự động thiếu người. |
| **Thông tư 77/2025/TT-NHNN** (01/03/2026) | Phòng chống mã độc can thiệp thiết bị | Phát hiện dụ cài `.apk` & lạm dụng `Accessibility Services`. |
| **Thông tư 53/2026/TT-NHNN** (15/11/2026) | Quản trị rủi ro AI, khiếu nại người thật | Tranh biện 2 chiều + RAG + Maker–Checker + Hàng đợi Khiếu nại & `AuditLog`. |
