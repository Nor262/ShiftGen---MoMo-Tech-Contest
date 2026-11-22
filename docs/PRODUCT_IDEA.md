# MoMo TrustLoop v2 — Ý Tưởng Sản Phẩm Chi Tiết
> **Cuộc thi:** MoMo Tech Contest 2026 — *"Imagine the Future Workspace (Human Centered. AI Powered)"*
> **Mục tiêu:** Xây dựng Live MVP chạy trực tuyến ổn định trong 10 ngày (phạm vi hẹp mà sâu, kiểm chứng trực tiếp trên trình duyệt).
> **Độ phủ chủ đề (3/3):** Chống lừa đảo (Anti-Scam) + An ninh mạng (Cybersecurity) + Trợ lý AI (Agentic AI B2C & Multi-Agent B2E).

---

## 1. Tóm tắt Điều hành (Executive Summary)

**MoMo TrustLoop** là hệ sinh thái phòng vệ niềm tin số khép kín gồm **3 trụ cột cứng**, nối liền **tuyến đầu người dùng cá nhân & gia đình (B2C)** với **không gian làm việc điều tra gian lận & hỗ trợ khách hàng (B2E Future Workspace)**:

1. **Quét Ảnh Chat Phút 00 & Bảo vệ 24h Chủ động (B2C):** Nhận diện văn bản giả mạo, đòn thao túng tâm lý và đường link dụ cài mã độc `.apk` ngay từ ảnh chụp Zalo/Facebook trước khi mở ví; áp dụng chế độ **Tạm giữ Xác minh Bảo mật 24h do người dùng đồng ý trước (Opt-in)** và chuyển thẻ duyệt đã ẩn thông tin cá nhân nhạy cảm (PII) sang màn hình **Family Co-Sign**.
2. **Phòng Tác chiến 4 Agent có Phản biện (B2E War-Room):** Điều phối song song 4 AI Agent chuyên biệt (`Graph & Smurfing Tracer`, `Pre-App Evidence Correlator`, `Compliance RAG`, và **`False-Positive Defender`**) để vừa truy vết đường dây chia nhỏ giao dịch/ví trung gian (*mule*), vừa chủ động minh oan cho giao dịch hợp pháp nhằm tránh khóa oan người dùng thật; kèm **Thẻ Bàn giao CSKH Thấu cảm** ngay trên cùng màn hình.
3. **Vòng lặp Miễn dịch Cộng đồng Có Trách nhiệm (4-Layer Governance):** Chỉ báo lừa đảo sau khi vượt qua quy trình kiểm soát 4 lớp (**Cảnh báo mềm → Ngưỡng ≥2 nguồn & Duyệt 2 cấp Maker–Checker → Thời hạn hiệu lực TTL → Khiếu nại người thật rà soát & Rollback tức thì**) được đồng bộ ngược về B2C để bảo vệ người dùng kế tiếp.

---

## 2. Bài toán, Điểm mù & Bảng Số liệu Đã Kiểm chứng Nguồn

MoMo đã đạt cú đúp giải thưởng tại **AI Awards 2026** (05/11/2026) với giải pháp *"Xây dựng và bảo vệ niềm tin số bằng AI"*, bảo vệ rất tốt trong ứng dụng (**"Phút 89"**). **MoMo TrustLoop** không làm lại phần MoMo đã có, mà lấp 3 khoảng trống thực tế đã được chính MoMo và cơ quan quản lý ghi nhận:

