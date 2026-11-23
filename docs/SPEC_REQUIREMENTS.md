# Đặc Tả Yêu Cầu Hệ Thống Chi Tiết (`requirements.md`)
> **Dự án:** MoMo TrustLoop v2 — Live MVP (10 ngày)
> **Chuẩn viết đặc tả:** EARS (Easy Approach to Requirements Syntax: `WHEN [điều kiện] THE SYSTEM SHALL [hành vi kiểm chứng được]`)
> **Phạm vi:** 3 Trụ cột Cứng (B2C Minute-00 Scanner & Opt-in Hold | B2E Parallel 4-Agent War-Room | 4-Layer Community Immunity Loop)

---

## 1. Vai trò Người dùng (Actors)

| Actor ID | Vai trò | Không gian làm việc trên Web MVP | Quyền hạn cốt lõi |
| :--- | :--- | :--- | :--- |
| `USER_B2C` | Người dùng cá nhân (`USER_B2C_HUNG` Bác Hùng, `USER_B2C_NEW` Người dùng mới) | Tab 1: **Lá chắn Phút 00 (B2C)** | Bật/tắt chế độ Bảo vệ 24h (Opt-in, mặc định TẮT), tải ảnh chat/văn bản để quét hoặc tra cứu TK/URL, thực hiện/hủy giao dịch tạm giữ, gửi báo cáo APK/link độc hại sang B2E, gửi khiếu nại nếu bị gắn cờ. |
| `FAMILY_GUARDIAN` | Người giám hộ (`FAMILY_MINH` Chị Minh) | Tab 2: **Màn hình Người giám hộ** (`/family`, nhãn UI hiện ghi "Family Co-Sign") | Xem thẻ đã Ẩn PII (không xem số dư/lịch sử thường ngày) và **chỉ có quyền Chuyển cấp** sang B2E; **không** có quyền Giải phóng giao dịch. |
| `RISK_MAKER` | Chuyên viên Risk/Fraud Ops tuyến 1 (`RISK_MAKER_HUYEN` Chị Huyền) | Tab 3: **FinCrime War-Room (B2E)** | Kích hoạt 4 Agent điều tra (SSE realtime / JSON), xem đồ thị & Thẻ CSKH, đóng cảnh báo giả, hoặc lập đề xuất phát hành chỉ báo miễn dịch (`SOFT_WARNING` hoặc `PENDING_CHECKER`). |
| `RISK_CHECKER` | Quản lý ca / Chuyên viên duyệt cấp 2 (`RISK_CHECKER_TUAN` Anh Tuấn; persona demo thứ hai `RISK_CHECKER_LAN` Chị Lan — chỉ có ở UI, chưa thêm vào `contracts/`) | Tab 3: **FinCrime War-Room (Chế độ Checker)** | Kiểm tra ≥2 Nguồn bằng chứng độc lập, Kích hoạt Chỉ báo có TTL (`ACTIVE`), xét Khiếu nại (người xét phải khác Checker đã Kích hoạt), Thu hồi (`ROLLBACK`) và giả lập hết hạn TTL phục vụ kiểm thử. |

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

### FR-03: Tạm giữ (Bảo vệ 24h), Giải phóng & Ẩn PII (B2C → Người giám hộ)
* **FR-03.1:** `WHEN` `USER_B2C` bấm "Tiếp tục chuyển tiền" đối với giao dịch có `risk_score >= 75` (hoặc khớp chỉ báo miễn dịch `ACTIVE`) AND người dùng đã bật Opt-in `FR-01`, `THE SYSTEM SHALL` chuyển giao dịch vào trạng thái `ON_HOLD_24H` và hiển thị thông báo trung tính, trung thực:
  > *"Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)."*
  *(Ràng buộc cứng: Tuyệt đối KHÔNG hiển thị thông tin sai sự thật hoặc mạo danh Ngân hàng Nhà nước / cơ quan công quyền).*
