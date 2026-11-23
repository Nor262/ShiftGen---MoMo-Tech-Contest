# Thiết kế: Sân khấu kể chuyện (Storytelling Stage)

Ngày: 23/11/2026 · Trạng thái: chờ duyệt (đã gộp builder-check + impeccable critique 21/40) · Thuật ngữ theo `GLOSSARY.md`

## 1. Ý định

Giám khảo phải hiểu **trọn tình huống** như xem một câu chuyện: một người bị lừa làm gì, công nghệ phản ứng ra sao, tiền được giữ lại thế nào. Hiện demo trải trên 5 trang (`/`, `/shield`, `/family`, `/warroom`, `/checker`). Mỗi trang phải cuộn để tìm nút, và muốn thấy hệ quả của một thao tác thì phải chuyển trang. Người xem không thấy "tôi làm thế này thì hệ thống ra sao" trên cùng một màn hình.

Bối cảnh chính: **người trình bày cầm chuột, giám khảo nhìn màn chiếu** (desktop ≥1280px). Giám khảo tự mở link Vercel thì vẫn phải dùng được, nhưng không phải ưu tiên.

## 2. Mục tiêu / Không làm / Thất bại nếu

**Mục tiêu**
- Mở đầu, giám khảo hiểu "vì sao cần" trong khoảng 10 giây: hai làn trước/sau.
- Cả vòng lặp 4 bước diễn ra trên **một trang**. Mỗi chương gồm **2 nhịp**, và lúc nào cũng chỉ có **một nút chính** đang hiện, thấy được mà không cần cuộn (viewport 1280×720, tức khoảng 600px chiều cao hữu dụng).
- Đọc được trên máy chiếu: chữ trên sân khấu tối thiểu 16px, chữ trong khung điện thoại tối thiểu 18px. Không dùng `text-[10px]`/`text-[11px]` ở bất kỳ đâu trong `/story`.
- Mỗi thao tác hiện ngay hệ quả ở khung "Phía sau màn hình", bằng kết quả thật: `model_used`, `measured_latency_ms`, nhãn "phát lại" khi dùng bản ghi.
- Không còn lộ mã nội bộ ở chế độ thường.

**Không làm**
- Không đổi `contracts/`, schema DB hay logic nghiệp vụ trong API.
- Không xoá 4 trang cũ.
- Không làm animation cầu kỳ hay thư viện mới.
- Không tối ưu riêng cho mobile ngoài việc xếp dọc cho đọc được.

**Thất bại nếu**
- Sân khấu hiển thị kết quả AI "dựng sẵn" khi chưa gọi thật hoặc không có nhãn phát lại.
- Làn "Hôm nay" đưa ra số liệu thống kê không có nguồn.
- Đi tắt guardrail: Maker≠Checker, câu tạm giữ trung lập, nhãn MẪU MÔ PHỎNG.
- Người trình bày vẫn phải cuộn hoặc tìm nút giữa các chương.

## 3. Ràng buộc (AGENTS.md)

- Câu tạm giữ phải import `NEUTRAL_HOLD_MESSAGE` từ `@/contracts`. Mọi kịch bản đều mang nhãn `DEMO_SIMULATION_LABEL`.
- Không bịa đầu ra AI. Thiếu credential thì hiện đúng lỗi `LLM_NOT_CONFIGURED` (503). Phát lại chỉ dùng bản ghi thật đã có, theo cơ chế `lib/replay.ts`.
- Không hardcode SLA. Thời gian hiển thị lấy từ `measured_latency_ms` hoặc `performance.now()`.
- Maker≠Checker giữ nguyên ở server (`403`). Sân khấu chỉ đổi persona gửi lên.
- Accessibility:
  - landmark, focus ring, tương phản ≥4.5:1;
  - chữ B2C 18px, vùng bấm 48px;
  - thanh chương dùng `aria-current="step"`;
  - khi chuyển chương, focus dời về tiêu đề chương.