| Dữ kiện / Số liệu sử dụng | Nguồn trích dẫn chính thức (ghi trực tiếp trên Slide) | Vai trò lập luận |
| :--- | :--- | :--- |
| MoMo phân tích **>1.000 tín hiệu/giao dịch**, phát hiện **gần 29.000 GD đáng ngờ/ngày**, cảnh báo **>10.000 người dùng/ngày**, **99,5%** tạm dừng cân nhắc, bảo vệ **>15.000 tỷ đồng** (2025) | Thông cáo báo chí MoMo (14/05/2026); Báo Tuổi Trẻ (13/11/2026); Tạp chí Thị trường Tài chính Tiền tệ (17/11/2026) | Xác lập điểm xuất phát mạnh của MoMo ở Phút 89 — tránh trùng lặp. |
| **Thách thức "Phút 89"**: ứng dụng tài chính đơn lẻ bị mù trước chuỗi thao túng diễn ra trước đó trên mạng xã hội, app nhắn tin, cuộc gọi | Thông cáo báo chí MoMo (14/05/2026); Tham luận Giám đốc AI & Dữ liệu MoMo — Tạp chí TTTCTT (17/11/2026) | Lý do bắt buộc phải có **Trụ cột 1 (Quét Ảnh Phút 00)**. |
| Thiệt hại lừa đảo trực tuyến năm 2025 tại Việt Nam **vượt 8.000 tỷ đồng** | Thống kê Bộ Công an (dẫn trên VOV & Báo Pháp Luật Việt Nam) | Quy mô thiệt hại thực tế vẫn ở mức nghìn tỷ đồng. |
| **Mạo danh công an** là thủ đoạn phổ biến **#1** năm 2025; **chỉ 32,12%** nạn nhân trình báo công an và **12,03%** chấp nhận mất tiền không hành động | Khảo sát An ninh mạng 2025 của Hiệp hội An ninh mạng Quốc gia (NCA, n = 60.300), dẫn trên Báo Nhân Dân (06/01/2026) & Tạp chí An toàn thông tin (12/01/2026) | Lý do chọn ca chính **Bác Hùng bị giả công an** và chứng minh độ trễ dữ liệu trình báo của danh sách đen tĩnh. |
| Tấn công **Deepfake chiếm 21%** sự cố an ninh mạng tại Việt Nam (so với **11%** toàn cầu và **14%** APAC) | Khảo sát toàn cầu Kaspersky (công bố 19/11/2026), dẫn trên VietNamNet (20/11/2026) | Rủi ro giả mạo công nghệ cao đặc biệt nghiêm trọng tại VN. |
| **34,13%** người dùng di động VN gặp sự cố mã độc năm 2025 (**62.952** loại mới); mã độc **RedHook** (08/2026) và **RatHat** dùng AI (09/2026) lạm dụng quyền `Accessibility Services` | NCA nTrust & Kaspersky (VietNamNet, 14/11/2026); Cổng TTĐT Chính phủ (26/08/2026); Báo Nhân Dân (21/09/2026) | Căn cứ cho **Kịch bản #2 (Shipper/APK chiếm quyền)**. |
| Sinh trắc học tại nhiều ngân hàng vẫn bị vượt qua trong nhiều trường hợp; **truy vết tài khoản lừa đảo mất 1–2 ngày** | Thượng tá Triệu Mạnh Tùng (Phó Cục trưởng Cục A05, Bộ Công an) — VnExpress (22/10/2026) | Lý do cần giữ chậm 24h (opt-in) và tăng tốc điều tra nội bộ B2E. |
| **Hệ thống SIMO (NHNN):** kết nối gần 100 TCTD, >668.000 TK nghi vấn; đến 10/2026 cảnh báo 5,8 triệu lượt, gần 1,9 triệu lượt dừng/hủy, bảo vệ gần 7.200 tỷ đồng | Ông Hoàng Minh Tiến (Phó Cục trưởng Cục CNTT, NHNN) — Báo SGGP & Doanh nghiệp Tiếp thị (11/2026) | Bối cảnh liên kết cảnh báo gian lận liên ngân hàng. |
| **85%** người Việt sẵn sàng trao đổi vấn đề tài sản trong gia đình (**74%** vợ/chồng, **40%** bố mẹ) | Nghiên cứu UOB ACSS lần thứ 7 (công bố 18/11/2026), dẫn trên CafeF | Căn cứ văn hóa cho tính năng **Family Co-Sign**. |
| Mặt bằng toàn cầu: **90–95%** cảnh báo giám sát giao dịch AML là dương tính giả (*chú thích rõ là số liệu ngành toàn cầu, không phải số nội bộ MoMo*) | Databricks Financial Services Blog | Lý do thiết kế **`False-Positive Defender`** & **Kịch bản #3**. |
| **Bài học Klarna (2025):** CEO thừa nhận tự động hóa CSKH chạy theo chi phí làm giảm chất lượng và phải tuyển lại nhân sự người thật linh hoạt | Bloomberg (08/05/2025) & Reuters (10/09/2025), tổng hợp trên BankingNewsAI | Lý do bắt buộc giữ **Human-in-the-Loop** & **Thẻ CSKH Thấu cảm**. |
| **Khung pháp lý VN 2024–2026:** QĐ 2345/QĐ-NHNN (01/07/2024); Luật BVDLCN 91/2025 & NĐ 356/2025 (01/01/2026); Luật AI 134/2025 (01/03/2026); TT 77/2025 (01/03/2026); TT 53/2026 (15/11/2026) | Thư viện Pháp luật; Công báo Chính phủ số 40; Thời báo Ngân hàng (16/11/2026); EY Vietnam Legal Alert (03/2026) | Neo thiết kế sản phẩm vào tuân thủ pháp lý ngay từ đầu (*Compliance-by-Design*). |