* **FR-03.2:** `WHEN` `USER_B2C` mở màn hình Chi tiết Giao dịch đang tạm giữ, `THE SYSTEM SHALL` giải thích rõ từng dấu hiệu rủi ro đã kích hoạt việc tạm giữ và cung cấp nút **"Hủy giao dịch — Hoàn tiền về ví ngay"** hoạt động tức thì.
* **FR-03.3:** `WHEN` hệ thống tạo **Gói Bằng chứng Phút 00** để gửi sang `FAMILY_GUARDIAN` hoặc `B2E War-Room`, `THE SYSTEM SHALL` chạy bộ lọc `PII_Redactor` để che mờ toàn bộ số CCCD 12 số (`[CCCD_ĐÃ_ẨN]`), số điện thoại cá nhân (`[SĐT_ĐÃ_ẨN]`), số dư tài khoản người gửi (`[SỐ_DƯ_ĐÃ_ẨN]`) và loại bỏ lịch sử chi tiêu cá nhân, đồng thời lưu `pii_diff_json` để BGK kiểm chứng đối chiếu Trước/Sau ẩn PII trên UI B2C (không truyền ảnh gốc sang Người giám hộ/B2E).
* **FR-03.4 (Giải phóng — đã làm):** `WHEN` một giao dịch `ON_HOLD_24H` vượt quá `holdExpiresAt` mà chưa bị hủy hay Chuyển cấp, `THE SYSTEM SHALL` chuyển trạng thái thành `RELEASED` (kiểm tra khi đọc) và từ chối mọi yêu cầu Chuyển cấp sau đó.
* **FR-03.5 (Yêu cầu xét lại tạm giữ — Kế hoạch):** `WHEN` `USER_B2C` bấm **"Yêu cầu xét lại tạm giữ"** trên giao dịch đang Tạm giữ, `THE SYSTEM SHALL` đưa yêu cầu vào hàng đợi chuyên viên người thật; chỉ chuyên viên đó mới được Giải phóng sớm giao dịch (căn cứ: TT 53/2026 — quyết định tự động bị khách hàng khiếu nại phải do con người xem xét lại [nguồn báo chí, chưa xác minh điều khoản]).

### FR-04: Màn hình Người giám hộ Tối giản (1 Màn hình)
* **FR-04.1:** `WHEN` một giao dịch chuyển sang trạng thái `ON_HOLD_24H`, `THE SYSTEM SHALL` hiển thị thẻ trên màn hình Người giám hộ (`/family`) chỉ gồm: tên gợi nhớ người thân, điểm rủi ro, tóm tắt dấu hiệu đã Ẩn PII và số tiền giao dịch nghi vấn (KHÔNG hiển thị số dư ví, CCCD, SĐT hay lịch sử giao dịch thường ngày).
* **FR-04.2 (Chuyển cấp):** `WHEN` `FAMILY_GUARDIAN` bấm **"Xác nhận tạm giữ 24h & Chuyển MoMo Risk"**, `THE SYSTEM SHALL` cập nhật trạng thái thành `ESCALATED_TO_B2E`, kéo dài Tạm giữ cho tới khi B2E ra phán quyết, đính kèm **Bằng chứng Phút 00 (đã Ẩn PII)** vào hàng đợi `FinCrime War-Room` và ghi nhật ký thời gian. Người giám hộ **không** có thao tác Giải phóng.

### FR-05: Phòng Tác chiến 4 Agent Song song có Phản biện (B2E War-Room)
* **FR-05.1:** `WHEN` `RISK_MAKER` chọn một vụ việc trong hàng đợi (bao gồm ca leo thang từ B2C hoặc ca có sẵn như `CASE-03` Chị Hoa) và bấm **"Chạy Điều tra 4 Agent"**, `THE SYSTEM SHALL` thực thi đồng thời 4 Agent độc lập với cấu trúc JSON đầu ra bắt buộc (hỗ trợ SSE streaming tiến độ từng Agent và JSON chuẩn):
  1. `GraphTracerAgent`: Phân tích đồ thị tài khoản–thiết bị–IP để nhận diện Chia nhỏ giao dịch dưới ngưỡng xác thực sinh trắc học 10M/lần hoặc 20M/ngày (*smurfing*) và cụm Ví trung gian (*mule cluster*) — dấu hiệu đáng ngờ theo Luật PCRT 2022 Điều 29 và TT 40/2024 Phụ lục 01.
  2. `EvidenceCorrelatorAgent`: Đối chiếu Gói Bằng chứng Phút 00 (nếu có) với tài khoản đích, mã APK/URL và cờ SIMO mô phỏng.
  3. `ComplianceRagAgent`: Truy xuất BM25 từ kho `data/vnPolicies.json` (12 chunk có `chunk_id`) và trích dẫn quy định liên quan. *Kế hoạch:* làm sạch kho để chỉ còn tóm tắt văn bản pháp luật, trích đúng theo [RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md) (bỏ các chunk còn dẫn QĐ 2345 đã bị bãi bỏ).
  4. `FalsePositiveDefenderAgent`: Chủ động tìm chứng cứ minh oan (lịch sử giao dịch thương mại sạch, tần suất bán hàng định kỳ, thiết bị chính chủ, vắng mặt bằng chứng lừa đảo Phút 00) và tính điểm `innocence_confidence` (0–100).
