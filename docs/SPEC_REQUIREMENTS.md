# Đặc Tả Yêu Cầu Hệ Thống Chi Tiết (`requirements.md`)
> **Dự án:** MoMo TrustLoop v2 — Live MVP (10 ngày)
> **Chuẩn viết đặc tả:** EARS (Easy Approach to Requirements Syntax: `WHEN [điều kiện] THE SYSTEM SHALL [hành vi kiểm chứng được]`)
> **Phạm vi:** 3 Trụ cột Cứng (B2C Minute-00 Scanner & Opt-in Hold | B2E Parallel 4-Agent War-Room | 4-Layer Community Immunity Loop)

---

## 1. Vai trò Người dùng (Actors)

| Actor ID | Vai trò | Không gian làm việc trên Web MVP | Quyền hạn cốt lõi |
| :--- | :--- | :--- | :--- |
| `USER_B2C` | Người dùng cá nhân (`USER_B2C_HUNG` Bác Hùng, `USER_B2C_NEW` Người dùng mới) | Tab 1: **Lá chắn Phút 00 (B2C)** | Bật/tắt chế độ Bảo vệ 24h (Opt-in, mặc định TẮT), tải ảnh chat/văn bản để quét hoặc tra cứu TK/URL, thực hiện/hủy giao dịch tạm giữ, gửi báo cáo APK/link độc hại sang B2E, gửi khiếu nại nếu bị gắn cờ. |
| `FAMILY_GUARDIAN` | Người giám hộ gia đình (`FAMILY_MINH` Chị Minh) | Tab 2: **Family Co-Sign (1 màn hình)** | Xem thẻ cảnh báo đã ẩn PII (không xem số dư/lịch sử thường ngày), xác nhận giữ chậm 24h & đẩy khẩn sang B2E Risk. |
| `RISK_MAKER` | Chuyên viên Risk/Fraud Ops tuyến 1 (`RISK_MAKER_HUYEN` Chị Huyền) | Tab 3: **FinCrime War-Room (B2E)** | Kích hoạt 4 Agent điều tra (SSE realtime / JSON), xem đồ thị & Thẻ CSKH, đóng cảnh báo giả, hoặc lập đề xuất phát hành chỉ báo miễn dịch (`SOFT_WARNING` hoặc `PENDING_CHECKER`). |
| `RISK_CHECKER` | Quản lý ca / Chuyên viên duyệt cấp 2 (`RISK_CHECKER_TUAN` Anh Tuấn) | Tab 3: **FinCrime War-Room (Chế độ Checker)** | Kiểm tra ngưỡng bằng chứng ≥2 nguồn, phê duyệt phát hành chỉ báo có TTL (`ACTIVE`), xử lý khiếu nại người thật (TT 53/2026), bấm thu hồi (`ROLLBACK`) và giả lập hết hạn TTL phục vụ kiểm thử. |

---

## 2. Yêu cầu Chức năng (Functional Requirements — Chuẩn EARS)

### FR-01: Bật Chế độ Bảo vệ 24h Chủ động (Pre-Consented Opt-in)
* **FR-01.1:** `WHEN` `USER_B2C` mở Tab B2C lần đầu trong phiên demo, `THE SYSTEM SHALL` đặt trạng thái mặc định `opt_in_24h_hold = FALSE`, hiển thị rõ mục đích xử lý dữ liệu, quy tắc tạm giữ 24 giờ cho giao dịch rủi ro cao, và quyền thu hồi bất kỳ lúc nào (không tự động tích sẵn mặc định).
* **FR-01.2:** `WHEN` `USER_B2C` bấm đồng ý bật chế độ Bảo vệ 24h và liên kết `FAMILY_GUARDIAN`, `THE SYSTEM SHALL` lưu bản ghi đồng ý gồm `demo_session_id`, `user_id`, `consent_version`, `hold_hours=24`, `guardian_id`, và `consented_at` (ISO-8601) vào CSDL và ghi `audit_logs`.

