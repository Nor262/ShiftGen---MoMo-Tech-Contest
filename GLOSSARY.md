# MoMo TrustLoop

Hệ sinh thái phòng vệ niềm tin số khép kín. Nó nối tuyến đầu người dùng cá nhân và gia đình (B2C) với không gian điều tra gian lận của đội Risk/CSKH (B2E): bằng chứng từ B2C nuôi cuộc điều tra B2E, và kết luận đã duyệt của B2E lại bảo vệ người dùng B2C tiếp theo.

Quy ước: thuật ngữ chính viết bằng tiếng Việt, tên dùng trong code ghi trong ngoặc `()`.

## Thời điểm

**Phút 00**:
Thời điểm người dùng bắt đầu nghi ngờ một tin nhắn hay đường link, trước khi chuyển tiền.
_Tránh dùng_: Minute-0, thời điểm quét

**Phút 89**:
Thời điểm quy trình truyền thống mới phát hiện lừa đảo, khi tiền đã mất. Đây là điểm mù mà TrustLoop muốn thu hẹp.

## B2C — Lá chắn người dùng

**Lượt quét** (Scan):
Một lần người dùng gửi ảnh chụp chat hoặc đường link để hệ thống đánh giá rủi ro lừa đảo.
_Tránh dùng_: phiên quét, kiểm tra

**Bằng chứng Phút 00** (Minute-0 evidence):
Kết quả của một Lượt quét sau khi đã ẩn PII. Đây là dạng duy nhất được chuyển tiếp sang Người giám hộ và B2E.
_Tránh dùng_: ảnh gốc, raw evidence

**Ẩn PII** (PII redaction):
Việc loại bỏ CCCD, số điện thoại, số dư và lịch sử chi tiêu trước khi dữ liệu rời khỏi tay người dùng.
_Tránh dùng_: che, mask

**Bảo vệ 24h** (24h hold opt-in):
Chế độ người dùng tự bật từ trước, cho phép hệ thống tạm giữ giao dịch rủi ro cao của chính họ.
_Tránh dùng_: khóa giao dịch, phong tỏa

**Tạm giữ** (`ON_HOLD_24H`):
Trạng thái một giao dịch bị giữ lại để xác minh. Chỉ xảy ra khi người dùng đã bật Bảo vệ 24h **và** giao dịch có rủi ro cao hoặc khớp một Chỉ báo Miễn dịch đang hiệu lực. Khớp Cảnh báo mềm thì không dẫn tới Tạm giữ.
_Tránh dùng_: đóng băng, chặn

**Giao dịch bị giữ** (HeldTransaction):
Một lệnh chuyển tiền đã đi qua bước kiểm tra Tạm giữ, kèm trạng thái và hạn giữ.

**Giải phóng** (`RELEASED`):
Việc kết thúc Tạm giữ để tiền được chuyển đi. Xảy ra khi hết hạn giữ mà giao dịch chưa bị hủy hay Chuyển cấp, hoặc khi Vụ điều tra liên quan được Minh oan.
_Tránh dùng_: mở khóa, duyệt

**Thông báo trung tính** (Neutral hold message):
Câu thông báo cố định hiển thị khi Tạm giữ. Câu này không nhân danh cơ quan nhà nước nào.

**Người giám hộ** (`FAMILY_GUARDIAN`):
Người thân được người dùng chỉ định. Họ xem thẻ duyệt đã Ẩn PII và chỉ có quyền Chuyển cấp, không có quyền giải phóng giao dịch.
_Tránh dùng_: người đồng ký, co-signer

**Chuyển cấp** (`ESCALATED_TO_B2E`):
Việc Người giám hộ đẩy một Giao dịch bị giữ sang B2E để điều tra.
_Tránh dùng_: Family Co-Sign, đồng duyệt

**Báo cáo An ninh mạng** (Cyber report):
Việc người dùng chủ động gửi Bằng chứng Phút 00 về một mối đe dọa kỹ thuật (đường link, APK) sang B2E. Việc này không cần có giao dịch nào.
_Tránh dùng_: tố cáo, report

**Hủy giao dịch**:
Việc chấm dứt một Giao dịch bị giữ, khiến tiền không được chuyển. Có hai trường hợp, phải luôn phân biệt rõ: người dùng tự hủy (`CANCELLED_BY_USER`), và B2E hủy khi Vụ được Xác nhận lừa đảo (`CANCELLED_BY_B2E`). Không bao giờ ghi việc B2E hủy thành người dùng hủy.

## B2E — Phòng Tác chiến

**Vụ điều tra** (InvestigationCase):
Một hồ sơ được điều tra trong Phòng Tác chiến. Vụ có ba nguồn gốc: Chuyển cấp, Báo cáo An ninh mạng, hoặc Kịch bản mẫu. Mỗi Giao dịch bị giữ ứng với tối đa một Vụ.
_Tránh dùng_: case, ticket, hồ sơ