- Cách ly phiên qua `?session=` / cookie, như middleware hiện tại.

## 4. Các hướng đã cân nhắc

| Hướng | Mô tả | Đánh đổi |
|---|---|---|
| **A. Sân khấu song song** | Điện thoại nạn nhân bên trái, "Phía sau màn hình" bên phải, dòng dẫn truyện, trục 4 chương, một nút Tiếp | Thấy nhân quả ngay trên một màn hình. Màn hẹp phải xếp dọc. |
| **B. Hai làn trước/sau** | "Hôm nay: mất 38 triệu" cạnh "Có TrustLoop: không lệnh nào rời ví" theo mốc Phút 00/89/90+ | Hiểu giá trị trong 10 giây, nhưng không có chỗ cho thao tác thật. |
| C. Một trang cuộn | Mỗi chương là một đoạn cuộn có giao diện thật nhúng vào | Đọc mượt khi tự xem, nhưng lúc trình chiếu lại phải cuộn, đúng vấn đề cần bỏ. |

**Đã chọn (người dùng duyệt): A, mở đầu bằng B.** B làm trang chủ, A là trang `/story`. C bị loại vì giữ lại đúng thao tác cuộn mà người dùng muốn bỏ.

## 5. Thiết kế

**Phạm vi đã chốt sau review:** P0 (bố cục sân khấu) và hai mục P1 (cỡ chữ cho máy chiếu; dọn mã nội bộ và trích dẫn spec). Hai mục P2 (lời trấn an ở khoảnh khắc tạm giữ, danh sách nhân vật thống nhất) làm sau.

### 5.1 Trang chủ `/`: hai làn trước/sau

```
[Câu giá trị ngắn]
┌ ❌ Hôm nay (không có TrustLoop) ─┐ ┌ ✅ Có TrustLoop ───────────────────┐
│ Phút 89 · Bấm chuyển             │ │ Phút 00 · Quét tin nhắn: cảnh báo   │
│ Phút 90 · Tiền sang kẻ gian      │ │ Phút 89 · Giao dịch bị tạm giữ      │
│ Sau đó · Báo công an, chờ…       │ │ Phút 90+ · Đội Risk kết luận rủi ro │
│ ■ Mất 38.000.000đ                │ │ ■ Không lệnh nào rời ví + cảnh báo    │
└──────────────────────────────────┘ └─────────────────────────────────────┘
          [ Xem chuyện xảy ra thế nào → ]   (mở /story với phiên mới)
```

- Cả hai làn là minh họa và mang nhãn MẪU MÔ PHỎNG. Không có số liệu thống kê. Làn "Có TrustLoop" **chính là Minute Timeline** của DESIGN.md (Phút 00/89/90+), không phải một khối thay thế. Làn "Hôm nay" dùng tông trung tính (Steel), không dùng Error Red, vì đó là tình huống giả định chứ không phải lỗi hệ thống.
- Giữ cơ chế hiện có: tạo phiên mới (`newSessionSlug()`), trạng thái hệ thống và nút reset vẫn `.tech-only`.
- Hold card minh họa và khối LOOP 4 bước của trang chủ hiện tại được thay bằng hai làn này. Minute Timeline sống tiếp trong làn "Có TrustLoop".

### 5.2 Trang `/story`: sân khấu 4 chương

```
┌ Dẫn truyện: "Chương 2/4 · Phút 89 — Bác Hùng mở app định chuyển 9,5 triệu…" ┐
│ Vai bạn đang đóng: [Bác Hùng (người dùng)]                                  │
│ ┌ Điện thoại ──────┐   →   ┌ Phía sau màn hình ─────────────────────────┐ │
│ │ (màn hình nhân   │       │ từng dòng hiện ra theo kết quả API thật:    │ │
│ │  vật đang thấy)  │       │ ✓ … (model · 4,1 s) / ⏸ Tiền tạm giữ / …   │ │
│ └──────────────────┘       └─────────────────────────────────────────────┘ │
│ ①Phát hiện ─ ②Tạm giữ ─ ③Điều tra ─ ④Bảo vệ người khác      [Nút chính →] │
└────────────────────────────────────────────────────────────────────────────┘
```