* **FR-05.2:** `WHEN` 4 Agent hoàn tất, `THE SYSTEM SHALL` chạy bước tổng hợp (`DebateSynthesizer`) gọi LLM đối chiếu giữa bằng chứng rủi ro và lập luận của `FalsePositiveDefenderAgent`, áp dụng **hậu kiểm code cứng** cho điều kiện `eligible_for_active_immunity = (independent_sources.length >= 2)`, và hiển thị:
  * Đồ thị dòng tiền tương tác (`@xyflow/react`) tự highlight nút/cạnh theo `flagged_node_ids`, cho phép click từng node xem metadata chi tiết,
  * Bảng tranh biện 2 cột (*Lập luận Rủi ro* vs *Lập luận Bảo vệ Khách hàng thật*),
  * Khuyến nghị cuối (`RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY` | `RECOMMEND_DISMISS_FP` | `NEED_MORE_EVIDENCE`),
  * **Thẻ Bàn giao CSKH Thấu cảm** (trạng thái tiền, mức độ lo lắng, 3 câu mở lời đồng cảm cho nhân viên người thật),
  * Đồng hồ đo tổng thời gian thực thi thực tế (`total_latency_ms`) và thời gian từng Agent.
* **FR-05.3:** `IF` bất kỳ Agent nào trả về JSON sai schema hoặc timeout, `THE SYSTEM SHALL` thử lại tối đa 1 lần với chế độ sửa định dạng; nếu vẫn lỗi thì đánh dấu rõ `AGENT_DEGRADED` trên giao diện và tuyệt đối không để lỗi dây chuyền làm sập các Agent còn lại.
* **FR-05.4 (Phán quyết của con người):** `WHEN` Chuyên viên chọn **Minh oan** (`DISMISS_FP`), `THE SYSTEM SHALL` đặt Vụ thành `DISMISSED_FP` và Giải phóng (`RELEASED`) ngay giao dịch bị giữ của Vụ *(đã làm)*. `WHEN` Vụ có **Kết luận rủi ro cao** (`CLOSED`, khi Chỉ báo của Vụ được Kích hoạt), `THE SYSTEM SHALL` hủy giao dịch bị giữ của Vụ với trạng thái `CANCELLED_BY_B2E`, không bao giờ ghi thành `CANCELLED_BY_USER` *(Kế hoạch)*. Kết luận rủi ro cao là kết luận nghiệp vụ, không phải kết luận tội phạm.
* **FR-05.5 (Hạn quyết định — Kế hoạch):** `WHEN` một giao dịch ở trạng thái `ESCALATED_TO_B2E`, `THE SYSTEM SHALL` hiển thị hạn phán quyết **03 ngày làm việc** cho B2E. Đây là quy tắc thiết kế, lấy theo mức tối đa của việc trì hoãn giao dịch trong Luật PCRT Điều 44; Bảo vệ 24h không phải trì hoãn theo Điều 44.

### FR-06: Phê duyệt Human-in-the-Loop & Quản trị Miễn dịch 4 Lớp
> Bốn lớp dưới đây là **thiết kế quản trị của TrustLoop**, không phải nghĩa vụ của một văn bản pháp luật cụ thể.

