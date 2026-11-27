# MoMo TrustLoop v2 — Hướng dẫn Demo 1 Trang cho Ban Giám Khảo (3 Phút)

> **Trải nghiệm Kể chuyện 4 Chương (khuyên dùng, ~2 phút):** `https://momo-trustloop.vercel.app/story`
> **Không gian làm việc đầy đủ (tự do tải ảnh thật & kiểm thử):** `https://momo-trustloop.vercel.app`
> **Tài khoản dùng thử:** **Không cần đăng nhập / mật khẩu** — hệ thống tự cô lập phiên theo trình duyệt hoặc đồng bộ 2 thiết bị (Laptop + Điện thoại) qua tham số `?session=momo-final`.
> **Lưu ý bảo mật:** Mọi dữ liệu đều là **`MẪU MÔ PHỎNG`**. Không tải ảnh chứa CCCD, số điện thoại hoặc sao kê ngân hàng thật lên bản demo.

---

## 1. Kịch bản Thuyết trình & Kiểm chứng Trực tiếp (3 Phút)

### Phút 0:00 – 1:20 | `CASE-01` Bác Hùng — Khép kín 4 Nhịp (B2C → Người giám hộ → War-Room → Miễn dịch)
1. **Tab `B2C Phút 00` (vai `Bác Hùng (62t)`):**
   - Bật công tắc **Bảo vệ Giao dịch Rủi ro cao 24h (Opt-in)** (mặc định TẮT; người dùng tự bật từ trước).
   - Chọn ảnh mẫu **`CASE-01: Zalo giả Công an`** (hoặc tải ảnh bất kỳ) → bấm **Quét Ảnh Chat Phút 00**.
   - Quan sát: AI Vision bóc trần dấu đỏ giả, 4 đòn thao túng tâm lý, và bảng **Đối chiếu Ẩn PII Trước/Sau** (`CCCD`, `SĐT`, `Số dư` đã che mờ).
   - Bấm **Chuyển tiền 9.500.000 đ** → giao dịch vào trạng thái `ON_HOLD_24H` với thông báo trung tính bắt buộc: *"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."* (tuyệt đối không mạo danh NHNN/Công an).
2. **Màn hình Người giám hộ (`/family`, nhãn UI "Family Co-Sign"; vai `Chị Minh`):**
   - Kiểm chứng 1 màn hình tối giản: **không** thấy số dư ví hay lịch sử chi tiêu của bố, chỉ thấy số tiền nghi vấn & bằng chứng đã Ẩn PII → bấm **Xác nhận tạm giữ 24h & Chuyển MoMo Risk** (Chuyển cấp: Tạm giữ kéo dài tới khi B2E phán quyết). Người giám hộ **không** có nút Giải phóng tiền.
3. **Tab `FinCrime War-Room` (vai `Maker: Chị Huyền` → `Checker: Anh Tuấn`):**
   - Chọn hồ sơ `CASE-01` → bấm **Chạy Điều tra 4 Agent** (xem SSE streaming 4 Agent song song + đồ thị `@xyflow/react` cụm Ví trung gian 4×9,5M lọt dưới ngưỡng xác thực sinh trắc học 10 triệu + **Thẻ Bàn giao CSKH Thấu cảm**).
   - Thử bấm duyệt trực tiếp hoặc đề xuất `ACTIVE`: Maker đề xuất **Phát hành Cảnh báo Rủi ro Cao (`ACTIVE`)** → chuyển sang vai **`Checker: Anh Tuấn`** bấm **Phê duyệt Phát hành (mặc định TTL `720h` / 30 ngày, tùy chọn `72h`)** *(Maker tự duyệt bị chặn HTTP `403`)*.
4. **Tab `B2C Phút 00` (vai `Người dùng mới`):**
   - Tra cứu lại TK `990123456789` → nhận ngay **Cảnh báo từ Mạng lưới Miễn dịch MoMo TrustLoop** (nội dung "rủi ro cao"; chỉ hiện vì nhập trùng đúng số, không có danh sách công khai).