### FR-02: Quét Ảnh Chat/Văn bản Phút 00, Kho Miễn dịch 2 Tầng & Ca An ninh mạng APK (B2C)
* **FR-02.1:** `WHEN` `USER_B2C` chọn 1 trong các kịch bản mẫu, nhập TK/URL kiểm tra nhanh, hoặc tải lên tệp ảnh (`JPG`/`PNG`/`WEBP`, tối đa 5 MB), `THE SYSTEM SHALL` kiểm tra **Tầng 1 (trước Vision)** trên **Kho Chỉ báo Miễn dịch (`immunity_indicators`)** theo phiên hiện tại cho mọi bản ghi còn hiệu lực (`status IN ('SOFT_WARNING', 'ACTIVE')` và `expires_at > NOW()`).
* **FR-02.2:** `WHEN` Vision LLM hoàn tất phân tích ảnh chụp, `THE SYSTEM SHALL` trả về cấu trúc JSON hợp lệ chứa:
  1. `risk_score` (0–100) và `risk_level` (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`),
  2. `visual_tampering_flags[]` (các dấu hiệu chỉnh sửa ảnh/dấu đỏ/thể thức giả),
  3. `psych_manipulation_cues[]` gắn nhãn trong 4 nhóm (`FEAR_THREAT`, `URGENCY_PRESSURE`, `SECRECY_ISOLATION`, `APK_PHISHING_BAIT`),
  4. `cyber_threat_flags[]` (phát hiện link tải `.apk`, hướng dẫn bật `Accessibility Services`, tên miền giả mạo),
  5. `extracted_entities` (số tài khoản đích, tên ngân hàng, URL/tên miền, số tiền đề cập — nếu có),
  6. `calm_guidance_vi` (lời giải thích ngắn gọn bằng tiếng Việt ấm áp, cỡ chữ lớn, kèm 2 câu hỏi đối chất giúp người dùng tự kiểm chứng),
  7. `measured_latency_ms` (thời gian xử lý thực đo bằng mili-giây) và `model_used`.
* **FR-02.3:** `WHEN` Vision LLM trả về `extracted_entities` (số tài khoản đích hoặc URL/tên miền nghi vấn), `THE SYSTEM SHALL` chạy kiểm tra **Tầng 2 (sau Vision)** đối chiếu các entity vừa trích xuất với Kho Chỉ báo Miễn dịch còn hiệu lực để gắn cờ cảnh báo cộng đồng nếu trùng khớp.
* **FR-02.4:** `IF` ảnh không chứa nội dung tài chính/hội thoại hoặc quá mờ không thể đọc chữ, `THE SYSTEM SHALL` trả về trạng thái `INCONCLUSIVE` cùng hướng dẫn chụp lại rõ nét thay vì tự suy diễn kết luận.
* **FR-02.5:** `WHEN` kết quả quét phát hiện rủi ro mã độc thiết bị (`cyber_threat_flags` có `APK_ACCESSIBILITY_BAIT`), `THE SYSTEM SHALL` hiển thị thẻ bảo vệ thiết bị Android khẩn cấp và nút **"Báo cáo link/APK độc hại sang War-Room"** để đẩy trực tiếp gói bằng chứng đã ẩn PII sang hàng đợi B2E.

### FR-03: Tạm giữ Xác minh Bảo mật 24h Trung thực & Ẩn PII (B2C → Family)
* **FR-03.1:** `WHEN` `USER_B2C` bấm "Tiếp tục chuyển tiền" đối với giao dịch có `risk_score >= 75` (hoặc khớp chỉ báo miễn dịch `ACTIVE`) AND người dùng đã bật Opt-in `FR-01`, `THE SYSTEM SHALL` chuyển giao dịch vào trạng thái `ON_HOLD_24H` và hiển thị thông báo trung tính, trung thực:
  > *"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."*
  *(Ràng buộc cứng: Tuyệt đối KHÔNG hiển thị thông tin sai sự thật hoặc mạo danh Ngân hàng Nhà nước / cơ quan công quyền).*
* **FR-03.2:** `WHEN` `USER_B2C` mở màn hình Chi tiết Giao dịch đang tạm giữ, `THE SYSTEM SHALL` giải thích rõ từng dấu hiệu rủi ro đã kích hoạt việc tạm giữ và cung cấp nút **"Hủy giao dịch — Hoàn tiền về ví ngay"** hoạt động tức thì.
* **FR-03.3:** `WHEN` hệ thống tạo **Gói Bằng chứng Phút 00** để gửi sang `FAMILY_GUARDIAN` hoặc `B2E War-Room`, `THE SYSTEM SHALL` chạy bộ lọc `PII_Redactor` để che mờ toàn bộ số CCCD 12 số (`[CCCD_ĐÃ_ẨN]`), số điện thoại cá nhân (`[SĐT_ĐÃ_ẨN]`), số dư tài khoản người gửi (`[SỐ_DƯ_ĐÃ_ẨN]`) và loại bỏ lịch sử chi tiêu cá nhân, đồng thời lưu `pii_diff_json` để BGK kiểm chứng đối chiếu Trước/Sau ẩn PII trên UI B2C (không truyền ảnh gốc sang Family/B2E).

### FR-04: Màn hình Duyệt Family Co-Sign Tối giản (1 Màn hình)
* **FR-04.1:** `WHEN` một giao dịch chuyển sang trạng thái `ON_HOLD_24H`, `THE SYSTEM SHALL` hiển thị thẻ cảnh báo trên Tab `Family Co-Sign` chỉ gồm: tên gợi nhớ người thân, điểm rủi ro, tóm tắt dấu hiệu đã ẩn PII và số tiền giao dịch nghi vấn (KHÔNG hiển thị số dư ví, CCCD, SĐT hay lịch sử giao dịch thường ngày).
* **FR-04.2:** `WHEN` `FAMILY_GUARDIAN` bấm **"Xác nhận giữ chậm 24h & Chuyển MoMo Risk"**, `THE SYSTEM SHALL` cập nhật trạng thái hồ sơ thành `ESCALATED_TO_B2E`, đính kèm **Gói Bằng chứng Phút 00 (đã ẩn PII)** vào hàng đợi `FinCrime War-Room` và ghi nhật ký thời gian.

### FR-05: Phòng Tác chiến 4 Agent Song song có Phản biện (B2E War-Room)
* **FR-05.1:** `WHEN` `RISK_MAKER` chọn một vụ việc trong hàng đợi (bao gồm ca leo thang từ B2C hoặc ca có sẵn như `CASE-03` Chị Hoa) và bấm **"Chạy Điều tra 4 Agent"**, `THE SYSTEM SHALL` thực thi đồng thời 4 Agent độc lập với cấu trúc JSON đầu ra bắt buộc (hỗ trợ SSE streaming tiến độ từng Agent và JSON chuẩn):
  1. `GraphTracerAgent`: Phân tích đồ thị tài khoản–thiết bị–IP để nhận diện chia nhỏ giao dịch dưới ngưỡng 10M/lần hoặc 20M/ngày (*smurfing*) và cụm ví trung gian (*mule cluster*).
  2. `EvidenceCorrelatorAgent`: Đối chiếu Gói Bằng chứng Phút 00 (nếu có) với tài khoản đích, mã APK/URL và cờ SIMO mô phỏng.
  3. `ComplianceRagAgent`: Truy xuất BM25 từ kho `vnPolicies.json` (~14 điều khoản có `chunk_id`) và trích dẫn quy định liên quan (QĐ 2345, TT 53/2026, Luật BVDLCN 91/2025, TT 77/2025, Bảo hiểm An toàn chuyển tiền ≤2 triệu).
  4. `FalsePositiveDefenderAgent`: Chủ động tìm chứng cứ minh oan (lịch sử giao dịch thương mại sạch, tần suất bán hàng định kỳ, thiết bị chính chủ, vắng mặt bằng chứng lừa đảo Phút 00) và tính điểm `innocence_confidence` (0–100).
* **FR-05.2:** `WHEN` 4 Agent hoàn tất, `THE SYSTEM SHALL` chạy bước tổng hợp (`DebateSynthesizer`) gọi LLM đối chiếu giữa bằng chứng rủi ro và lập luận của `FalsePositiveDefenderAgent`, áp dụng **hậu kiểm code cứng** cho điều kiện `eligible_for_active_immunity = (independent_sources.length >= 2)`, và hiển thị:
  * Đồ thị dòng tiền tương tác (`@xyflow/react`) tự highlight nút/cạnh theo `flagged_node_ids`, cho phép click từng node xem metadata chi tiết,
  * Bảng tranh biện 2 cột (*Lập luận Rủi ro* vs *Lập luận Bảo vệ Khách hàng thật*),
  * Khuyến nghị cuối (`RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY` | `RECOMMEND_DISMISS_FP` | `NEED_MORE_EVIDENCE`),
  * **Thẻ Bàn giao CSKH Thấu cảm** (trạng thái tiền, mức độ lo lắng, 3 câu mở lời đồng cảm cho nhân viên người thật),
  * Đồng hồ đo tổng thời gian thực thi thực tế (`total_latency_ms`) và thời gian từng Agent.
* **FR-05.3:** `IF` bất kỳ Agent nào trả về JSON sai schema hoặc timeout, `THE SYSTEM SHALL` thử lại tối đa 1 lần với chế độ sửa định dạng; nếu vẫn lỗi thì đánh dấu rõ `AGENT_DEGRADED` trên giao diện và tuyệt đối không để lỗi dây chuyền làm sập các Agent còn lại.

### FR-06: Phê duyệt Human-in-the-Loop & Quản trị Miễn dịch 4 Lớp
* **FR-06.1 (Không khóa tự động):** `THE SYSTEM SHALL` cấm tuyệt đối việc tự động phong tỏa vĩnh viễn tài khoản hoặc tự động đẩy chỉ báo miễn dịch toàn hệ thống khi chưa có thao tác phê duyệt của con người.
* **FR-06.2 (Lớp 1 — Cảnh báo mềm):** `WHEN` `RISK_MAKER` xác nhận vụ việc mới chỉ có **1 nguồn bằng chứng độc lập**, `THE SYSTEM SHALL` chỉ cho phép phát hành tối đa ở mức `SOFT_WARNING` (cảnh báo tham khảo không chặn cứng) với thời hạn mặc định `TTL = 72 giờ`, và trả về HTTP `400` nếu cố tình gửi đề xuất `ACTIVE`.
* **FR-06.3 (Lớp 2 — Ngưỡng ≥2 nguồn & Maker–Checker):** `WHEN` `RISK_MAKER` đề xuất phát hành chỉ báo ở mức **Cảnh báo Rủi ro Cao toàn cộng đồng (`ACTIVE`)**, `THE SYSTEM SHALL` tự động kiểm tra điều kiện `independent_evidence_sources.length >= 2` và chuyển bản ghi sang trạng thái `PENDING_CHECKER`. Chỉ khi `RISK_CHECKER` (vai trò khác `RISK_MAKER` và `checker_id !== maker_id`, nếu vi phạm trả về HTTP `403`) rà soát và bấm **"Phê duyệt Phát hành"**, chỉ báo mới chuyển sang `ACTIVE`.
* **FR-06.4 (Lớp 3 — Hạn hiệu lực TTL):** `WHEN` một chỉ báo `SOFT_WARNING` hoặc `ACTIVE` vượt quá `expires_at` (`72 giờ` cho mức tạm thời / `30 ngày` cho mức đa nguồn), `THE SYSTEM SHALL` tự động ngừng áp dụng chỉ báo đó khi quét ở B2C và chuyển trạng thái thành `EXPIRED` (kèm nút **Giả lập hết hạn TTL (Demo)** cho Checker kiểm chứng tức thì).
* **FR-06.5 (Lớp 4 — Khiếu nại & Rollback tức thì):** `WHEN` chủ tài khoản gửi yêu cầu khiếu nại trên chỉ báo đang hiệu lực (từ banner cảnh báo B2C hoặc War-Room), `THE SYSTEM SHALL` đưa vào hàng đợi **Rà soát Trực tiếp bởi Con người** (chuẩn Thông tư 53/2026). `WHEN` `RISK_CHECKER` bấm **"Thu hồi tức thì (Rollback)"**, `THE SYSTEM SHALL` chuyển ngay trạng thái chỉ báo thành `ROLLED_BACK`, gỡ cảnh báo trên B2C ngay lập tức và lưu vết kiểm toán không thể sửa xóa (`audit_logs`).

### FR-07: Đóng kín Vòng Miễn dịch Ngược về B2C
* **FR-07.1:** `WHEN` chỉ báo mới chuyển sang trạng thái `SOFT_WARNING` hoặc `ACTIVE` và một người dùng B2C khác tải ảnh hoặc nhập số tài khoản/tên miền trùng khớp, `THE SYSTEM SHALL` trả về ngay thẻ **"Cảnh báo từ Mạng lưới Miễn dịch MoMo TrustLoop"** hiển thị rõ cấp độ (`Cảnh báo mềm` hoặc `Cảnh báo rủi ro cao đã duyệt 2 cấp`), số nguồn xác minh, ngày hết hạn TTL và nút gửi khiếu nại.

---

## 3. Yêu cầu Phi Chức năng (Non-Functional Requirements)

1. **Độc lập Hạ tầng Cloud & LLM (Provider-Agnostic):** Toàn bộ lời gọi AI đi qua giao diện trừu tượng `LLMProvider` với 3 adapter (`bedrock`, `gemini`, `openai`). Khi thiếu khóa API, hệ thống trả HTTP `503` (`LLM_NOT_CONFIGURED`) thay vì giả mạo kết quả AI trên runtime.
2. **Đo lường Minh bạch (Observability):** Mọi API AI trả về trường `measured_latency_ms` (đo bằng `performance.now()`) và `model_used` hiển thị trực tiếp trên UI để BGK kiểm chứng tốc độ thật.
3. **Cô lập Phiên Chấm thi & Bảo vệ Quota (Session Isolation & Security):**
   * Toàn bộ bản ghi được phân tách theo `demo_session_id` (cookie `tl_session` hoặc tham số `?session=` để demo chéo thiết bị). `POST /api/demo/reset` chỉ reset phiên hiện tại.
   * Áp dụng rate limiting theo IP cho endpoint AI và kiểm tra định dạng/kích thước ảnh (`<= 5 MB`, magic bytes JPEG/PNG/WEBP).
   * Cô lập nội dung trích xuất từ ảnh người dùng tải lên bằng thẻ phân tách dữ liệu (`<untrusted_user_content>...</untrusted_user_content>`) để phòng ngừa *indirect prompt injection*.
   * Không lưu khóa API trong mã nguồn; chỉ đọc từ biến môi trường.
   * Toàn bộ dữ liệu 3 kịch bản demo là dữ liệu tổng hợp mô phỏng 100%, không chứa thông tin cá nhân thật.
4. **Sẵn sàng Trải nghiệm 1 Chạm (Demo Readiness):** Thanh chuyển đổi nhanh 5 vai trò (`B2C Bác Hùng` | `Family Chị Minh` | `War-Room Maker` | `War-Room Checker` | `B2C Người dùng mới`), hướng dẫn kịch bản demo 3 phút và nút **Reset Dữ liệu Demo**.

---

## 4. Ma trận Nghiệm thu 3 Kịch bản Kiểm thử Bắt buộc

| Mã Test | Kịch bản | Đầu vào kiểm thử | Tiêu chí ĐẠT (Pass Criteria) |
| :--- | :--- | :--- | :--- |
| `E2E-01` | **Bác Hùng (Ca chính)** | Ảnh chat Zalo giả Công an + lệnh bắt giả + chuyển 9,5M (1/4 lệnh tổng 38M). | (1) `risk_score >= 75`, nhận diện đủ dấu hiệu giả & cô lập; (2) Chuyển tiền hiện đúng câu trung tính `ON_HOLD_24H` (không nhắc NHNN); (3) Family Co-Sign ẩn CCCD/số dư; (4) 4 Agent vẽ đúng cụm ví mule 4×9,5M; (5) Maker tự duyệt bị `403`, phải Maker đề xuất + Checker duyệt mới lên `ACTIVE` có TTL; (6) Người dùng mới quét lại số TK thấy cảnh báo miễn dịch ngay; (7) Gửi khiếu nại & bấm `Rollback` gỡ cảnh báo tức thì. |
| `E2E-02` | **Minh Anh (Shipper/APK)** | Ảnh tin nhắn giả shipper/dịch vụ công chứa link `.apk` + hướng dẫn bật `Accessibility`. | `cyber_threat_flags` chỉ rõ nguy cơ mã độc chiếm quyền thiết bị Android (`Accessibility`), xuất hướng dẫn không cài file ngoài kho chính thức, đẩy sang B2E; cố ép `ACTIVE` với 1 nguồn bị `400`, chỉ phát hành `SOFT_WARNING` 72h; giả lập hết hạn TTL gỡ cảnh báo. |
| `E2E-03` | **Chị Hoa (Tiểu thương Livestream)** | Hồ sơ `CASE-03` (35 giao dịch nhỏ trong 1 giờ tối, lịch sử 14 tháng sạch, không có báo cáo Phút 00). | `FalsePositiveDefenderAgent` trả `innocence_confidence >= 75`, `DebateSynthesizer` đề xuất `RECOMMEND_DISMISS_FP`, Maker đóng cảnh báo giả mà **không** ghi vào kho miễn dịch. |

---

## 5. Ma trận Tuân thủ Pháp lý Việt Nam 2026

| Văn bản pháp lý (Hiệu lực) | Yêu cầu cốt lõi liên quan | Hiện thực hóa trong MoMo TrustLoop v2 |
| :--- | :--- | :--- |
| **QĐ 2345/QĐ-NHNN** (01/07/2024) | Xác thực sinh trắc học >10 triệu/lần hoặc >20 triệu/ngày | `GraphTracerAgent` phát hiện đặc trị hành vi chia nhỏ giao dịch 9,5 triệu (*smurfing*) để né ngưỡng 10 triệu. |
| **Luật BVDLCN 91/2025/QH15 & NĐ 356/2025** (01/01/2026) | Đồng ý tự nguyện, rõ mục đích, không mặc định; bảo vệ dữ liệu nhạy cảm | `FR-01` (Opt-in mặc định TẮT có lưu vết đồng ý) & `FR-03.3` (`PII_Redactor` ẩn CCCD, SĐT, số dư). |
| **Luật Trí tuệ nhân tạo 134/2025/QH15** (01/03/2026) | Điều 4: lấy con người làm trung tâm, không thay thế thẩm quyền con người; minh bạch | Thông báo giữ chậm trung thực; giải thích rõ dấu hiệu rủi ro; không khóa tự động thiếu con người. |
| **Thông tư 77/2025/TT-NHNN** (01/03/2026) | Bảo mật ứng dụng di động, phòng chống ứng dụng can thiệp thiết bị | `FR-02.2` & `E2E-02` phát hiện sớm kịch bản dụ cài `.apk` lạm dụng `Accessibility` ngay từ tin nhắn. |
| **Thông tư 53/2026/TT-NHNN** (15/11/2026) | Quản trị rủi ro AI ngân hàng; quyết định tự động bị khiếu nại phải do con người trực tiếp xem xét lại; giải trình & kiểm toán | `FR-05` (bảng giải trình 2 chiều + RAG trích dẫn), `FR-06` (Maker–Checker, hàng đợi khiếu nại người thật, `audit_logs` bất biến). |