* **FR-06.1 (Không khóa tự động):** `THE SYSTEM SHALL` cấm tự động phong tỏa tài khoản hoặc tự động Kích hoạt Chỉ báo Miễn dịch khi chưa có thao tác phê duyệt của con người.
* **FR-06.2 (Lớp 1 — Cảnh báo mềm):** `WHEN` `RISK_MAKER` xác nhận vụ việc mới chỉ có **1 Nguồn bằng chứng độc lập**, `THE SYSTEM SHALL` chỉ cho phép tối đa mức `SOFT_WARNING` (chỉ cảnh báo, không gây Tạm giữ) với `TTL = 72 giờ`, và trả về HTTP `400` nếu cố gửi đề xuất `ACTIVE`.
* **FR-06.3 (Lớp 2 — ≥2 nguồn khác loại & Maker–Checker):** `WHEN` `RISK_MAKER` đề xuất Kích hoạt Chỉ báo (`ACTIVE`), `THE SYSTEM SHALL` kiểm tra `independent_evidence_sources.length >= 2` và chuyển bản ghi sang `PENDING_CHECKER`. Chỉ khi `RISK_CHECKER` (`checker_id !== maker_id`, vi phạm trả HTTP `403`) bấm **"Phê duyệt Phát hành"**, Chỉ báo mới chuyển sang `ACTIVE`. Hai nguồn chỉ độc lập khi khác **loại** (ví dụ Bằng chứng Phút 00 + đồ thị Chia nhỏ giao dịch). *Kế hoạch:* mỗi nguồn ghi theo tiền tố `LOẠI:chi tiết` và được đếm theo số loại khác nhau.
* **FR-06.4 (Lớp 3 — Hạn hiệu lực TTL):** `WHEN` một Chỉ báo `SOFT_WARNING` hoặc `ACTIVE` vượt quá `expires_at` (`72 giờ` cho Cảnh báo mềm / `720 giờ` cho Chỉ báo đã Kích hoạt), `THE SYSTEM SHALL` ngừng áp dụng Chỉ báo khi quét ở B2C và chuyển trạng thái thành `EXPIRED` (kèm nút **Giả lập hết hạn TTL (Demo)** cho Checker). Hồ sơ điều tra và `audit_logs` **không** bị xóa (Luật PCRT Điều 38.2: lưu 05 năm).
* **FR-06.5 (Lớp 4 — Khiếu nại & Thu hồi):** `WHEN` chủ thể bị gắn Chỉ báo gửi Khiếu nại trên Chỉ báo đang hiệu lực, `THE SYSTEM SHALL` đưa vào hàng đợi **Rà soát bởi Con người**. Người xét phải là một `RISK_CHECKER` **khác** Checker đã Kích hoạt Chỉ báo, nếu trùng trả HTTP `403` (`APPEAL_REVIEWER_CONFLICT`) *(đã làm; persona demo `RISK_CHECKER_LAN`)*. `WHEN` Khiếu nại được chấp nhận hoặc Checker bấm **"Thu hồi tức thì (Rollback)"**, `THE SYSTEM SHALL` chuyển Chỉ báo thành `ROLLED_BACK`/`OVERTURNED_ROLLBACK`, gỡ cảnh báo trên B2C ngay lập tức, giữ nguyên hồ sơ điều tra và ghi nhật ký kiểm toán chỉ-ghi-thêm (`audit_logs`). Căn cứ: Luật 91/2025 Điều 19.2.d (cơ chế tiếp nhận phản ánh) và Điều 4.1.đ (quyền khiếu nại); TT 53/2026 — con người xem xét lại quyết định tự động bị khiếu nại [nguồn báo chí, chưa xác minh điều khoản].
* **FR-06.6 (Số đếm minh bạch — Kế hoạch):** `WHEN` Checker mở `/checker`, `THE SYSTEM SHALL` hiển thị số đếm thô của phiên demo (số Vụ Minh oan, số Khiếu nại được chấp nhận, số Chỉ báo bị Thu hồi), gắn nhãn `MẪU MÔ PHỎNG`, không hiển thị phần trăm.

### FR-07: Đóng kín Vòng Miễn dịch Ngược về B2C
* **FR-07.1:** `WHEN` một Chỉ báo ở trạng thái `SOFT_WARNING` hoặc `ACTIVE` và một người dùng B2C khác quét ảnh hoặc nhập số tài khoản/tên miền **trùng đúng** giá trị đó, `THE SYSTEM SHALL` trả về thẻ **"Cảnh báo từ Mạng lưới Miễn dịch MoMo TrustLoop"** với nội dung "rủi ro cao" (không gọi là "tài khoản lừa đảo"), cấp độ (`Cảnh báo mềm` hoặc `Rủi ro cao — đã qua Maker–Checker`) và ngày hết hạn TTL. `THE SYSTEM SHALL NOT` công bố danh sách Chỉ báo, hiển thị mã thiết bị/IP, hay nhắc tới việc đã gửi báo cáo giao dịch đáng ngờ (Luật PCRT Điều 40.2).

---

## 3. Yêu cầu Phi Chức năng (Non-Functional Requirements)