| Chương | Vai | Điện thoại hiển thị | Nút chính → API (đã có) | Phía sau màn hình |
|---|---|---|---|---|
| ① Phút 00: Tin nhắn lạ | Người dùng | Ảnh tin nhắn CASE-01 | "Quét tin nhắn này" → `POST /api/shield/scan` (preset CASE-01, kèm consent nếu flow yêu cầu) | Mức rủi ro, dấu hiệu, `model_used`, độ trễ đo thật, nhãn phát lại nếu có |
| ② Phút 89: Định chuyển tiền | Người dùng, rồi Người giám hộ | Màn chuyển 9.500.000đ, sau đó câu `NEUTRAL_HOLD_MESSAGE` | "Chuyển 9.500.000đ" (tới `990123456789`, kèm `scanId` của chương ①) → `POST /api/shield/transfer`; nút phụ trong khung giám hộ: "Chuyển cấp cho đội Risk" → `POST /api/shield/family/escalate/[txId]` | Lý do tạm giữ (đã ẩn PII), người giám hộ được báo, vụ được chuyển cấp |
| ③ Phút 90+: Đội Risk điều tra | Risk Maker | Điện thoại vẫn ở trạng thái tạm giữ (Bác Hùng chờ) | "Chạy War-Room" → `POST /api/warroom/cases/[caseId]/investigate` (cần phát lại War-Room khi LLM lỗi — xem §5.5); sau đó "Đề xuất kết luận rủi ro cao" → `POST …/decision` | 4 agent: kết luận ngắn + điều luật trích dẫn; đề xuất của Maker |
| ④ Bảo vệ người khác | Risk Checker, rồi người dùng mới | Người dùng mới quét tin nhắn tương tự thì bị cảnh báo | "Duyệt" → `POST /api/immunity/[id]/approve`; "Thử với người dùng mới" → quét như `B2cLiveProbeCard` (người mới không có consent nên chuyển tiền sẽ không bị giữ — dùng quét) | Chỉ báo Miễn dịch bật, giao dịch của Bác Hùng bị hủy (B2E, do chính lệnh approve), người mới quét thì khớp Chỉ báo kèm độ trễ |

**Thẻ tổng kết** (sau chương ④):
- số tiền được giữ lại;
- thời gian đo thật của từng bước;
- link "Chạy lại từ đầu", mở phiên mới.

**Hai nhịp mỗi chương** (đã chốt: lúc nào cũng chỉ một nút chính hiện):

| Chương | Nhịp 1 | Nhịp 2 |
|---|---|---|
| ① | Bác Hùng bật Bảo vệ 24h (consent) | Quét tin nhắn |
| ② | Bác Hùng bấm chuyển 9,5 triệu, tiền bị giữ | Người giám hộ chuyển cấp |
| ③ | Chạy War-Room | Maker đề xuất (gõ lý do) |
| ④ | Checker duyệt (gõ lý do) | Người dùng mới quét tin nhắn, bị cảnh báo |

**Thứ bậc trong khung "Phía sau màn hình":** một dòng tiêu đề lớn cho hệ quả chính của nhịp vừa chạy (vd. "Tiền đang tạm giữ — chưa rời ví"). Mảng Signal Orange duy nhất của trang chỉ dùng cho tiêu đề này ở nhịp tạm giữ. Chi tiết (dấu hiệu, agent, điều luật) hiện tối đa 3 dòng, phần còn lại gom vào nút "Xem thêm" mở tại chỗ, khung không có thanh cuộn riêng. War-Room: mỗi agent hiện 1 dòng kết luận, trích dẫn nằm trong "Xem thêm".