> **Cam kết trung thực số liệu Demo:** Tài liệu và Slide **tuyệt đối không** cam kết các chỉ số chưa đo đạc (như "<1 giây", "độ tin cậy 99%", "<15 giây"). Hệ thống tích hợp **đồng hồ đo độ trễ thực tế (`latency_ms`)** ngay trên giao diện Demo để ghi nhận và trích dẫn đúng số đo thật trước khi xuất PDF.

---

## 3. Vòng lặp Phòng vệ 4 Nhịp (Closed-Loop Architecture)

```text
[NHỊP 1 — B2C Phút 00]
Người dùng tải ảnh chat Zalo / văn bản / link APK
   │ -> AI Vision + NLP bóc trần giả mạo & 4 đòn tâm lý (gộp giải thích dễ hiểu)
   │ -> Kích hoạt Chế độ Tạm giữ Xác minh Bảo mật 24h (Opt-in minh bạch, KHÔNG giả danh cơ quan nhà nước)
   ▼
[NHỊP 2 — Cầu nối B2C → Family → B2E]
Lớp che mờ PII (ẩn CCCD, SĐT, số dư theo Luật 91/2025)
   │ -> Đẩy sang 1 màn hình duyệt đơn giản của Family Co-Sign (Chị Minh)
   │ -> Đẩy Gói Bằng chứng Phút 00 (đã ẩn PII) nối thẳng vào hàng đợi Risk Ops
   ▼
[NHỊP 3 — B2E FinCrime War-Room (Future Workspace)]
4 AI Agent chạy song song (Strict JSON Schema):
  (1) Graph & Smurfing Tracer     (2) Pre-App Evidence Correlator
  (3) Compliance & Policy RAG     (4) False-Positive Defender (Chống chặn oan!)
   │ -> Đồ thị dòng tiền tương tác + Thẻ tóm tắt bàn giao CSKH Thấu cảm (trên cùng 1 màn hình)
   │ -> Chuyên viên con người ra phán quyết cuối (Human-in-the-Loop chuẩn TT 53/2026)
   ▼
[NHỊP 4 — Miễn dịch Cộng đồng Có Kiểm soát 4 Lớp]
Cảnh báo mềm (1 nguồn) → Ngưỡng ≥2 nguồn + Maker–Checker (2 cấp duyệt) → Hạn TTL → Khiếu nại & Rollback tức thì
   │ -> Đồng bộ vào Kho Chỉ báo Miễn dịch dùng chung
   └─► Quay lại NHỊP 1: Người dùng mới quét lại tài khoản/mẫu giả lập tức thấy Cảnh báo cộng đồng!
```

---

## 4. Thiết kế Chi tiết 3 Trụ cột Cứng (Phạm vi Tinh gọn 10 Ngày)

