# MoMo TrustLoop v2 — Hướng dẫn Demo 1 Trang cho Ban Giám Khảo (3 Phút)

> **Trải nghiệm Kể chuyện 4 Chương (khuyên dùng, ~2 phút):** `https://momo-trustloop.vercel.app/story`
> **Không gian làm việc đầy đủ (tải ảnh tự do & kiểm thử sâu):** `https://momo-trustloop.vercel.app`
> **Tài khoản dùng thử:** **Không cần đăng nhập / mật khẩu** — hệ thống tự cô lập phiên theo trình duyệt hoặc đồng bộ 2 thiết bị (Laptop + Điện thoại) qua `https://momo-trustloop.vercel.app/?session=momo-final`.
> **Mở đủ màn hình kỹ thuật:** Ở góc dưới bên phải chân trang, bấm **`Chế độ kỹ thuật: Tắt → Bật`** để hiện 4 tab điều hướng (`① Người dùng`, `② Người giám hộ`, `③ Đội Risk điều tra`, `④ Duyệt & bảo vệ`) và nút **`Khôi phục dữ liệu demo`** trên trang Tổng quan (`/`).
> **Lưu ý bảo mật:** Mọi dữ liệu đều là **`MẪU MÔ PHỎNG`**. Không tải ảnh chứa CCCD, số điện thoại hoặc sao kê ngân hàng thật lên bản demo.

---

## 1. Kịch bản Thuyết trình & Kiểm chứng Trực tiếp (3 Phút)

### Phút 0:00 – 1:20 | `CASE-01` Bác Hùng — Khép kín 4 Nhịp (B2C → Người giám hộ → War-Room → Miễn dịch)
1. **Tab `① Người dùng` (`/shield`, vai `Bác Hùng (62t)`):**
   - Bật **`Tôi đồng ý cho AI phân tích khi quét`** và bật công tắc **Bảo vệ Giao dịch Rủi ro cao 24h** (mặc định TẮT; người dùng tự bật từ trước).
   - Bấm thẻ mẫu **`CASE-01: Zalo giả Công an`** (hoặc tải ảnh bất kỳ) — hệ thống chạy quét tự động ngay lập tức.
   - Quan sát: AI Vision bóc trần dấu đỏ giả, 4 đòn thao túng tâm lý, và bảng **Đối chiếu Ẩn PII Trước/Sau** (`CCCD`, `SĐT`, `Số dư` đã che mờ).
   - Bấm **Chuyển tiền 9.500.000 đ** → giao dịch vào trạng thái giữ với thông báo trung tính bắt buộc: *"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."* (tuyệt đối không mạo danh NHNN/Công an).
2. **Tab `② Người giám hộ` (`/family`, vai `Chị Minh`):**
   - Bấm **Chấp nhận lời mời giám hộ** để mở màn hình tối giản: **không** thấy số dư ví hay lịch sử chi tiêu của bố, chỉ thấy số tiền nghi vấn & bằng chứng đã Ẩn PII → bấm **`Chuyển cấp sang đội Risk`** (kéo dài Tạm giữ tới khi B2E phán quyết). Người giám hộ **không** có nút Giải phóng tiền.
3. **Tab `③ Đội Risk điều tra` (`/warroom`, vai `Chuyên viên Huyền` → `Chuyên viên Tuấn`):**
   - Chọn hồ sơ `CASE-01` → bấm **Chạy Điều tra 4 Agent** (xem luồng trực tiếp 4 Agent song song + đồ thị dòng tiền tương tác cụm Ví trung gian 4×9,5M lọt dưới ngưỡng xác thực sinh trắc học 10 triệu + **Thẻ Bàn giao CSKH Thấu cảm**).
   - Bấm **`Đề xuất Kết luận rủi ro cao (chuyển người duyệt)`** → sang **`④ Duyệt & bảo vệ` (`/checker`)**, chuyển sang vai **`Chuyên viên Tuấn`** bấm **Phê duyệt Phát hành** (mặc định thời hạn `720h` / 30 ngày, tùy chọn `72h`) *(Huyền tự duyệt bị chặn HTTP `403`)*.
4. **Quay lại `① Người dùng` (`/shield`, vai `Người dùng mới`):**
   - Tra cứu lại TK `990123456789` → nhận ngay **Cảnh báo rủi ro cao từ Mạng lưới Miễn dịch MoMo TrustLoop** (chỉ hiện vì nhập trùng đúng số, không có danh sách công khai).