**Hành vi chung**
- Nút chính luôn ở góc dưới phải của khung sân khấu, cố định vị trí qua các chương. Nút bị khoá trong lúc chờ API, có trạng thái đang chạy và hiện lỗi thật nếu API lỗi.
- **Ô lý do** (Maker, Checker): soạn sẵn một câu nháp hợp lệ, đặt ngay trên nút. Khi tới nhịp này, focus tự đặt vào ô để người trình bày gõ thêm vài chữ, để không trông như "đóng dấu". Ô có `<label>` thật, không chỉ placeholder. Không bỏ ràng buộc bắt buộc nhập.
- **Trợ năng:** kết quả bất đồng bộ được đọc qua vùng `aria-live="polite"`. Chương còn khóa ghi rõ lý do bằng chữ (vd. "Mở sau khi tiền được tạm giữ"), không chỉ làm mờ. Trạng thái không chỉ truyền bằng emoji hay màu, luôn có chữ đi kèm.
- Đổi vai thì gửi đúng persona và actor như các trang hiện tại. Badge "Vai bạn đang đóng" đổi theo, dùng tên hiển thị, không dùng mã (vd. "Chuyên viên Risk A", "Chuyên viên Risk B").
- **Chuyển chương:** chỉ tiến khi bước trước thành công. Có thể bấm lại chương đã qua để xem, nhưng không chạy lại API. Trạng thái giữ trong state của trang. Tải lại trang thì bắt đầu lại với phiên mới.
- **Màn < 1024px:** điện thoại xếp trên, "Phía sau màn hình" xếp dưới, nút chính dính cuối màn.
- Chế độ kỹ thuật bật thì mỗi chương có link "Mở màn hình đầy đủ" tới trang cũ tương ứng, giữ cùng session, và hiện ID/enum.

### 5.3 Điều hướng và trang cũ

- **Menu chính:** chỉ "Tổng quan" và "Xem câu chuyện". 4 trang cũ chỉ hiện trong menu khi bật Chế độ kỹ thuật.
- `DemoStepBar` trên các trang cũ: giữ hoặc bỏ tuỳ builder, miễn là không mâu thuẫn với `/story`. Tên chương lấy từ `DEMO_STEPS` để không lặp nội dung.

### 5.4 Dọn mã nội bộ và trích dẫn spec đang lộ (làm cùng đợt, ở chế độ thường)

- `/checker`: "Maker: RISK_MAKER_HUYEN", "Checker: RISK_CHECKER_TUAN" đổi thành tên hiển thị.
- Mô tả hàng đợi xét lại đang nhắc `OVERTURNED_ROLLBACK` thì chuyển sang câu tiếng Việt.
- `/shield`: "Model: immunity-registry-tier1" và "Khớp Tầng 1 (Trước Vision)" đổi thành câu dễ hiểu. Mã gốc chỉ hiện ở `.tech-only`.
- Còn lại, review phát hiện thêm: makerId/checkerId (khoảng dòng 684–689 của `CheckerWorkspace.tsx`), "FR-xx.x", "Lớp 2", "TTL", "HTTP 400", "Dismiss FP", "Indicator Type" và các phụ đề trích luật. Tất cả chuyển thành câu tiếng Việt thường, còn mã gốc và trích dẫn thì đưa vào `.tech-only`.
- Cỡ chữ trên 4 trang cũ: bỏ `text-[10px]`/`text-[11px]` (khoảng 60 chỗ trên `/warroom`), B2C lên 18px theo DESIGN.md.

### 5.5 Sự thật từ code mà builder phải theo (đã kiểm)