### Trụ cột 1 (B2C): Quét Ảnh Chat Phút 00, Giữ chậm 24h Minh bạch & Family Co-Sign
* **Gộp liền mạch quét ảnh & phá thao túng:** Không tách rời thành 2 màn hình rời rạc và **bỏ hoàn toàn xử lý âm thanh/Transcribe** để tập trung làm cực sâu luồng ảnh chụp màn hình (Zalo/Facebook/SMS/lệnh giả/hướng dẫn cài APK).
* **Phân tích 2 lớp trên cùng màn hình:**
  * *Pháp y Thị giác:* Nhận diện lỗi thể thức văn bản công quyền giả (dấu ghép, phông chữ, sai thẩm quyền), biên lai chỉnh sửa hoặc ảnh chứa đường dẫn tải tệp `.apk` yêu cầu bật `Accessibility Services`.
  * *Phân tích Tâm lý & Giải thích Ấm áp:* Tô sáng 4 tín hiệu thao túng (*đe dọa/gây sợ hãi, ép thời gian gấp, cô lập cấm báo người nhà, dụ cài phần mềm ngoài*) kèm lời khuyên cỡ chữ lớn, dễ hiểu cho người cao tuổi.
* **Cơ chế Tạm giữ Xác minh Bảo mật 24h Minh bạch (thay thế hoàn toàn ý tưởng Decoy cũ):**
  * **Bắt buộc đồng ý trước (Pre-consented Opt-in):** Người dùng chủ động bật chế độ *"Bảo vệ Giao dịch Rủi ro cao 24h"* trong cài đặt và đồng ý rõ ràng việc tạm giữ 24h + báo người thân tin cậy khi gặp giao dịch rủi ro cao (tuân thủ nguyên tắc đồng ý minh bạch của Luật BVDLCN 91/2025).
  * **Thông báo trung tính, trung thực 100%:** Nếu người dùng vẫn bấm chuyển tiền khi đang bị áp lực, màn hình hiển thị đúng bản chất: **`"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)"`** — tuyệt đối không nói dối người dùng hay gán cho Ngân hàng Nhà nước/cơ quan công quyền.
  * **Toàn quyền hủy khi an toàn:** Trong chi tiết giao dịch tạm giữ, giải thích từng dấu hiệu rủi ro cụ thể kèm nút **"Hủy giao dịch — Hoàn tiền về ví ngay"**.
* **Màn hình Family Co-Sign tối giản (1 màn hình duyệt):** Chỉ hiển thị khi có giao dịch rủi ro cao; tuyệt đối **không** hiển thị số dư hay lịch sử chi tiêu thường ngày của bố mẹ; che mờ PII (CCCD, SĐT); chỉ có 3 nút: **[Xác nhận tạm giữ 24h]**, **[Báo khẩn về MoMo Risk]**, **[Gọi kiểm tra người thân]**.

### Trụ cột 2 (B2E): Phòng Tác chiến 4 Agent có Phản biện & Thẻ CSKH
* **4 Agent chạy song song trên backend gọn nhẹ** (dùng `Promise.allSettled` thay vì Step Functions phức tạp, nhưng vẫn khóa chặt JSON Schema từng Agent + hỗ trợ SSE streaming):
  1. `Graph & Smurfing Tracer`: Phân tích đồ thị giao dịch–thiết bị–IP để nhận diện chia nhỏ giao dịch dưới ngưỡng 10 triệu/lần – 20 triệu/ngày (QĐ 2345) và cụm ví trung gian (*mule ring*).
  2. `Pre-App Evidence Correlator`: Đọc trực tiếp **Gói Bằng chứng Phút 00** gửi lên từ B2C (nội dung ảnh giả, số TK kẻ gian nhắn trên Zalo, cờ APK) để khớp với giao dịch nghi vấn và cờ cảnh báo SIMO mô phỏng.
  3. `Compliance & Policy RAG`: Đối chiếu quy chế nội bộ, điều khoản *Bảo hiểm An toàn chuyển tiền* (≤2 triệu đồng, các trường hợp loại trừ) và quy định Thông tư 53/2026/TT-NHNN từ kho chunk `vnPolicies.json` qua BM25 retriever.
  4. **`False-Positive Defender` (Điểm sáng tạo cốt lõi):** Chủ động tìm chứng cứ bảo vệ người dùng hợp pháp (lịch sử bán hàng sạch, khung giờ livestream ổn định, thiết bị chính chủ) để phản biện chống khóa oan.