**Chia nhỏ giao dịch** (Smurfing):
Hành vi tách một khoản tiền lớn thành nhiều lệnh nhỏ hơn 10 triệu/lần, với tổng vượt 20 triệu/ngày (giờ UTC+7), để lọt dưới ngưỡng giám sát của QĐ 2345.
_Tránh dùng_: structuring

**Ví trung gian** (Mule):
Tài khoản hoặc ví dùng để trung chuyển tiền lừa đảo, thường có chung thiết bị với các ví khác trong cùng cụm.

**Tranh biện** (Debate):
Phần tổng hợp hai chiều từ các agent: một bên buộc tội, một bên minh oan. Tranh biện chỉ đưa ra khuyến nghị; Chuyên viên con người mới là người ra phán quyết.

**Minh oan** (`DISMISSED_FP`):
Kết luận rằng một Vụ điều tra là giao dịch hợp pháp bị nghi nhầm (false positive). Giao dịch bị giữ của Vụ được Giải phóng ngay.
_Tránh dùng_: bỏ qua, đóng vụ

**Xác nhận lừa đảo** (`CLOSED`):
Kết luận rằng một Vụ điều tra là lừa đảo thật, đạt được khi Chỉ báo Miễn dịch của Vụ được Kích hoạt.
_Tránh dùng_: đóng vụ, closed

**Thẻ bàn giao CSKH** (Handoff card):
Bản tóm tắt dành cho nhân viên CSKH, viết với giọng thấu cảm, để họ liên hệ người dùng sau khi có phán quyết.

## Miễn dịch Cộng đồng

**Miễn dịch Cộng đồng**:
Cơ chế quản trị 4 lớp, đưa kết luận đã duyệt ở B2E trở thành lá chắn cho mọi người dùng B2C.
_Tránh dùng_: blacklist, danh sách đen

**Chỉ báo Miễn dịch** (ImmunityIndicator):
Một dấu hiệu lừa đảo cụ thể (số tài khoản, tên miền, mã băm APK, số điện thoại, mã thiết bị) được quản lý theo vòng đời của Miễn dịch Cộng đồng.
_Tránh dùng_: IOC, cờ đỏ

**Cảnh báo mềm** (`SOFT_WARNING`, Lớp 1):
Trạng thái của một Chỉ báo chỉ có một nguồn bằng chứng. Nó tự hết hạn sau 72h, chỉ để cảnh báo, không gây Tạm giữ. Đây là một trạng thái, không phải mức nghiêm trọng.

**Nguồn bằng chứng độc lập** (Evidence source):
Một căn cứ chứng minh Chỉ báo là lừa đảo. Hai nguồn chỉ được coi là độc lập khi chúng khác **loại**, ví dụ Bằng chứng Phút 00 và đồ thị Chia nhỏ giao dịch. Hai báo cáo cùng loại chỉ tính là một nguồn. Cần ít nhất hai nguồn thì Chỉ báo mới được Kích hoạt.

**Kích hoạt** (`ACTIVE`, Lớp 2):
Trạng thái của một Chỉ báo đã có ít nhất hai Nguồn bằng chứng độc lập và được một Checker khác với Maker phê duyệt. Mọi đường đi tới trạng thái này đều phải qua Lớp 2, kể cả khi nâng từ Cảnh báo mềm.

**Maker / Checker** (`RISK_MAKER` / `RISK_CHECKER`):
Maker là chuyên viên Risk đề xuất Chỉ báo; Checker là người khác phê duyệt Chỉ báo đó. Một người không bao giờ được giữ cả hai vai trên cùng một Chỉ báo.

**Hạn hiệu lực** (TTL, Lớp 3):
Thời gian một Chỉ báo còn hiệu lực trước khi tự hết hạn (`EXPIRED`): 72h với Cảnh báo mềm, 720h với Chỉ báo đã Kích hoạt.

**Khiếu nại** (Appeal, Lớp 4):
Yêu cầu xem xét lại một Chỉ báo đang có hiệu lực, do chính chủ thể bị gắn Chỉ báo gửi lên. Người xét là một Checker con người, khác với Checker đã Kích hoạt Chỉ báo. Kết quả là giữ nguyên (`UPHELD`) hoặc Thu hồi.

**Thu hồi** (`ROLLED_BACK` / `OVERTURNED_ROLLBACK`):
Việc gỡ hiệu lực một Chỉ báo sau khi Khiếu nại được chấp nhận. Mọi bước đều được ghi vào nhật ký kiểm toán bất biến.
_Tránh dùng_: xóa, hủy

## Demo

**Kịch bản mẫu** (`CASE-01/02/03`):
Tình huống tổng hợp dùng để trình diễn. Luôn gắn nhãn "MẪU MÔ PHỎNG" và không chứa dữ liệu thật.

**Phiên demo** (demoSessionId):
Không gian dữ liệu riêng cho mỗi người trình diễn. Dữ liệu giữa các phiên không bao giờ nhìn thấy nhau.
