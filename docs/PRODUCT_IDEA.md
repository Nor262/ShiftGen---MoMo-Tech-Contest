# MoMo TrustLoop v2 — Ý Tưởng Sản Phẩm Chi Tiết
> **Cuộc thi:** MoMo Tech Contest 2026 — *"Imagine the Future Workspace (Human Centered. AI Powered)"*
> **Mục tiêu:** Xây dựng Live MVP chạy trực tuyến ổn định (phạm vi hẹp mà sâu, kiểm chứng trực tiếp trên trình duyệt). Vòng sơ khảo kết thúc **03/12/2026**; chung kết **11/12/2026** tại TP.HCM.
> **Độ phủ chủ đề (3/3):** Chống lừa đảo (Anti-Scam) + An ninh mạng (Cybersecurity) + Trợ lý AI (Agentic AI B2C & Multi-Agent B2E).
> **Thuật ngữ:** dùng theo [GLOSSARY.md](../GLOSSARY.md). **Số liệu:** theo [RESEARCH_PROBLEM.md](./RESEARCH_PROBLEM.md). **Căn cứ pháp lý:** theo [RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md).

---

## 1. Tóm tắt Điều hành (Executive Summary)

> **Luận điểm cốt lõi:** *Sinh trắc học chứng minh đúng người đang thao tác, nhưng không chứng minh người đó không bị thao túng.* Lừa đảo chuyển tiền tự nguyện (APP fraud) đi qua mọi lớp xác thực vì chính nạn nhân quét mặt và bấm chuyển.