* **Thẻ Bàn giao CSKH Thấu cảm (tích hợp ngay trong War-Room, không dựng app CSKH riêng):** Tóm tắt ngắn trong 1 khung bên cạnh quyết định Risk gồm: mức độ lo lắng của khách hàng, trạng thái tiền đang an toàn 100%, và 3 gợi ý mở lời đồng cảm để chuyên viên CSKH người thật gọi hỗ trợ (tránh lặp lại bài học của Klarna và đúng chuẩn Thông tư 53/2026).

### Trụ cột 3 (Closed-Loop): Quản trị Miễn dịch Cộng đồng 4 Lớp (Responsible AI)
Để loại bỏ hoàn toàn rủi ro một chuyên viên bấm nhầm dẫn tới chặn oan trên diện rộng:
1. **Lớp 1 — Cảnh báo mềm trước (Soft Warning):** Chỉ báo mới từ 1 ca đơn lẻ chỉ tạo cảnh báo tham khảo (*"Tài khoản đang có tín hiệu rủi ro cần kiểm chứng"*), không chặn cứng tài khoản.
2. **Lớp 2 — Ngưỡng bằng chứng tối thiểu + Duyệt 2 cấp (Maker – Checker):** Chỉ được nâng cấp lên **Cảnh báo Rủi ro Cao toàn cộng đồng** khi thỏa mãn đồng thời:
   * Có **≥ 2 nguồn bằng chứng độc lập** (ví dụ: bằng chứng ảnh Phút 00 **+** tín hiệu đồ thị chia nhỏ lệnh/chung thiết bị, *hoặc* ≥ 2 báo cáo từ nạn nhân độc lập).
   * Qua 2 tài khoản vai trò tách biệt: **Maker** (Chuyên viên Risk tuyến 1 đề xuất) → **Checker** (Quản lý ca/Chuyên viên cao cấp kiểm tra và phê duyệt).
3. **Lớp 3 — Thời hạn hiệu lực (TTL):** Mọi chỉ báo đều có ngày hết hạn tự động (**72 giờ** cho cảnh báo tạm thời, **30 ngày** cho cụm tài khoản có bằng chứng đa nguồn) và tự hết hiệu lực nếu không được tái xác minh.
4. **Lớp 4 — Khiếu nại do Con người rà soát & Rollback tức thì:** Cung cấp luồng gửi khiếu nại có chuyên viên người thật rà soát lại (theo Thông tư 53/2026/TT-NHNN) và nút **Thu hồi tức thì (`Rollback`)** gỡ cảnh báo ngay trên toàn hệ thống B2C kèm lưu vết kiểm toán bất biến.

---

## 5. Ba Kịch bản Demo Mẫu (100% Dữ liệu Mô phỏng Tổng hợp Hợp lệ)