1. **Độc lập Hạ tầng Cloud & LLM (Provider-Agnostic):** Toàn bộ lời gọi AI đi qua giao diện trừu tượng `LLMProvider` với 3 adapter (`bedrock`, `gemini`, `openai`). Khi thiếu khóa API, hệ thống trả HTTP `503` (`LLM_NOT_CONFIGURED`) thay vì giả mạo kết quả AI trên runtime. *Kế hoạch (bắt buộc cho cuộc thi):* chạy trên AWS Sandbox với `LLM_BACKEND=bedrock`, Docker trên EC2/Amplify `ap-southeast-1`; Vercel làm dự phòng.
2. **Đo lường Minh bạch (Observability):** Mọi API AI trả về trường `measured_latency_ms` (đo bằng `performance.now()`) và `model_used` hiển thị trực tiếp trên UI để BGK kiểm chứng tốc độ thật.
3. **Cô lập Phiên Chấm thi & Bảo vệ Quota (Session Isolation & Security):**
   * Toàn bộ bản ghi được phân tách theo `demo_session_id` (cookie `tl_session` hoặc tham số `?session=` để demo chéo thiết bị). `POST /api/demo/reset` chỉ reset phiên hiện tại.
   * Áp dụng rate limiting theo IP cho endpoint AI và kiểm tra định dạng/kích thước ảnh (`<= 5 MB`, magic bytes JPEG/PNG/WEBP).
   * Cô lập nội dung trích xuất từ ảnh người dùng tải lên bằng thẻ phân tách dữ liệu (`<untrusted_user_content>...</untrusted_user_content>`) để phòng ngừa *indirect prompt injection*.
   * Không lưu khóa API trong mã nguồn; chỉ đọc từ biến môi trường.
   * Toàn bộ dữ liệu 3 kịch bản demo là dữ liệu tổng hợp gắn nhãn `MẪU MÔ PHỎNG`, không chứa thông tin cá nhân thật.
4. **Dữ liệu gửi tới LLM (trung thực):** MVP hiện gửi ảnh người dùng tải lên tới LLM đặt ngoài Việt Nam; Ẩn PII chạy phía máy chủ **sau** bước Vision. Theo Luật 91/2025 Điều 20.1.c đây là chuyển dữ liệu xuyên biên giới. Điều kiện trước khi dùng thật (Lộ trình): hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới (Điều 20.2), DPIA (Điều 21.1), và Ẩn PII trên thiết bị.
5. **Sẵn sàng Trải nghiệm 1 Chạm (Demo Readiness):** Thanh chuyển đổi nhanh vai trò (`B2C Bác Hùng` | `Người giám hộ Chị Minh` | `War-Room Maker` | `War-Room Checker` | `B2C Người dùng mới`; Checker thứ hai `RISK_CHECKER_LAN` chọn trong `/checker`), hướng dẫn kịch bản demo 3 phút và nút **Reset Dữ liệu Demo**.

---

## 4. Ma trận Nghiệm thu 3 Kịch bản Kiểm thử Bắt buộc

| Mã Test | Kịch bản | Đầu vào kiểm thử | Tiêu chí ĐẠT (Pass Criteria) |
| :--- | :--- | :--- | :--- |
| `E2E-01` | **Bác Hùng (Ca chính)** | Ảnh chat Zalo giả Công an + lệnh bắt giả + chuyển 9,5M (1/4 lệnh tổng 38M). | (1) `risk_score >= 75`, nhận diện đủ dấu hiệu giả & cô lập; (2) Chuyển tiền hiện đúng Thông báo trung tính `ON_HOLD_24H` (không nhắc NHNN); (3) màn hình Người giám hộ ẩn CCCD/số dư, chỉ có Chuyển cấp; (4) 4 Agent vẽ đúng cụm Ví trung gian 4×9,5M; (5) Maker tự duyệt bị `403`, phải Maker đề xuất + Checker duyệt mới lên `ACTIVE` có TTL; (6) Người dùng mới nhập trúng số TK thấy cảnh báo rủi ro cao; (7) Khiếu nại được một Checker khác (Chị Lan) xét → Thu hồi gỡ cảnh báo tức thì. |
| `E2E-02` | **Minh Anh (App VNeID giả)** | Ảnh tin nhắn dụ cài bản cập nhật VNeID giả chứa link `.apk` + hướng dẫn bật `Accessibility`. | `cyber_threat_flags` chỉ rõ nguy cơ mã độc chiếm quyền thiết bị Android (`Accessibility`), xuất hướng dẫn chỉ cài ứng dụng từ kho chính thức, Báo cáo An ninh mạng sang B2E; cố ép `ACTIVE` với 1 nguồn bị `400`, chỉ phát hành `SOFT_WARNING` 72h; giả lập hết hạn TTL gỡ cảnh báo. |
| `E2E-03` | **Chị Hoa (Tiểu thương Livestream)** | Hồ sơ `CASE-03` (35 giao dịch nhỏ trong 1 giờ tối, lịch sử 14 tháng sạch, không có Bằng chứng Phút 00). | `FalsePositiveDefenderAgent` trả `innocence_confidence >= 75`, `DebateSynthesizer` đề xuất `RECOMMEND_DISMISS_FP`, Maker chọn **Minh oan** mà **không** ghi vào kho Chỉ báo. |