### Phút 1:20 – 2:10 | `CASE-02` Minh Anh — An ninh mạng (`.APK`) & Lớp 1 (Chặn `400` khi `<2` nguồn)
1. Chọn vai **`Minh Anh (21t)`** + ảnh mẫu **`CASE-02: App VNeID giả`** (tin nhắn dụ cài bản cập nhật VNeID giả có quyền điều khiển từ xa, tên miền hư cấu `.example`) → Quét → thấy cờ `APK_ACCESSIBILITY_BAIT` & lời khuyên chỉ cài VNeID từ kho ứng dụng chính thức.
2. Bấm **Báo cáo link/APK độc hại sang War-Room** → sang War-Room chạy 4 Agent.
3. Vì mới có **1 nguồn** bằng chứng, nếu Maker cố đẩy thẳng lên `ACTIVE` hệ thống chặn **`HTTP 400`** → chỉ được phát hành **`SOFT_WARNING` (72h)** (Lớp 1).

### Phút 2:10 – 2:50 | `CASE-03` Chị Hoa — `False-Positive Defender` (Chống khóa oan)
1. Tại War-Room chọn **`CASE-03: Chị Hoa (Tiểu thương Livestream)`** → chạy 4 Agent.
2. Quan sát **`False-Positive Defender`** phản biện: 14 tháng bán hàng sạch, thiết bị chính chủ, không có bằng chứng Phút 00 → đề xuất `RECOMMEND_DISMISS_FP` → Maker bấm **Đóng cảnh báo giả (Dismiss FP)** = **Minh oan** (giao dịch bị giữ của Vụ, nếu có, được Giải phóng ngay; không đưa vào kho Chỉ báo).

### Phút 2:50 – 3:00 | Khiếu nại Con người, Thu hồi & `Reset Demo`
- Tại `/checker` (**Quản trị Miễn dịch 4 Lớp**), gửi **Khiếu nại** cho Chỉ báo vừa Kích hoạt → chọn vai **`RISK_CHECKER_LAN` (Chị Lan)** để xét (Anh Tuấn đã Kích hoạt nên bị chặn `403`) → chấp nhận Khiếu nại hoặc bấm **Thu hồi tức thì (`Rollback`)** → cảnh báo gỡ ngay trên B2C; hồ sơ điều tra và `AuditLog` vẫn được giữ.
- Bấm **Reset Dữ liệu Demo** trên trang Tổng quan (`/`) để khôi phục sạch phiên `?session=momo-final`.

---

## 2. Tóm tắt Căn cứ Pháp lý (chi tiết: [RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md))

| Văn bản pháp lý | Nội dung liên quan | Hiện thực hóa trong TrustLoop v2 |
| :--- | :--- | :--- |
| **TT 40/2024/TT-NHNN** | Điều 19.1.l, 28.1.c.(iii): thỏa thuận ví & quy định nội bộ được tạm dừng giao dịch | Bảo vệ 24h opt-in, mặc định TẮT; người dùng luôn tự hủy được. |
| **Luật Phòng, chống rửa tiền 2022** & TT 40 Phụ lục 01 | Điều 29: dấu hiệu chia nhỏ giao dịch, ví trung gian, dùng chung thiết bị | `lib/graph/analyzer.ts` phát hiện chia nhỏ 4×9,5M dưới ngưỡng xác thực sinh trắc học 10 triệu/lần, 20 triệu/ngày (TT 50/2024 sửa bởi TT 77/2025, chưa xác minh phụ lục; QĐ 2345 đã bị bãi bỏ từ 01/01/2025). |
| **Luật BVDLCN 91/2025** (01/01/2026) | Đồng ý từng mục đích; giới hạn phạm vi cần thiết | Đồng ý riêng cho Lượt quét/Người giám hộ; `PII_Redactor` ẩn CCCD, SĐT, số dư. MVP gửi ảnh tới LLM ngoài VN — cần hồ sơ đánh giá tác động trước khi dùng thật. |
| **Luật AI 134/2025/QH15** (01/03/2026) | Điều 4.2: con người kiểm soát, can thiệp được | Agent chỉ khuyến nghị; Chuyên viên con người ra phán quyết. |
| **TT 53/2026/TT-NHNN** (15/11/2026) | Quyết định tự động bị khiếu nại phải do con người xem xét lại [nguồn báo chí, chưa xác minh điều khoản] | Hàng đợi Khiếu nại do Checker khác xét. Maker–Checker, ≥2 nguồn và TTL là **thiết kế quản trị của TrustLoop**, không phải yêu cầu của TT 53. |