### Phút 1:20 – 2:10 | `CASE-02` Minh Anh — An ninh mạng (`.APK`) & Lớp 1 (Chặn `400` khi `<2` nguồn)
1. Chọn vai **`Minh Anh (21t)`** tại `/shield` + bấm thẻ mẫu **`CASE-02: App VNeID giả`** (tin nhắn dụ cài bản cập nhật VNeID giả xin quyền điều khiển từ xa, tên miền hư cấu `.example`) → xem cảnh báo bảo vệ thiết bị & lời khuyên chỉ cài VNeID từ kho ứng dụng chính thức.
2. Bấm **Báo cáo link/APK độc hại sang War-Room** → sang `/warroom` chạy 4 Agent.
3. Vì mới có **1 nguồn** bằng chứng, nếu cố đẩy thẳng lên cảnh báo chính thức hệ thống chặn **`HTTP 400`** → chỉ được phát hành **Cảnh báo mềm (72h)** (Lớp 1).

### Phút 2:10 – 2:50 | `CASE-03` Chị Hoa — `False-Positive Defender` (Chống khóa oan)
1. Tại `/warroom` chọn **`CASE-03: Chị Hoa (Tiểu thương Livestream)`** → chạy 4 Agent.
2. Quan sát **Agent Phản biện (`False-Positive Defender`)**: 14 tháng bán hàng sạch, thiết bị chính chủ, không có bằng chứng Phút 00 → bấm **`Minh oan (đóng cảnh báo giả)`** (giao dịch bị giữ của Vụ được Giải phóng ngay; không đưa vào kho Chỉ báo).

### Phút 2:50 – 3:00 | Khiếu nại Con người, Thu hồi & Khôi phục Demo
- Tại `/checker`, gửi **Khiếu nại** cho Chỉ báo vừa Kích hoạt → chọn vai **`Chuyên viên Lan`** để xét (Anh Tuấn đã Kích hoạt nên bị chặn `403`) → chấp nhận Khiếu nại hoặc bấm **Thu hồi** → cảnh báo gỡ ngay trên B2C; hồ sơ điều tra và lịch sử kiểm toán vẫn được giữ.
- Bấm **`Khôi phục dữ liệu demo`** trên trang Tổng quan (`/`) để làm sạch phiên `?session=momo-final`.

---

## 2. Tóm tắt Căn cứ Pháp lý (chi tiết: [RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md))

| Văn bản pháp lý | Nội dung liên quan | Hiện thực hóa trong TrustLoop v2 |
| :--- | :--- | :--- |
| **TT 40/2024/TT-NHNN** | Điều 19.1.l, 28.1.c.(iii): thỏa thuận ví & quy định nội bộ được tạm dừng giao dịch | Bảo vệ 24h tự bật từ trước, mặc định TẮT; người dùng luôn tự hủy được. |
| **Luật Phòng, chống rửa tiền 2022** & TT 40 Phụ lục 01 | Điều 29: dấu hiệu chia nhỏ giao dịch, ví trung gian, dùng chung thiết bị | `lib/graph/analyzer.ts` phát hiện chia nhỏ 4×9,5M dưới ngưỡng xác thực sinh trắc học 10 triệu/lần, 20 triệu/ngày (TT 50/2024 sửa bởi TT 77/2025, chưa xác minh phụ lục; QĐ 2345 đã bị bãi bỏ từ 01/01/2025). |
| **Luật Bảo vệ Dữ liệu Cá nhân 91/2025** (01/01/2026) | Đồng ý từng mục đích; giới hạn phạm vi cần thiết | Đồng ý riêng cho Lượt quét/Người giám hộ; bộ lọc ẩn PII che CCCD, SĐT, số dư. MVP gửi ảnh tới LLM ngoài VN — cần hồ sơ đánh giá tác động trước khi dùng thật. |
| **Luật AI 134/2025/QH15** (01/03/2026) | Điều 4.2: con người kiểm soát, can thiệp được | Agent chỉ khuyến nghị; Chuyên viên con người ra phán quyết. |
| **TT 53/2026/TT-NHNN** (15/11/2026) | Quyết định tự động bị khiếu nại phải do con người xem xét lại [nguồn báo chí, chưa xác minh điều khoản] | Hàng đợi Khiếu nại do Checker khác xét. Maker–Checker, ≥2 nguồn và TTL là **thiết kế quản trị của TrustLoop**, không phải yêu cầu của TT 53. |