---

## 5. Ma trận Căn cứ Pháp lý

Ánh xạ đầy đủ theo điều khoản và mức tin cậy ([VB] đã đọc nguyên văn, [TC] nguồn thứ cấp, chưa xác minh điều khoản): [RESEARCH_LEGAL.md](./RESEARCH_LEGAL.md).

| Văn bản pháp lý | Nội dung liên quan | Hiện thực hóa trong MoMo TrustLoop v2 |
| :--- | :--- | :--- |
| **TT 40/2024/TT-NHNN** (sửa bởi TT 41/2025, TT 22/2026) | Điều 19.1.l, 28.1.c.(iii): thỏa thuận ví và quy định nội bộ được từ chối/tạm dừng giao dịch [VB]; Điều 28.1.a.(iv): biện pháp bảo đảm do chủ ví hoặc người được ủy quyền sử dụng [VB]; Phụ lục 01 lý do 3, 8 [VB] | `FR-01`, `FR-03` (Bảo vệ 24h opt-in); `FR-04.2` (Người giám hộ chỉ Chuyển cấp); `GraphTracerAgent`. |
| **Luật Phòng, chống rửa tiền 14/2022/QH15** | Điều 29 khoản 2, 3, 9: dấu hiệu chia nhỏ giao dịch, ví trung gian, dùng chung thiết bị [VB]; Điều 38.2: lưu hồ sơ 05 năm [VB]; Điều 40.2: không tiết lộ việc đã báo cáo giao dịch đáng ngờ [VB]; Điều 44: trì hoãn không quá 03 ngày làm việc [VB] | `GraphTracerAgent`; `FR-06.4/06.5` (Thu hồi không xóa hồ sơ); `FR-07.1`; `FR-05.5` (Kế hoạch). |
| **Ngưỡng xác thực sinh trắc học 10 triệu/lần, 20 triệu/ngày** | Nay theo TT 50/2024/TT-NHNN sửa bởi TT 77/2025 [TC, chưa xác minh phụ lục]. QĐ 2345/QĐ-NHNN **đã bị bãi bỏ** bởi QĐ 2872/QĐ-NHNN từ 01/01/2025 | Ngưỡng tham chiếu của thuật toán Chia nhỏ giao dịch. |
| **Luật BVDLCN 91/2025/QH15** (01/01/2026) & NĐ 356/2025 | Điều 9.4: đồng ý từng mục đích, im lặng không phải đồng ý [VB]; Điều 3.2, 30.1: giới hạn phạm vi cần thiết [VB]; Điều 20, 21: xuyên biên giới, DPIA [VB]; danh mục dữ liệu nhạy cảm, không tích sẵn mặc định theo NĐ 356 [TC] | `FR-01` (lưu vết đồng ý), `FR-03.3` (`PII_Redactor`), NFR 4 (trung thực về LLM ngoài VN). |
| **Luật Trí tuệ nhân tạo 134/2025/QH15** (01/03/2026) | Điều 4 khoản 2: con người kiểm soát và can thiệp được [VB]; Điều 7 khoản 4: cấm vô hiệu hóa giám sát của con người; Điều 11.1: người dùng phải biết đang tương tác với AI [VB] | `FR-05.4`, `FR-06.1` (phán quyết của con người); nhãn "Đánh giá do AI" ở Lộ trình. |
| **TT 77/2025/TT-NHNN** (01/03/2026) | App tự bảo vệ trước can thiệp thiết bị (root/jailbreak, debugger, giả lập) [TC] | Phát hiện link APK trong ảnh chat (`FR-02.5`) là **mở rộng của sản phẩm**, không phải nghĩa vụ của TT 77. |
| **TT 53/2026/TT-NHNN** (15/11/2026) | Quyết định tự động bị khách hàng khiếu nại phải do con người xem xét lại; ghi nhật ký, giám sát của con người [TC, chưa xác minh điều khoản] | `FR-03.5` Yêu cầu xét lại tạm giữ (Kế hoạch), `FR-06.5` Khiếu nại. TT 53 **không** quy định ≥2 nguồn, Maker–Checker hay TTL. |