- **Số tiền:** CASE-01 là 4 lệnh × 9.500.000đ (tổng 38.000.000đ). Sân khấu chuyển lệnh đầu tiên 9.500.000đ; làn B minh họa cả 4 lệnh. (Câu pitch "giữ lại 15 triệu" là chuyện của slide, không dùng trong app.)
- **Nhân vật:** CASE-01 là "Zalo giả Công an — Bác Hùng (62t)", `USER_B2C_HUNG`. Đây là case duy nhất có bản ghi phát lại quét ảnh, nên câu chuyện dùng Bác Hùng.
- **Consent:** chuyển tiền chỉ bị giữ khi `optIn24hHold = true` và điểm rủi ro ≥75, hoặc khớp một Chỉ báo ACTIVE. Seed đặt opt-in của Hùng là `false`, vì vậy chương ② phải gọi `POST /api/shield/consent` trước. Trên sân khấu nó hiện thành bước "Bác Hùng đã bật Bảo vệ 24h", là một phần của chuyện.
- **caseId:** escalate trả về caseId. Nó chỉ dùng lại case seed `${session}::CASE-01` nếu tài khoản nhận là `990123456789`, nên giao dịch phải gửi tới đúng tài khoản này.
- **indicatorId:** lấy từ response của decision, ở `indicator.indicatorId`.
- **Đề xuất của Maker:** phải là mức `ACTIVE` và có ≥2 nguồn bằng chứng khác loại. Một loại thì server trả 400. Nếu đề xuất `SOFT_WARNING` thì không có bước Checker và không hủy giao dịch nào. Bản nháp soạn sẵn phải thỏa điều kiện này.
- **Hủy giao dịch:** chính lệnh approve đặt giao dịch liên quan sang `CANCELLED_BY_B2E` và đóng vụ.
- **Persona:**

  | Vai | Mã gửi lên | Tên hiển thị |
  |---|---|---|
  | Người giám hộ | `FAMILY_MINH` (là `guardianId` khi escalate) | Chị Minh (con gái) |
  | Maker | `RISK_MAKER_HUYEN` | Chuyên viên Huyền |
  | Checker | `RISK_CHECKER_TUAN` | Chuyên viên Tuấn |

- **Chương ③ khi LLM lỗi:** dùng bản phát lại War-Room theo đúng mẫu của quét (ticket #15). Nếu chưa có thì chương ③ hiện đúng lỗi thật và câu chuyện dừng ở đó, không bịa.

### 5.6 Ticket tiên quyết

- **#15 phát lại War-Room** làm *trước* sân khấu (đã chốt). Dùng lần chạy thật FPT trong `data/replays/warroom-CASE-01.raw.json`, theo đúng mẫu `lib/replay.ts`: nhãn "phát lại" kèm thời điểm và model, không bịa. Thiếu credential thì vẫn trả 503 `LLM_NOT_CONFIGURED`.

## 6. Những gì để builder quyết

- Viết component chương mới gọn, gọi API trực tiếp, hay tái dùng/tách phần trình bày từ các workspace lớn (`B2CShieldWorkspace`, `TransferHoldPanel`, `AgentCardsGrid`, `CheckerWorkspace`). Ưu tiên tái dùng phần hiển thị kết quả, không nhúng nguyên workspace 700 dòng.
- Cách lấy `caseId` sau khi chuyển cấp, và `indicatorId` sau khi Maker đề xuất: từ response API hiện có hoặc `GET /api/warroom/cases` / `GET /api/immunity`.
- Cơ chế consent ở chương ①: tái dùng flow consent hiện có, và hiển thị nó như một phần của câu chuyện.
- Test:
  - unit test cho logic tiến chương (reducer/state machine);
  - kiểm tra guardrail: câu tạm giữ trung lập, nhãn MẪU MÔ PHỎNG, không lộ mã ở chế độ thường;
  - ảnh chụp trước/sau làm bằng chứng PR.
- Tách ticket: gợi ý (0) #15 phát lại War-Room, (1) dọn mã lộ + cỡ chữ trang cũ, (2) trang chủ hai làn, (3) `/story` chương ①–②, (4) `/story` chương ③–④ và thẻ tổng kết.