**MoMo TrustLoop** là hệ sinh thái phòng vệ niềm tin số khép kín, đặt **bổ sung lên trên** SIMO của NHNN và các lớp bảo vệ MoMo đang có (xem [mục 2](#2-định-vị-so-với-simo--momo-hiện-có)). Sản phẩm gồm **3 trụ cột**, nối **tuyến đầu người dùng cá nhân & gia đình (B2C)** với **không gian điều tra gian lận & CSKH (B2E Future Workspace)**:

1. **Quét Ảnh Chat Phút 00 & Bảo vệ 24h (B2C):** Nhận diện văn bản giả mạo, đòn thao túng tâm lý và đường link dụ cài mã độc `.apk` từ ảnh chụp Zalo/Facebook **trước khi mở ví**; người dùng tự bật **Bảo vệ 24h** từ trước để hệ thống Tạm giữ giao dịch rủi ro cao của chính họ; thẻ đã Ẩn PII được gửi tới **Người giám hộ**, người chỉ có quyền **Chuyển cấp** sang B2E.
2. **Phòng Tác chiến 4 Agent có Tranh biện (B2E War-Room):** 4 AI Agent (`Graph & Smurfing Tracer`, `Pre-App Evidence Correlator`, `Compliance RAG`, **`False-Positive Defender`**) vừa truy vết Chia nhỏ giao dịch/Ví trung gian, vừa chủ động tìm lý do Minh oan cho giao dịch hợp pháp; Chuyên viên con người ra phán quyết; kèm **Thẻ bàn giao CSKH** trên cùng màn hình.
3. **Miễn dịch Cộng đồng 4 lớp (thiết kế quản trị của TrustLoop):** **Cảnh báo mềm → ≥2 Nguồn bằng chứng độc lập khác loại & Maker–Checker → Hạn hiệu lực (TTL) → Khiếu nại do một Checker khác xét & Thu hồi**. Chỉ báo chỉ hiện cho một người dùng khi giá trị họ quét/nhập **trùng đúng** Chỉ báo, với nội dung "rủi ro cao"; **không bao giờ công bố danh sách**.

---

## 2. Định vị so với SIMO & MoMo hiện có

TrustLoop **không làm lại** những gì NHNN và MoMo đã vận hành. Nguồn: [RESEARCH_PROBLEM.md](./RESEARCH_PROBLEM.md) mục 4–5, 7.

| Đã có (không tuyên bố là mới) | TrustLoop bổ sung |
| :--- | :--- |
| **SIMO (NHNN):** chia sẻ, tra cứu, cảnh báo tài khoản/ví nghi ngờ gian lận liên ngân hàng tại bước chuyển tiền. | **Phút 00:** bắt kịch bản thao túng ngay từ ảnh chat, khi tài khoản nhận tiền còn "sạch" và chưa nằm trong danh sách nào. |
| **MoMo:** cảnh báo tài khoản nhận tiền bằng AI (3 mức màu), phân tích >1.000 tín hiệu/giao dịch, ~29.000 giao dịch bất thường/ngày, 99,5% người nhận cảnh báo "dừng lại suy nghĩ" (không phải tỷ lệ hủy), Graph Network tài khoản–thiết bị–IP, phản ánh của người dùng. | **Bảo vệ 24h** do người dùng tự bật, có Thông báo trung tính và quyền tự hủy. |
| **MoMo:** "Bảo hiểm An toàn chuyển tiền" bồi thường tối đa 2 triệu đồng *(điều khoản sản phẩm, chưa có URL chính thức trong repo)*. | **Quy trình Khiếu nại và người thật xem lại minh bạch** (Lớp 4, Yêu cầu xét lại tạm giữ) — phần SIMO chưa công khai. |
| Báo cáo người dùng, phân tích đồ thị ví trung gian (MoMo, nTrust, chongluadao.vn). | **Người giám hộ** nhận thẻ đã Ẩn PII **trước** khi tiền đi — là **giả thuyết** cần đo trong pilot (xem [mục 10](#10-lộ-trình)). |

> **Câu chốt pitch (slide Giải pháp):** *"Bảo hiểm bù 2 triệu sau khi mất, TrustLoop giữ lại 15 triệu trước khi mất."*

**Dòng thời gian một vụ lừa:**
- **Phút 00** — người dùng bắt đầu nghi ngờ một tin nhắn/đường link, trước khi chuyển tiền.
- **Phút 00–88** — điểm mù ngoài ứng dụng (Zalo, mạng xã hội, cuộc gọi).
- **Phút 89** — nạn nhân mở ví để chuyển tiền (thuật ngữ của chính MoMo); đây là khoảnh khắc duy nhất một ứng dụng tài chính đơn lẻ quan sát được.
- **Phút 90+** — tiền đã rời ví và bị tẩu tán qua tài khoản trung gian.

---

## 3. Bài toán & Bảng Số liệu

### 3.1. Số liệu đã đối chiếu nguồn ([RESEARCH_PROBLEM.md](./RESEARCH_PROBLEM.md))

| Dữ kiện / Số liệu | Nguồn (ghi trên Slide) | Vai trò lập luận |
| :--- | :--- | :--- |
| **Thiệt hại — hai phương pháp, không ghép thành một xu hướng:** (a) Bộ Công an: **>6.000 tỷ đồng trong 11 tháng 2025** (số vụ được thụ lý); (b) NCA: **18.900 tỷ đồng năm 2024** (ước tính ngoại suy từ khảo sát ~59.000 người). Con số "~8.000 tỷ cả năm 2025" chỉ thấy qua báo chí, chưa có văn bản gốc → không dùng làm số chính. | (a) SGGP trích Bộ Công an, 12/2025; (b) Tuổi Trẻ trích NCA, 16/12/2024 | Quy mô thiệt hại vẫn ở mức nghìn tỷ đồng/năm. |
| MoMo phát hiện **~29.000 giao dịch bất thường/ngày**, cảnh báo **>10.000 người dùng/ngày**, **99,5%** người nhận cảnh báo "dừng lại suy nghĩ"; ước bảo vệ **>15.000 tỷ đồng/năm** (MoMo tự ước tính) | Thông cáo báo chí MoMo, 14/05/2026 | Điểm xuất phát mạnh của MoMo ở Phút 89 — tránh trùng lặp. |
| **SIMO (NHNN):** đến 28/9/2026 **>5,6 triệu lượt** cảnh báo, **>1,9 triệu lượt** dừng/hủy giao dịch (**>6.300 tỷ đồng**); 147 đơn vị kết nối; ~596.000 bản ghi tài khoản/ví nghi ngờ năm 2025. "Dừng/hủy" ≠ "đã chặn lừa đảo thật". | CafeF trích họp báo NHNN, 07/10/2026; Tuổi Trẻ, 30/12/2025 | Cảnh báo + ma sát trước khi tiền đi có tác dụng; TrustLoop là lớp bổ sung. |
| **Mạo danh công an** là thủ đoạn phổ biến **#1** năm 2025; chỉ **32,12%** nạn nhân trình báo; **12,03%** "chấp nhận mất" | Khảo sát NCA (n = 60.300), VietNamNet, 07/01/2026 | Lý do chọn ca chính **Bác Hùng bị giả công an**. |
| Thủ đoạn **VNeID giả** chứa mã độc đọc OTP, điều khiển app ngân hàng; nhắm người lớn tuổi | VietnamPlus trích Bộ Công an, 2025 | Căn cứ cho **CASE-02** (xem mục 6). |
| **88,98%** nạn nhân báo/hỏi người thân **sau** khi bị lừa; **không tìm thấy** nghiên cứu định lượng chứng minh người liên hệ tin cậy làm giảm thiệt hại | Tuổi Trẻ trích NCA, 16/12/2024; FINRA 2025 | Người giám hộ là **giả thuyết** cần đo, không phải hiệu quả đã chứng minh. |
| FATF: thanh toán tức thời cho phép tiền lừa đảo rời tài khoản **trong khoảng 2 phút** | FATF, 2026 | Lý do cần ma sát *trước* Phút 90+. |

### 3.2. Số liệu chưa đối chiếu (chỉ đưa lên slide sau khi kiểm lại nguồn gốc)

Các số dưới đây có trong bản nháp trước nhưng **chưa** được kiểm trong RESEARCH_PROBLEM.md: Deepfake chiếm 21% sự cố an ninh mạng tại VN (Kaspersky qua VietNamNet, 20/11/2026); 34,13% người dùng di động gặp mã độc năm 2025, mã độc RedHook/RatHat (NCA nTrust & Kaspersky); "truy vết tài khoản lừa đảo mất 1–2 ngày" (Cục A05 qua VnExpress, 22/10/2026); 85% người Việt sẵn sàng trao đổi tài sản trong gia đình (UOB ACSS qua CafeF); 90–95% cảnh báo AML là dương tính giả (số liệu ngành toàn cầu, Databricks); bài học Klarna 2025 (Bloomberg, Reuters).

> **Cam kết trung thực số liệu Demo:** Tài liệu và Slide **không** cam kết bất kỳ chỉ số tốc độ hay độ chính xác nào chưa đo. Giao diện Demo hiển thị **độ trễ đo thực tế (`measured_latency_ms`)** và `model_used`; chỉ trích số đo thật ([MEASURED_LATENCIES.md](./MEASURED_LATENCIES.md)) khi xuất PDF.

---

## 4. Vòng lặp Phòng vệ 4 Nhịp (Closed-Loop Architecture)

```text
[NHỊP 1 — B2C Phút 00]
Người dùng tải ảnh chat Zalo / văn bản / link APK (Lượt quét)
   │ -> AI Vision + NLP chỉ ra dấu hiệu giả mạo & 4 đòn tâm lý (giải thích dễ hiểu)
   │ -> Nếu đã bật Bảo vệ 24h: Tạm giữ giao dịch rủi ro cao + Thông báo trung tính (KHÔNG nhân danh cơ quan nhà nước)
   ▼
[NHỊP 2 — Cầu nối B2C → Người giám hộ → B2E]
Ẩn PII (CCCD, SĐT, số dư, lịch sử chi tiêu — tối thiểu hóa dữ liệu)
   │ -> Thẻ duyệt đã Ẩn PII gửi Người giám hộ (Chị Minh) — chỉ có quyền Chuyển cấp
   │ -> Bằng chứng Phút 00 (đã Ẩn PII) vào hàng đợi Risk Ops
   ▼
[NHỊP 3 — B2E FinCrime War-Room (Future Workspace)]
4 AI Agent chạy song song (Strict JSON Schema):
  (1) Graph & Smurfing Tracer     (2) Pre-App Evidence Correlator
  (3) Compliance & Policy RAG     (4) False-Positive Defender (Chống chặn oan)
   │ -> Đồ thị dòng tiền tương tác + Thẻ bàn giao CSKH (trên cùng 1 màn hình)
   │ -> Chuyên viên con người ra phán quyết: Minh oan hoặc Kết luận rủi ro cao
   ▼
[NHỊP 4 — Miễn dịch Cộng đồng 4 Lớp (thiết kế quản trị của TrustLoop)]
Cảnh báo mềm (1 nguồn) → ≥2 nguồn khác loại + Maker–Checker → TTL → Khiếu nại & Thu hồi
   │ -> Kho Chỉ báo Miễn dịch dùng nội bộ (không công bố danh sách)
   └─► Quay lại NHỊP 1: người dùng khác quét/nhập trúng đúng giá trị → thấy cảnh báo "rủi ro cao"
```

---

## 5. Thiết kế Chi tiết 3 Trụ cột

### Trụ cột 1 (B2C): Quét Ảnh Chat Phút 00, Bảo vệ 24h & Người giám hộ
* **Gộp liền mạch quét ảnh & phá thao túng:** Tập trung làm sâu luồng ảnh chụp màn hình (Zalo/Facebook/SMS/lệnh giả/hướng dẫn cài APK). Phân tích âm thanh cuộc gọi nằm ở Lộ trình.
* **Phân tích 2 lớp trên cùng màn hình:**
  * *Pháp y Thị giác:* lỗi thể thức văn bản công quyền giả (dấu ghép, phông chữ, sai thẩm quyền), biên lai chỉnh sửa, hoặc ảnh chứa đường dẫn tải `.apk` yêu cầu bật `Accessibility Services`.
  * *Phân tích Tâm lý & Giải thích Ấm áp:* tô sáng 4 tín hiệu thao túng (*đe dọa/gây sợ hãi, ép thời gian gấp, cô lập cấm báo người nhà, dụ cài phần mềm ngoài*) kèm lời khuyên cỡ chữ lớn cho người cao tuổi.
* **Bảo vệ 24h (opt-in, mặc định TẮT):**
  * Người dùng chủ động bật trong cài đặt. Cơ sở là thỏa thuận ví và quy định nội bộ quản lý rủi ro (TT 40/2024 Điều 19.1.l, 28.1.c.(iii)); đây **không phải** "trì hoãn giao dịch" theo Luật PCRT Điều 44. Sự đồng ý xử lý dữ liệu cho Lượt quét và cho Người giám hộ được xin **riêng từng mục đích** (Luật 91 Điều 9.4).
  * **Thông báo trung tính:** `"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."` — không nhân danh NHNN hay cơ quan nhà nước nào.
  * **Người dùng tự hủy** (`CANCELLED_BY_USER`) bất kỳ lúc nào; màn hình giải thích từng dấu hiệu rủi ro.
  * **Giải phóng (`RELEASED`, đã làm):** hết hạn giữ mà giao dịch chưa bị hủy hay Chuyển cấp thì tiền được chuyển đi; Minh oan cũng Giải phóng ngay giao dịch của Vụ.
  * **Yêu cầu xét lại tạm giữ (Kế hoạch):** nút để người dùng xin chuyên viên người thật xem lại quyết định Tạm giữ tự động; chỉ chuyên viên đó mới được Giải phóng sớm (TT 53/2026 [TC, chưa xác minh điều khoản]: quyết định tự động bị khách hàng khiếu nại phải do con người xem xét lại).
* **Màn hình Người giám hộ (route `/family`; nhãn UI hiện ghi "Family Co-Sign"):** chỉ hiện khi có giao dịch bị giữ; **không** hiển thị số dư hay lịch sử chi tiêu; CCCD, SĐT đã Ẩn PII. Người giám hộ chỉ có 2 thao tác: **Chuyển cấp** sang MoMo Risk (kéo dài Tạm giữ cho tới khi B2E ra phán quyết) và **Gọi kiểm tra người thân** (mô phỏng). Người giám hộ **không** có quyền Giải phóng tiền (TT 40 Điều 28.1.a.(iv)).

### Trụ cột 2 (B2E): Phòng Tác chiến 4 Agent có Tranh biện & Thẻ CSKH
* **4 Agent chạy song song** (`Promise.allSettled`, khóa JSON Schema từng Agent, hỗ trợ SSE):
  1. `Graph & Smurfing Tracer`: phân tích đồ thị giao dịch–thiết bị–IP để nhận diện Chia nhỏ giao dịch dưới ngưỡng xác thực sinh trắc học 10 triệu/lần – 20 triệu/ngày và cụm Ví trung gian. Căn cứ nhận diện dấu hiệu đáng ngờ: Luật PCRT 2022 Điều 29 khoản 2, 3, 9 và TT 40/2024 Phụ lục 01 (lý do 3, 8).
  2. `Pre-App Evidence Correlator`: đọc **Bằng chứng Phút 00** từ B2C (nội dung ảnh giả, số TK kẻ gian nhắn trên Zalo, cờ APK) để khớp với giao dịch nghi vấn và cờ SIMO mô phỏng.
  3. `Compliance & Policy RAG`: truy xuất BM25 trên `data/vnPolicies.json` (12 chunk). *Kế hoạch:* làm sạch kho này để chỉ còn tóm tắt văn bản pháp luật đúng theo RESEARCH_LEGAL.md.
  4. **`False-Positive Defender`:** chủ động tìm chứng cứ bảo vệ người dùng hợp pháp (lịch sử bán hàng sạch, khung giờ livestream ổn định, thiết bị chính chủ).
* **Phán quyết thuộc về con người** (Luật 134/2025 Điều 4.2): Tranh biện chỉ đưa khuyến nghị. Hai kết cục:
  * **Minh oan (`DISMISSED_FP`, đã làm):** Giải phóng ngay giao dịch bị giữ của Vụ.
  * **Kết luận rủi ro cao (`CLOSED`):** kết luận nghiệp vụ, không phải kết luận tội phạm. *Kế hoạch:* B2E hủy giao dịch bị giữ của Vụ với trạng thái riêng `CANCELLED_BY_B2E` (không bao giờ ghi thành người dùng hủy); chỉ hủy lệnh chưa thực hiện, không hứa thu hồi tiền đã đi.
* **Hạn quyết định (Kế hoạch):** B2E phải ra phán quyết cho giao dịch đã Chuyển cấp trong **03 ngày làm việc** — quy tắc thiết kế, lấy theo mức tối đa của việc trì hoãn trong Luật PCRT Điều 44.
* **Thẻ bàn giao CSKH:** tóm tắt mức lo lắng của khách, trạng thái tiền, 3 gợi ý mở lời đồng cảm để CSKH người thật liên hệ. Nội dung không bao giờ nhắc việc đã gửi báo cáo giao dịch đáng ngờ (Luật PCRT Điều 40.2).

### Trụ cột 3 (Closed-Loop): Miễn dịch Cộng đồng 4 Lớp
Bốn lớp dưới đây là **thiết kế quản trị của TrustLoop**, không phải nghĩa vụ của một thông tư cụ thể:
1. **Lớp 1 — Cảnh báo mềm (`SOFT_WARNING`):** Chỉ báo chỉ có 1 nguồn; tự hết hạn sau 72h; chỉ cảnh báo, không gây Tạm giữ.
2. **Lớp 2 — Kích hoạt (`ACTIVE`):** cần **≥2 Nguồn bằng chứng độc lập khác loại** (ví dụ Bằng chứng Phút 00 + đồ thị Chia nhỏ giao dịch; hai báo cáo cùng loại chỉ tính là một) và **Maker ≠ Checker** (`403` nếu cùng người, `400` nếu <2 nguồn). *Kế hoạch:* nguồn được ghi theo tiền tố `LOẠI:chi tiết` và đếm theo số loại khác nhau.
3. **Lớp 3 — Hạn hiệu lực (TTL):** 72h cho Cảnh báo mềm, 720h cho Chỉ báo đã Kích hoạt; hết hạn → `EXPIRED`.
4. **Lớp 4 — Khiếu nại & Thu hồi:** chủ thể bị gắn Chỉ báo gửi Khiếu nại; người xét là một Checker **khác** Checker đã Kích hoạt (đã làm; persona demo thứ hai `RISK_CHECKER_LAN` — Chị Lan). Kết quả: giữ nguyên (`UPHELD`) hoặc Thu hồi.

**Ràng buộc hiển thị & lưu trữ:**
* Chỉ báo chỉ hiện khi giá trị người dùng quét/nhập **trùng đúng**, với nội dung "rủi ro cao"; không công bố danh sách; mã thiết bị và IP không bao giờ hiển thị cho người dùng.
* Hết hạn TTL hoặc Thu hồi **chỉ gỡ cảnh báo**; hồ sơ điều tra và nhật ký kiểm toán được giữ (Luật PCRT Điều 38.2: lưu 05 năm).
* **Khối số liệu `/checker` (Kế hoạch):** hiển thị số đếm thô của phiên demo (số Vụ Minh oan, số Khiếu nại được chấp nhận, số Chỉ báo bị Thu hồi), gắn nhãn `MẪU MÔ PHỎNG`, không hiển thị phần trăm.

---

## 6. Ba Kịch bản Demo Mẫu (`MẪU MÔ PHỎNG`)

| Mã | Nhân vật & Bối cảnh | Luồng chạy trên Live Demo | Kết quả chứng minh với BGK |
| :--- | :--- | :--- | :--- |
| **CASE-01** *(Ca chính)* | **Bác Hùng (62 tuổi)** — bị giả Công an qua Zalo gửi ảnh *"Lệnh bắt tạm giam"* giả, ép giữ bí mật với con và chia 38 triệu thành **4 lệnh 9,5 triệu** để lọt dưới ngưỡng xác thực sinh trắc học. | B2C quét ảnh Zalo → Tạm giữ (Bảo vệ 24h) → Chị Minh (Người giám hộ) Chuyển cấp → War-Room chạy 4 Agent phát hiện cụm Ví trung gian dùng chung máy Android → **Maker → Checker** Kích hoạt Chỉ báo (TTL 720h) → người dùng mới nhập trúng số TK thấy cảnh báo rủi ro cao. | Trọn vòng lặp 4 nhịp + Maker–Checker + đo độ trễ thực tế. |
| **CASE-02** *(An ninh mạng)* | Minh Anh (21 tuổi) nhận tin nhắn hướng dẫn cài **bản cập nhật VNeID giả** (`.apk`) có quyền điều khiển từ xa và yêu cầu bật `Accessibility Services` — chỉ dạng văn bản, tên miền hư cấu `.example`, gắn `MẪU MÔ PHỎNG`, lời khuyên chỉ cài VNeID từ kho ứng dụng chính thức. | B2C quét ảnh → phát hiện dấu hiệu dụ cài APK → cảnh báo bảo vệ thiết bị + Báo cáo An ninh mạng sang B2E → 1 nguồn nên chỉ được Cảnh báo mềm (`400` nếu ép `ACTIVE`). | Độ phủ **An ninh mạng** bên cạnh lừa đảo chuyển tiền. |
| **CASE-03** *(Chống chặn oan)* | **Chị Hoa (tiểu thương livestream)** — bị luật cứng gắn cờ vì nhận 35 giao dịch nhỏ trong 1 giờ tối. | War-Room → 4 Agent → **`False-Positive Defender`** chỉ ra 14 tháng bán hàng sạch, thiết bị chính chủ, không có Bằng chứng Phút 00 → khuyến nghị **Minh oan**. | AI không chỉ biết chặn mà bảo vệ tiểu thương hợp pháp. |

---

## 7. Ranh giới Minh bạch: Phần Làm Thật vs. Phần Mô Phỏng

| Thành phần | Trạng thái | Ghi chú minh bạch cho BGK & `README` |
| :--- | :--- | :--- |
| Quét ảnh chat/văn bản bằng Multimodal Vision LLM & phân tích 4 đòn tâm lý | **Chạy thật online** | BGK dùng ảnh mẫu hoặc tải ảnh tự chụp. Trả `503 LLM_NOT_CONFIGURED` nếu thiếu khóa. |
| Ẩn PII (CCCD, SĐT, số dư, lịch sử chi tiêu) trước khi chuyển Người giám hộ & B2E | **Chạy thật online** (phía máy chủ) | Ẩn PII hiện chạy **trên máy chủ sau khi** ảnh đã gửi tới LLM. Ẩn PII trên thiết bị là điều kiện trước khi dùng thật (mục 9). |
| 4 AI Agent + `False-Positive Defender` + Validate JSON Schema | **Chạy thật online** | Đo `latency_ms` từng Agent. |
| Đồ thị dòng tiền + Maker → Checker + TTL + Khiếu nại/Thu hồi + Giải phóng khi hết hạn/Minh oan | **Chạy thật online** | Lưu trạng thái thật vào CSDL theo phiên demo. |
| Cổng thanh toán, API SIMO thật, lịch sử giao dịch 3 nhân vật | **Mô phỏng (`MẪU MÔ PHỎNG`)** | Dữ liệu tổng hợp, khai báo trong `README`. |
| Hạ tầng & mô hình AI | **Độc lập nhà cung cấp** qua `LLMProvider` (`bedrock` / `gemini` / `openai`) | Hiện chạy Vercel + Gemini. *Kế hoạch (bắt buộc cho cuộc thi):* chuyển sang **AWS Sandbox** — `LLM_BACKEND=bedrock`, Docker trên EC2/Amplify `ap-southeast-1`; giữ Vercel làm bản dự phòng. |

---

## 8. Nguyên tắc nội dung hiển thị

* Không nhân danh NHNN, Công an, Tòa án hay cơ quan nhà nước nào.
* Không gọi ai là "lừa đảo": dùng "rủi ro cao"; phán quyết của B2E là **Kết luận rủi ro cao**, vì MoMo không có thẩm quyền kết luận tội phạm.
* Không tiết lộ việc đã gửi báo cáo giao dịch đáng ngờ (Luật PCRT Điều 40.2).
* Không in số hotline trình báo (113, 156, A05) khi chưa xác minh từ nguồn chính thức.
* Mọi kịch bản và bản ghi mẫu gắn nhãn `MẪU MÔ PHỎNG`.

---

## 9. Căn cứ pháp lý (đã xác minh)

Chi tiết từng điều khoản và mức độ tin cậy ([VB] đã đọc nguyên văn, [TC] nguồn thứ cấp, chưa xác minh điều khoản): **[RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md)**. Không phải tư vấn pháp lý.

| Tính năng | Căn cứ | Ghi chú |
| :--- | :--- | :--- |
| Bảo vệ 24h | TT 40/2024/TT-NHNN Điều 19.1.l, 28.1.c.(iii) [VB] | Phải nằm trong thỏa thuận ví; tách bạch với trì hoãn theo Luật PCRT Điều 44. |
| Đồng ý cho Lượt quét & Người giám hộ | Luật 91/2025 Điều 9.4, 15.2.b [VB]; TT 40 Điều 19.1.n.(i) [VB]; "không tích sẵn mặc định" theo NĐ 356/2025 [TC] | Đồng ý từng mục đích; im lặng không phải đồng ý; người giám hộ cũng phải đồng ý. |
| Người giám hộ không Giải phóng tiền | TT 40 Điều 28.1.a.(iv) [VB] | Người giám hộ không phải người được ủy quyền. |
| Ẩn PII | Luật 91 Điều 3.2, 30.1 [VB]; danh mục dữ liệu nhạy cảm theo NĐ 356 [TC] | Ẩn SĐT là tối thiểu hóa dữ liệu. |
| Gửi dữ liệu tới LLM ngoài VN | Luật 91 Điều 20.1.c, 20.2, 21.1 [VB] | **MVP hiện gửi ảnh người dùng tải lên tới LLM đặt ngoài VN** (Gemini/Bedrock) — đây là chuyển dữ liệu xuyên biên giới. Điều kiện trước khi dùng thật: hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới, DPIA, thỏa thuận bên xử lý cấm huấn luyện, và Ẩn PII trên thiết bị. |
| Phát hiện Chia nhỏ giao dịch & Ví trung gian | Luật PCRT 2022 Điều 29 khoản 2, 3, 9 [VB]; TT 40 Phụ lục 01 lý do 3, 8 [VB] | Ngưỡng 10 triệu/lần, 20 triệu/ngày là **ngưỡng xác thực sinh trắc học**, nay nằm trong TT 50/2024/TT-NHNN sửa bởi TT 77/2025 [TC, chưa xác minh phụ lục]. **QĐ 2345/QĐ-NHNN đã bị bãi bỏ** bởi QĐ 2872/QĐ-NHNN từ 01/01/2025. |
| Con người ra phán quyết | Luật 134/2025 Điều 4.2 [VB]; Điều 7.4 (cấm vô hiệu hóa giám sát của con người) | Agent chỉ khuyến nghị. |
| Nhãn "Đánh giá do AI" (Lộ trình) | Luật 134 Điều 11.1 [VB] | Người dùng phải nhận biết đang tương tác với AI. |
| Hiển thị Chỉ báo cho người dùng khác | Luật 91 Điều 19.1.b, 16.2.c, 19.2 [VB]; TT 40 Điều 37.1.e [VB] | Chỉ khi trùng đúng giá trị; không công bố danh sách. |
| Khiếu nại (Lớp 4) & Yêu cầu xét lại tạm giữ | Luật 91 Điều 19.2.d, 4.1.đ [VB]; TT 53/2026/TT-NHNN [TC, chưa xác minh điều khoản] | TT 53/2026 chỉ được trích cho "con người xem xét lại quyết định tự động bị khách hàng khiếu nại" (và ghi nhật ký, giám sát của con người). TT 53 **không** quy định ≥2 nguồn, Maker–Checker hay TTL. |
| Lưu hồ sơ sau Thu hồi/hết hạn | Luật PCRT Điều 38.2 [VB] | Lưu 05 năm; chỉ gỡ cảnh báo. |
| B2E hủy giao dịch bị giữ (Kế hoạch) | TT 40 Điều 28.1.c.(iii), 19.1.e.(iii) [VB]; Luật PCRT Điều 26, 37 [VB] | Chỉ hủy lệnh chưa thực hiện; không thu hồi tiền đã đi; gửi báo cáo giao dịch đáng ngờ đúng hạn. |
| Phát hiện link APK trong ảnh chat | TT 77/2025 [TC] yêu cầu app **tự bảo vệ trước can thiệp thiết bị** | Phát hiện APK trong ảnh chat là **mở rộng của sản phẩm**, không phải nghĩa vụ của TT 77. |

---

## 10. Lộ trình

### Thứ tự ưu tiên tới chung kết (11/12/2026)
1. **Sửa nội dung & căn cứ pháp lý** (tài liệu, câu chữ trên UI, kho `data/vnPolicies.json`).
2. **Chuyển sang AWS Sandbox** (bắt buộc cho cuộc thi): `LLM_BACKEND=bedrock`, Docker trên EC2/Amplify `ap-southeast-1`; Vercel giữ làm dự phòng.
3. **Nút "Yêu cầu xét lại tạm giữ"**.
4. **Deploy + đo độ trễ thực tế** vào [MEASURED_LATENCIES.md](./MEASURED_LATENCIES.md).
5. **Tính năng từ luật** (danh sách bên dưới), làm được tới đâu ghi rõ tới đó.
6. **Pitch** (10 trang PDF, nộp trước 03/12/2026).

### Kế hoạch (đã chốt, chưa xây)
`CANCELLED_BY_B2E` khi Kết luận rủi ro cao · Yêu cầu xét lại tạm giữ · hạn 03 ngày làm việc cho Vụ đã Chuyển cấp · Nguồn bằng chứng ghi theo `LOẠI:chi tiết` và đếm theo loại · khối số đếm thô trên `/checker` · làm sạch `data/vnPolicies.json` · chuyển sang AWS.

### Tính năng xuất phát từ luật (chưa xây)
* **Hướng dẫn trình báo đúng luật:** Công an cấp xã/Đồn Công an có trách nhiệm tiếp nhận tố giác và không được từ chối; người tố giác được thông báo kết quả (BLTTHS Điều 145, 146.3, 147 [VB]). Không in số hotline chưa xác minh.
* **Bàn giao báo cáo giao dịch đáng ngờ** kèm đồng hồ hạn chót (Luật PCRT Điều 26, 37 [VB]) và cờ cấm tiết lộ (Điều 40.2).
* **Đồng bộ SIMO hằng tháng** trước ngày 10 (TT 40 Điều 30.2 [VB]).
* **Trung tâm quyền dữ liệu** cho người dùng (Luật 91 Điều 4.1, 9.4, 10, 14 [VB]).
* **Nhãn "Đánh giá do AI" + nút "Nhờ người thật xem lại"** (Luật 134 Điều 11.1, 4.2 [VB]).
* **Sổ tay ứng phó sự cố dữ liệu 72 giờ** (Luật 91 Điều 23.1 [VB]).

### Lộ trình sản phẩm sau cuộc thi
* Phân tích âm thanh cuộc gọi.
* Hội thoại nhiều lượt giúp người dùng bình tĩnh lại (de-escalation chat).
* Ẩn PII trên thiết bị; hồ sơ đánh giá tác động trước khi dùng LLM ngoài VN.

### Pilot Người giám hộ — KPI đề xuất (chỉ nêu trong pitch, không tính trong app)
Người giám hộ là **giả thuyết**. Đề xuất đo trong pilot: (1) tỷ lệ giao dịch bị giữ được Người giám hộ Chuyển cấp; (2) tỷ lệ người dùng tự hủy sau khi Người giám hộ đã xem thẻ; (3) so sánh tỷ lệ hủy giữa nhóm có và không có Người giám hộ.

---

## 11. Dàn ý Slide 10 Trang (PDF cố định cho cả Sơ khảo & Chung kết)

> *Nguyên tắc: tối đa 10 trang PDF (không sửa sau hạn 03/12/2026), mỗi trang 1 câu chốt, câu chuyện **Bác Hùng** xuyên suốt Slide 2–9, mọi số liệu có dòng nguồn ở chân trang và lấy từ mục 3.1.*

1. **Slide 1 — Trang bìa MoMo TrustLoop:** *Khép kín vòng phòng vệ niềm tin số: từ ảnh chat Zalo Phút 00 đến đội điều tra 4 Agent và Miễn dịch Cộng đồng có kiểm soát.*
2. **Slide 2 — Điểm mù Phút 00–88 qua câu chuyện Bác Hùng:** *Sinh trắc học chứng minh đúng người đang thao tác, nhưng không chứng minh người đó không bị thao túng: Bác Hùng tự quét mặt chuyển tiền ở Phút 89 sau 88 phút bị thao túng trên Zalo.* *(Nguồn: MoMo 05/2026; NCA 01/2026; Bộ Công an qua SGGP 12/2025 và NCA 12/2024 — ghi rõ hai phương pháp).*
3. **Slide 3 — Đã có gì và còn thiếu gì:** *SIMO và MoMo đã cảnh báo tài khoản nhận tiền rất tốt; khoảng trống còn lại là Phút 00 khi tài khoản còn "sạch" và một quy trình khiếu nại minh bạch.* *(Nguồn: CafeF/NHNN 10/2026; MoMo 05/2026; NCA 01/2026 — 32,12% trình báo).*
4. **Slide 4 — Giải pháp: Vòng lặp 4 Nhịp MoMo TrustLoop:** *"Bảo hiểm bù 2 triệu sau khi mất, TrustLoop giữ lại 15 triệu trước khi mất."*
5. **Slide 5 — Trụ cột 1 (B2C): Quét Ảnh Phút 00 & Bảo vệ 24h:** *AI chỉ ra lệnh giả ngay trước khi Bác Hùng chuyển tiền; Tạm giữ chỉ xảy ra vì chính Bác đã bật Bảo vệ 24h, và Bác luôn tự hủy được.*
6. **Slide 6 — Trụ cột 2 (B2E): Phòng Tác chiến 4 Agent có Tranh biện:** *4 AI Agent gom Bằng chứng Phút 00, vẽ đồ thị chia nhỏ lệnh 9,5 triệu và tranh biện hai chiều để Chuyên viên con người ra phán quyết.*
7. **Slide 7 — AI Không Chỉ Biết Chặn: 3 Kịch bản:** *Độ tin cậy của AI được đo bằng khả năng Minh oan cho Chị Hoa ngang bằng khả năng bắt đường dây lừa Bác Hùng và APK giả.*
8. **Slide 8 — Trụ cột 3: Miễn dịch Cộng đồng có trách nhiệm:** *Thiết kế quản trị 4 lớp của TrustLoop: Cảnh báo mềm → ≥2 nguồn khác loại & Maker–Checker → TTL → Khiếu nại do người thật xét & Thu hồi.* *(Căn cứ khiếu nại: Luật 91 Điều 19.2; TT 53/2026 — người thật xem xét lại quyết định tự động bị khiếu nại [nguồn báo chí, chưa xác minh điều khoản]).*
9. **Slide 9 — Kiến trúc, Ranh giới Thật/Mô phỏng & Số đo Thực tế:** *Kiến trúc độc lập hạ tầng, chạy trên AWS, minh bạch phần chạy thật và chỉ báo cáo thời gian phản hồi đo trực tiếp.* *(Điền số đo thật trước khi xuất PDF).*
10. **Slide 10 — Tác động, Tuân thủ & Lộ trình:** *Thu hẹp điểm mù Phút 00–88, nâng năng suất Risk/CSKH, căn cứ pháp lý đã đối chiếu (TT 40/2024, Luật PCRT 2022, Luật 91/2025, Luật 134/2025), pilot Người giám hộ với KPI đo được.*