| Mã | Nhân vật & Bối cảnh | Luồng chạy trên Live Demo | Kết quả chứng minh với BGK |
| :--- | :--- | :--- | :--- |
| **CASE-01** *(Ca chính xuyên suốt)* | **Bác Hùng (62 tuổi)** — Bị giả Công an qua Zalo gửi ảnh *"Lệnh bắt tạm giam"* giả, ép giữ bí mật với con và chia nhỏ 38 triệu thành **4 lệnh 9,5 triệu** né sinh trắc học QĐ 2345. | B2C quét ảnh Zalo → kích hoạt Giữ chậm 24h (opt-in) → Chị Minh duyệt Family Co-Sign → War-Room chạy 4 Agent phát hiện cụm ví *mule* dùng chung máy Android → **Maker → Checker** phát hành chỉ báo miễn dịch (TTL 72h) → Người dùng mới quét lại nhận cảnh báo ngay. | Chứng minh trọn vẹn vòng lặp 4 nhịp + quản trị duyệt 2 lớp + đo độ trễ thực tế. |
| **CASE-02** *(An ninh mạng)* | **Minh Anh (21 tuổi)** — Nhận tin nhắn Zalo giả shipper/dịch vụ công gửi link tải tệp `.apk` yêu cầu bật quyền `Accessibility Services`. | B2C quét ảnh tin nhắn → phát hiện dấu hiệu dụ cài mã độc chiếm quyền Android (mô thức hành vi kiểu RedHook/RatHat) → cảnh báo đỏ bảo vệ thiết bị + đẩy dấu hiệu domain/URL giả sang hàng đợi B2E. | Chứng minh độ phủ chủ đề **An ninh mạng** bên cạnh lừa đảo chuyển tiền. |
| **CASE-03** *(Chống chặn oan)* | **Chị Hoa (tiểu thương bán livestream)** — Bị hệ thống luật cứng gắn cờ vì nhận 35 giao dịch nhỏ liên tiếp trong 1 giờ tối. | Mở thẳng trên War-Room → 4 Agent chạy song song → **`False-Positive Defender`** chỉ ra 14 tháng lịch sử bán hàng sạch, thiết bị chính chủ, không có bằng chứng Phút 00 tiêu cực → Đề xuất **Đóng cảnh báo giả**. | **Điểm chốt ăn điểm:** Chứng minh AI có tư duy phản biện, không chỉ biết chặn mà bảo vệ đúng tiểu thương vô tội. |

---

## 6. Ranh giới Minh bạch: Phần Làm Thật vs. Phần Mô Phỏng

| Thành phần | Trạng thái trong Live MVP 10 ngày | Ghi chú minh bạch cho BGK & `README` |
| :--- | :--- | :--- |
| Quét ảnh chat/văn bản giả bằng Multimodal Vision LLM & phân tích 4 đòn tâm lý | **Chạy thật 100% online** | BGK có thể dùng ảnh mẫu 1 chạm **hoặc tải lên ảnh tự chụp bất kỳ**. |
| Lớp ẩn/lọc PII (CCCD, SĐT, số dư) trước khi chuyển Family & B2E | **Chạy thật 100% online** | Kiểm chứng trực tiếp bằng đối chiếu dữ liệu gốc vs dữ liệu đã ẩn PII. |
| 4 AI Agent chạy song song + tranh biện `False-Positive Defender` + Validate JSON Schema | **Chạy thật 100% online** | Gọi LLM thực tế theo từng Agent với đo thời gian `latency_ms` từng Agent. |
| Đồ thị dòng tiền tương tác + Quy trình Maker → Checker + TTL + Rollback + Vòng miễn dịch ngược về B2C | **Chạy thật 100% online** | Lưu trạng thái thật vào CSDL; thử `Publish` và `Rollback` có hiệu lực tức thì. |
| Cổng thanh toán ngân hàng, API SIMO thật, dữ liệu lịch sử giao dịch 3 nhân vật | **Mô phỏng bằng dữ liệu tổng hợp (Synthetic Data)** | Khai báo rõ nguồn dữ liệu tổng hợp 100% trong `README` theo thể lệ cuộc thi. |
| Hạ tầng Cloud & Mô hình AI | **Độc lập nhà cung cấp (Cloud & LLM-Agnostic)** | Thiết kế qua giao diện `LLMProvider`: sẵn sàng cắm AWS Bedrock, Google Gemini, hoặc OpenAI-compatible API qua biến môi trường. |

---

## 7. Dàn ý Slide 10 Trang (Chuẩn PDF cố định cho cả Sơ khảo & Chung kết)

> *Nguyên tắc trình bày: Tối đa 10 trang PDF (không được sửa sau hạn 03/12/2026), mỗi trang 1 câu chốt duy nhất, câu chuyện **Bác Hùng** xuyên suốt từ Slide 2 đến Slide 9, mọi số liệu đều có dòng nguồn ở chân trang.*

1. **Slide 1 — Trang bìa MoMo TrustLoop:** *Khép kín vòng phòng vệ niềm tin số: từ ảnh chat Zalo Phút 00 đến đội điều tra 4 Agent và miễn dịch cộng đồng có kiểm soát.*
2. **Slide 2 — Điểm mù "Phút 89" qua câu chuyện Bác Hùng:** *Sinh trắc học ngăn kẻ gian trộm tài khoản, nhưng không ngăn được Bác Hùng tự quét mặt chuyển tiền sau 88 phút bị thao túng trên Zalo.* *(Nguồn: MoMo 05/2026; Tuổi Trẻ 11/2026; NCA 01/2026; Kaspersky 11/2026).*
3. **Slide 3 — Nỗi đau Future Workspace của đội Risk & CSKH:** *Chuyên viên Risk đang điều tra trong cảnh thiếu ngữ cảnh ngoài app và thiếu trình báo, trong khi tự động hóa lạnh lùng đánh mất niềm tin khách hàng.* *(Nguồn: NCA 01/2026 — 32,12% trình báo; A05/VnExpress 10/2026 — truy vết 1–2 ngày; Bloomberg 05/2025 — vụ Klarna).*
4. **Slide 4 — Giải pháp: Vòng lặp 4 Nhịp MoMo TrustLoop:** *Bằng chứng Phút 00 của Bác Hùng trở thành "đôi mắt" cho đội Risk, và kết luận đã duyệt 2 cấp trở thành lá chắn cho người dùng kế tiếp.*
5. **Slide 5 — Trụ cột 1 (B2C): Quét Ảnh Phút 00 & Bảo vệ Minh bạch:** *AI bóc trần ảnh lệnh giả ngay trước khi Bác Hùng chuyển tiền, áp dụng giữ chậm 24h đã đồng ý trước mà không lừa dối người dùng.*
6. **Slide 6 — Trụ cột 2 (B2E): Phòng Tác chiến 4 Agent có Phản biện:** *4 AI Agent song song gom bằng chứng Phút 00, vẽ đồ thị chia nhỏ lệnh 9,5 triệu và tranh biện hai chiều để Chuyên viên con người ra phán quyết cuối.*
7. **Slide 7 — AI Không Chỉ Biết Chặn: 3 Kịch bản Kiểm chứng Thực tế:** *Độ tin cậy của AI được đo bằng khả năng minh oan cho tiểu thương Chị Hoa ngang bằng khả năng bắt trúng đường dây lừa Bác Hùng và link APK giả.*
8. **Slide 8 — Trụ cột 3: Miễn dịch Cộng đồng Chuẩn AI Có Trách nhiệm:** *Tăng tốc lan truyền cảnh báo nhưng khóa chặt 4 lớp: Cảnh báo mềm → Ngưỡng ≥2 nguồn & Maker–Checker → Hạn TTL → Khiếu nại & Rollback tức thì.* *(Nguồn: TT 53/2026/TT-NHNN).*
9. **Slide 9 — Kiến trúc Tinh gọn, Ranh giới Thật/Mô phỏng & Số đo Thực tế:** *Kiến trúc độc lập hạ tầng Cloud/LLM, minh bạch phần chạy thật và chỉ báo cáo thời gian phản hồi đo trực tiếp trên bản Demo.* *(Điền số đo thật trước khi xuất PDF).*
10. **Slide 10 — Tác động Kinh doanh, Tuân thủ 2026 & Lộ trình Mở rộng:** *Thu hẹp điểm mù trước Phút 89, nâng năng suất Risk/CSKH, sẵn sàng tuân thủ khung pháp lý 2026 (Luật AI 134, Luật BVDLCN 91, TT 53) và kết nối AI Central Hub.*
