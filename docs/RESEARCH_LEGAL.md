# Nghiên cứu pháp lý: ánh xạ luật Việt Nam vào các tính năng MoMo TrustLoop

> Ngày tổng hợp: 2026-11-23. Tài liệu này nối tiếp `docs/RESEARCH_PROBLEM.md` (không lặp lại phần số liệu lừa đảo ở đó) và dùng thuật ngữ trong `GLOSSARY.md`.
> **Không phải tư vấn pháp lý.** Đây là bản đồ căn cứ để đội sản phẩm trích dẫn đúng và để pháp chế MoMo rà soát lại.

## 0. Cách đọc độ tin cậy

| Ký hiệu | Nghĩa |
|---|---|
| **[VB]** | Đã đọc nguyên văn điều khoản trong văn bản gốc hoặc văn bản hợp nhất (VBHN) chính thức |
| **[TC]** | Chỉ có nguồn thứ cấp (báo, công ty luật, bản tin). Nội dung đáng tin nhưng **chưa xác minh điều khoản** |
| **[CXM]** | Chưa xác minh điều khoản, hoặc chưa mở được văn bản. Không được trích số điều |

### Văn bản đã đọc (nguồn gốc)

| Văn bản | Tình trạng tại 23/11/2026 | Nguồn đã đọc |
|---|---|---|
| Luật Phòng, chống rửa tiền 14/2022/QH15 | Còn hiệu lực. Sửa bởi Luật 23/2026/QH16 (hiệu lực 01/12/2026). VBHN 159/2026/VBHN-LQ-VPQH ngày 28/9/2026 | https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/10/159-vbhn-vpqh.signed.pdf **[VB]** |
| TT 40/2024/TT-NHNN (dịch vụ trung gian thanh toán, ví điện tử) | Còn hiệu lực. Sửa bởi TT 41/2025/TT-NHNN (05/11/2025; một số điểm 01/01/2026) và TT 22/2026/TT-NHNN (19/5/2026) | VBHN NHNN, Cổng TTĐT Chính phủ ký số 30/6/2026: https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/7/76-vbhn-nhnn.signed.pdf **[VB]** |
| Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 | Hiệu lực 01/01/2026 (Điều 38) | Toàn văn (ghi nguồn chinhphu.vn): https://ketoananpha.vn/luat-bao-ve-du-lieu-ca-nhan-nam-2025 ; https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Bao-ve-du-lieu-ca-nhan-2025-91-2025-QH15-625628.aspx **[VB]** |
| Luật Trí tuệ nhân tạo 134/2025/QH15 | Thông qua 10/12/2025, hiệu lực 01/3/2026 (Điều 34). Hệ thống AI tài chính đã chạy trước đó có 18 tháng chuyển tiếp (Điều 35.1.a) | Toàn văn .docx: https://static3.luatvietnam.vn/uploaded/others/2025/12/25/luat-134-2025-qh15_2512152052.docx **[VB]** |
| Bộ luật Tố tụng hình sự 2015 (VBHN 2026, gồm Luật 99/2025/QH15 hiệu lực 01/7/2025) | Còn hiệu lực | https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/10/172-vbhn-vpqh.signed.pdf **[VB]** |
| QĐ 2872/QĐ-NHNN ngày 30/12/2024 | Hiệu lực 01/01/2025, **bãi bỏ toàn bộ QĐ 2345/QĐ-NHNN** | https://luatvietnam.vn/tai-chinh/quyet-dinh-2872-qd-nhnn-405747-d1.html **[VB, trích Điều 1–2 qua LuatVietnam]** |
| TT 77/2025/TT-NHNN (sửa TT 50/2024) | Ký 31/12/2025, hiệu lực 01/3/2026; áp dụng cả tổ chức trung gian thanh toán | Thông cáo báo chí NHNN: https://www.sbv.gov.vn/documents/20117/4269594/thong_cao_bao_chi_tt_50_v1_b6e0_0501.signed-1.pdf.pdf/05f4b2d5-310b-3594-e034-d9627a093cef **[TC – nguồn NHNN nhưng không phải toàn văn]** |
| NĐ 356/2025/NĐ-CP (hướng dẫn Luật 91) | Ký 31/12/2025, hiệu lực 01/01/2026, **thay thế NĐ 13/2023/NĐ-CP** | EY Legal Alert 03/2026 **[TC]** (thuvienphapluat trả 403, không mở được toàn văn) |
| TT 53/2026/TT-NHNN (an toàn, quản lý rủi ro AI ngành ngân hàng) | Ký 30/9/2026, hiệu lực 15/11/2026 | Chỉ có bài báo: CafeF 16/11/2026, LuatVietnam, Thị trường Tài chính Tiền tệ **[TC]**. **Không tìm được toàn văn** |

---

## 1. Kết luận nhanh

| Tính năng | Kết luận | Điều kiện / rủi ro chính |
|---|---|---|
| F1 Quét ảnh chat bằng LLM + Ẩn PII | **OK có điều kiện** | Đồng ý riêng cho mục đích quét (Luật 91 Điều 9). Dữ liệu bên thứ ba trong ảnh dựa vào Điều 19.1. **Nếu LLM chạy ngoài VN (Gemini/Bedrock) thì là chuyển dữ liệu xuyên biên giới** (Điều 20.1.c): phải có hồ sơ đánh giá tác động. Nên Ẩn PII trên máy người dùng *trước* khi gửi |
| F2 Bảo vệ 24h (opt-in) | **OK có điều kiện** | Cơ sở là thỏa thuận mở và sử dụng ví cùng quy định nội bộ quản lý rủi ro (TT 40 Điều 19.1.l, Điều 28.1.c.iii). Đây **không phải** "trì hoãn giao dịch" theo Luật PCRT Điều 44 (tối đa 03 ngày làm việc, bắt buộc báo cáo ngay). Hai cơ chế phải tách bạch |
| F3 Người giám hộ | **OK có điều kiện** | Cần chủ ví đồng ý cung cấp thông tin cho người thân (Luật 91 Điều 15.2.b; TT 40 Điều 19.1.n.i), và người giám hộ cũng phải đồng ý về dữ liệu của chính họ. Người giám hộ không có quyền giải phóng tiền là đúng (TT 40 Điều 28.1.a.iv) |
| F4 Điều tra B2E bằng agent | **OK** (căn cứ mạnh nhất) | Luật PCRT Điều 29 liệt kê đúng các dấu hiệu chia nhỏ, ví trung gian, dùng chung thiết bị. TT 40 Phụ lục 01 có lý do số 3 và số 8. Con người quyết định (Luật 134 Điều 4.2). **Đổi căn cứ ngưỡng: QĐ 2345 đã bị bãi bỏ** |
| F5 Miễn dịch Cộng đồng | **Rủi ro pháp lý trung bình, làm được nếu thiết kế đúng** | Số tài khoản, SĐT, mã thiết bị của người bị gắn cờ là **dữ liệu cá nhân**. Thông tin tài khoản ngân hàng thuộc nhóm **nhạy cảm** theo NĐ 356 [TC]. Hiển thị cho người dùng khác là "cung cấp/công khai": chỉ dựa được vào Luật 91 Điều 19.1.b và Điều 16.2.c, phải có cơ chế giám sát (Điều 19.2). Cấm tiết lộ việc đã gửi báo cáo giao dịch đáng ngờ (Luật PCRT Điều 40.2) |
| F6 B2E hủy giao dịch bị giữ | **OK có điều kiện** | Hủy một lệnh **chưa thực hiện** là "từ chối thực hiện giao dịch" theo TT 40 Điều 28.1.c.iii. **Không được** thu hồi tiền đã chuyển đi: trích Nợ vì lừa đảo cần *kết luận của cơ quan có thẩm quyền* (TT 40 Điều 19.1.e.iii). Phải gửi báo cáo giao dịch đáng ngờ (Luật PCRT Điều 26, 37) |

---

## 2. Phân tích theo tính năng

### F1. Lượt quét ảnh chụp chat/link bằng LLM, Ẩn PII, không lưu ảnh gốc

**Căn cứ cho phép / yêu cầu**
- **Luật 91 Điều 9 [VB]:** sự đồng ý phải tự nguyện, cho *từng mục đích* (9.4.a), "không được kèm theo điều kiện bắt buộc phải đồng ý với các mục đích khác" (9.4.b), "sự im lặng hoặc không phản hồi không được coi là sự đồng ý" (9.4.d), và phải ở dạng kiểm chứng được (9.3).
- **NĐ 356/2025 [TC – EY]:** phải lưu bằng chứng đồng ý (thời điểm, nội dung), cấm thiết lập mặc định đồng ý.
- **Luật 91 Điều 19.1.a [VB]:** được xử lý không cần đồng ý để "bảo vệ… quyền, lợi ích hợp pháp của chủ thể dữ liệu cá nhân hoặc người khác trong trường hợp cấp bách; bảo vệ quyền hoặc lợi ích chính đáng của mình, của người khác… trước hành vi xâm phạm". Bên kiểm soát dữ liệu phải chứng minh trường hợp này. **Điều 19.1.b:** "phòng, chống tội phạm và vi phạm pháp luật". Đây là căn cứ cho phần dữ liệu của **bên thứ ba** (kẻ gian, người khác trong nhóm chat) xuất hiện trong ảnh.
- **Luật 91 Điều 3.2–3.3 và Điều 30.1 [VB]:** chỉ thu thập đúng phạm vi và mục đích, lưu trong thời gian phù hợp với mục đích. Dữ liệu trong môi trường AI phải "xử lý đúng mục đích và giới hạn trong phạm vi cần thiết". Không lưu ảnh gốc là cách tuân thủ trực tiếp.
- **Luật 91 Điều 30.3–30.4 [VB]:** hệ thống AI phải tích hợp biện pháp bảo mật, phân quyền truy cập, và "phân loại theo mức độ rủi ro" khi xử lý dữ liệu cá nhân bằng AI.
- **Luật 134 Điều 11.1 [VB]:** nhà cung cấp phải bảo đảm hệ thống AI tương tác trực tiếp với con người được thiết kế để người dùng *nhận biết* họ đang tương tác với AI.
- **TT 40 Điều 28.2 [VB]:** tổ chức cung ứng ví "phải thường xuyên cảnh báo, hướng dẫn cho khách hàng về các phương thức thủ đoạn tội phạm". Tính năng quét là một cách thực hiện nghĩa vụ này.

**Ràng buộc / có thể cấm**
- **Chuyển dữ liệu xuyên biên giới:** Luật 91 Điều 20.1.c [VB] tính cả trường hợp "sử dụng nền tảng ở ngoài lãnh thổ… để xử lý dữ liệu cá nhân được thu thập tại Việt Nam". Gọi Gemini hoặc Bedrock đặt ngoài VN là thuộc trường hợp này. Điều 20.2 yêu cầu lập hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới và gửi cơ quan chuyên trách **trong 60 ngày** kể từ lần chuyển đầu tiên. Mức phạt tối đa là **5% doanh thu năm liền trước** (Điều 8.4). Theo EY [TC], NĐ 356 chuyển sang **tiền kiểm**: hồ sơ phải được A05 – Bộ Công an chấp thuận.
- **Dữ liệu nhạy cảm:** theo EY [TC], NĐ 356 xếp *hình ảnh CCCD, thông tin tài khoản ngân hàng, thẻ, lịch sử giao dịch tài chính* vào nhóm nhạy cảm. Ảnh chat lệnh chuyển tiền gần như luôn có các thông tin này. Luật 91 Điều 27.1.a [VB] buộc tổ chức tài chính "thực hiện đầy đủ quy định về bảo vệ dữ liệu cá nhân nhạy cảm". Theo EY [TC], khi chuyển giao dữ liệu nhạy cảm phải mã hóa hoặc ẩn danh.
- **Bên xử lý (nhà cung cấp LLM):** chuyển giao cho bên xử lý phải theo Luật 91 Điều 17.1.d [VB]. Theo EY [TC], NĐ 356 yêu cầu có thỏa thuận ghi rõ mục đích, loại dữ liệu, thời hạn và việc xóa dữ liệu. Hợp đồng với nhà cung cấp LLM phải cấm dùng dữ liệu để huấn luyện. Liên quan: Luật 134 Điều 7.3 [VB] cấm dùng dữ liệu cho AI trái pháp luật về dữ liệu cá nhân.
- **Hồ sơ đánh giá tác động xử lý dữ liệu (DPIA):** Luật 91 Điều 21.1 [VB] yêu cầu lập và gửi trong 60 ngày kể từ ngày đầu xử lý. MoMo không thuộc diện miễn của doanh nghiệp nhỏ vì xử lý dữ liệu nhạy cảm của số lượng lớn chủ thể (Điều 38.2).
- **Ẩn PII phía máy chủ vẫn là "xử lý":** nếu ảnh gốc lên server rồi mới che, MoMo vẫn đã thu thập ảnh gốc. Câu "trước khi dữ liệu rời khỏi tay người dùng" trong GLOSSARY chỉ đúng khi che **trên thiết bị**.

**Kết luận: OK có điều kiện.**
1. Màn hình đồng ý riêng cho Lượt quét, mặc định tắt, lưu log đồng ý. **Đã làm (#5).**
2. Ghi rõ "kết quả do AI tạo" (Luật 134 Điều 11.1), kèm nút nhờ người thật xem xét (Điều 4.2). **Đã làm (#5).**
   - Phạm vi của Đồng ý quét là mục đích *gửi ảnh hoặc nội dung tới AI*. Tra cứu số tài khoản/đường link trong Kho Miễn dịch (do con người duyệt) không gửi gì tới AI hay ra nước ngoài nên không cần mục này; căn cứ xử lý là Điều 19.1.b (phòng, chống tội phạm) như với dữ liệu bên thứ ba. Kiểm tra đồng ý chạy trước khi máy chủ nạp hay băm ảnh; giao diện khóa tải ảnh cho tới khi người dùng đồng ý.
3. Ẩn PII trên thiết bị trước khi gọi LLM; không lưu ảnh gốc.
4. Nếu dùng LLM ngoài VN: hồ sơ đánh giá xuyên biên giới (Điều 20), DPIA (Điều 21), thỏa thuận bên xử lý cấm huấn luyện. Nếu không thì dùng LLM đặt tại VN.
5. Lập hồ sơ chứng minh căn cứ Điều 19.1.a/b cho dữ liệu bên thứ ba.

### F2. Bảo vệ 24h: người dùng đồng ý trước cho phép ví tạm giữ giao dịch rủi ro cao của chính mình

**Căn cứ cho phép**
- **TT 40 Điều 19.1.l [VB]:** thỏa thuận mở và sử dụng ví *phải* có nội dung "các biện pháp quản lý rủi ro… trong đó bao gồm… việc từ chối thực hiện giao dịch hoặc tạm dừng thực hiện các giao dịch trên ví điện tử phù hợp với quy định tại Điều 28".
- **TT 40 Điều 28.1.c.(iii) [VB]** (sửa bởi TT 41/2025, hiệu lực 01/01/2026): quy định nội bộ quản lý rủi ro phải xác định "các trường hợp áp dụng từ chối hoặc tạm dừng thực hiện các giao dịch quy định tại khoản 2 Điều 25… bằng phương tiện điện tử". Khoản 2 Điều 25 bao gồm chuyển tiền đến tài khoản ngân hàng và ví khác.
- **TT 40 Điều 34.1–34.2 [VB]:** tổ chức trung gian thanh toán có quyền "quy định điều kiện sử dụng dịch vụ" và "quy định các biện pháp đảm bảo an toàn cho việc sử dụng dịch vụ".
- **TT 40 Điều 37.1.a [VB]:** ví thực hiện lệnh thanh toán "sau khi đã kiểm tra, kiểm soát tính hợp pháp, hợp lệ của lệnh thanh toán".
- **Luật 134 Điều 4.2 [VB]:** bảo đảm khả năng can thiệp của con người đối với quyết định của AI. Việc giữ là biện pháp trì hoãn, có con người xem lại.

**Ràng buộc**
- **Phải nằm trong thỏa thuận và quy định nội bộ:** cấu hình opt-in đứng một mình chưa đủ. Phải đưa trường hợp tạm dừng vào điều kiện giao dịch chung, niêm yết công khai và xác nhận khách hàng đã đọc (TT 40 Điều 19.2).
- **Không lẫn với "trì hoãn giao dịch" của Luật PCRT Điều 44 [VB].** Điều 44 bắt buộc trì hoãn khi bên giao dịch thuộc Danh sách đen, khi có lý do tin giao dịch liên quan tội phạm theo các trường hợp ở điểm b, hoặc khi cơ quan có thẩm quyền yêu cầu. Thời hạn "không quá 03 ngày làm việc" và phải "báo cáo ngay cho cơ quan nhà nước có thẩm quyền và Ngân hàng Nhà nước". Nếu một giao dịch bị giữ 24h mà rơi vào Điều 44, chế độ Điều 44 áp dụng, kể cả với người dùng chưa bật Bảo vệ 24h.
- **Luật PCRT Điều 37.3 [VB]:** nếu giao dịch đáng ngờ do khách hàng yêu cầu "có dấu hiệu liên quan đến tội phạm", phải báo cơ quan có thẩm quyền và NHNN **trong 24 giờ**. Giao dịch bị giữ của nạn nhân thường không phải tài sản phạm tội. Tuy nhiên tài khoản nhận có thể là ví trung gian, nên B2E cần kiểm tra nghĩa vụ này.
- **Đồng ý theo Luật 91:** Bảo vệ 24h chủ yếu là điều khoản hợp đồng, **không phải** đồng ý xử lý dữ liệu. Phần chấm điểm rủi ro giao dịch thì dựa vào Luật 91 Điều 19.1.d (thực hiện thỏa thuận) và 19.1.b.
- **TT 53/2026 [TC]:** theo CafeF, quyết định tự động bị khách hàng khiếu nại thì "con người phải trực tiếp xem xét lại và kết quả xem xét là căn cứ cuối cùng". **Chưa xác minh điều khoản.** Việc giữ do AI chấm điểm kích hoạt nên phải có kênh để người dùng yêu cầu người thật xem lại.

**Kết luận: OK có điều kiện.**
1. Đưa vào thỏa thuận ví và quy định nội bộ (TT 40 Điều 19, 28).
2. Người dùng tự hủy được (`CANCELLED_BY_USER`) và tắt được chế độ.
3. Có kênh nhờ người thật xem xét.
4. Tách luồng giữ 24h khỏi luồng trì hoãn theo Điều 44 Luật PCRT.
5. Thông báo trung tính là phù hợp vì không được tiết lộ việc đã gửi báo cáo giao dịch đáng ngờ (Luật PCRT Điều 40.2, xem F5).

### F3. Người giám hộ xem thẻ đã Ẩn PII, chỉ được Chuyển cấp

**Căn cứ**
- **Luật 91 Điều 15.2.b [VB]:** bên kiểm soát dữ liệu cung cấp dữ liệu cá nhân "cho cơ quan, tổ chức, cá nhân khác khi được chủ thể dữ liệu cá nhân đồng ý".
- **TT 40 Điều 19.1.n.(i) [VB]:** ví chỉ cung cấp thông tin theo yêu cầu cơ quan có thẩm quyền "hoặc được sự chấp thuận của khách hàng". **TT 40 Điều 37.1.e [VB]:** ví phải bảo mật thông tin ví và giao dịch của khách hàng. Vì vậy chỉ được chia sẻ khi chủ ví đã đồng ý.
- **TT 40 Điều 28.1.a.(iv) [VB]:** biện pháp bảo đảm ví do "chính chủ ví điện tử hoặc người được ủy quyền hoặc người đại diện" sử dụng. Người giám hộ không phải người được ủy quyền, nên **không trao quyền giải phóng tiền là đúng luật**.
- **Luật 91 Điều 24 [VB]:** với người "có khó khăn trong nhận thức, làm chủ hành vi" hoặc bị mất/hạn chế năng lực hành vi dân sự, **người đại diện theo pháp luật** thực hiện quyền của chủ thể. Người thân do người dùng chỉ định **không** tự động là người đại diện theo pháp luật.

**Ràng buộc**
- Đồng ý phải theo từng mục đích (Điều 9.4.a). Người dùng phải được biết người giám hộ thấy những gì và rút lại được (Điều 10).
- Dữ liệu của **người giám hộ** (SĐT, tên) cũng cần sự đồng ý của chính họ.
- Thẻ giám hộ có thể chứa dữ liệu bên nhận tiền (bên thứ ba). Chỉ hiện ở mức tối thiểu (che một phần số tài khoản), căn cứ Điều 3.2 và 19.1.a.
- Không thiết kế người giám hộ như người đồng ký: tránh tạo ra quyền định đoạt tài sản mà luật không trao.

**Kết luận: OK có điều kiện.**
1. Hai bên đồng ý: chủ ví và người giám hộ.
2. Ghi rõ phạm vi thông tin người giám hộ được thấy.
3. Có nút thu hồi quyền giám hộ bất kỳ lúc nào.
4. Không ẩn đi quyền tự quyết của chủ ví.

### F4. B2E điều tra bằng AI agent: đồ thị chia nhỏ giao dịch, ví trung gian, dùng chung thiết bị

**Căn cứ (rất mạnh)**
- **Luật PCRT Điều 29 – Dấu hiệu đáng ngờ trong lĩnh vực trung gian thanh toán [VB]:**
  - khoản 1: tiền vào rồi rút ra nhanh; doanh số lớn nhưng số dư gần 0 (ví trung gian);
  - khoản 2: nạp nhiều lần giá trị nhỏ, sau đó chuyển một khoản lớn;
  - khoản 3: "chuyển tiền thường xuyên có giá trị nhỏ từ nhiều ví điện tử khác nhau về một ví điện tử… thực hiện nhiều giao dịch, mỗi giao dịch gần mức giá trị lớn phải báo cáo" (chia nhỏ giao dịch);
  - khoản 8: liên tục đổi thiết bị đăng nhập hoặc IP;
  - khoản 9: "thường xuyên sử dụng một thiết bị đăng nhập hoặc một địa chỉ IP để thực hiện giao dịch trên nhiều ví điện tử không cùng một chủ".
- **TT 40 Điều 28.1.b [VB]:** ví phải có "Bộ tiêu chí nhận diện các ví điện tử có dấu hiệu nghi ngờ gian lận, lừa đảo" và thường xuyên cập nhật. **Phụ lục 01** (thay bởi TT 41/2025) liệt kê các lý do. Lý do số 3: ví nhận tiền từ nhiều nguồn rồi chuyển đi ngay. Lý do số 4: hơn 03 giao dịch nhận tiền từ ví hoặc tài khoản trong danh sách nghi ngờ. Lý do số 8: "một thông tin định danh duy nhất của thiết bị được sử dụng để thực hiện giao dịch cho nhiều hơn 01 ví điện tử". Cột 16 yêu cầu báo cáo địa chỉ MAC, IMEI hoặc serial.
- **TT 40 Điều 28.1.d và 28.4.c [VB]:** phải đối chiếu chủ ví với SIMO (Hệ thống thông tin hỗ trợ quản lý, giám sát và phòng ngừa rủi ro gian lận của NHNN) và danh sách Bộ Công an cung cấp.
- **Luật PCRT Điều 26.1 [VB]:** báo cáo giao dịch đáng ngờ khi "có cơ sở hợp lý để nghi ngờ". Việc xác định này dựa trên phân tích, đánh giá. Đồ thị của agent chính là phần phân tích đó.
- **Luật 91 Điều 19.1.b [VB]:** xử lý không cần đồng ý để phòng, chống tội phạm. Khi dùng căn cứ này phải có cơ chế giám sát theo Điều 19.2: quy trình, đánh giá rủi ro, kiểm tra định kỳ, kênh tiếp nhận phản ánh.
- **Luật 134 Điều 4.2 [VB]:** AI không thay thế thẩm quyền của con người; con người kiểm soát và can thiệp được. Nếu hệ thống bị xếp rủi ro cao, **Điều 14.2 [VB]** yêu cầu bên triển khai vận hành đúng mục đích, bảo đảm can thiệp của con người, minh bạch và xử lý sự cố.

**Ràng buộc**
- **Ngưỡng 10 triệu/lần và 20 triệu/ngày không còn đến từ QĐ 2345.** QĐ 2345/QĐ-NHNN đã **bị bãi bỏ toàn bộ** bởi QĐ 2872/QĐ-NHNN từ 01/01/2025. Ngưỡng xác thực cho khách hàng cá nhân hiện nằm trong TT 50/2024/TT-NHNN (hiệu lực 01/01/2025, sửa bởi TT 77/2025) [TC – báo chí, **chưa xác minh phụ lục/điều khoản**]. Căn cứ pháp lý tốt hơn cho việc *phát hiện* chia nhỏ giao dịch là Luật PCRT Điều 29.3 và Phụ lục 01 TT 40, không phải ngưỡng xác thực.
- **Mức độ rủi ro của AI:** Luật 134 Điều 13.4 [VB] giao Thủ tướng ban hành danh mục hệ thống AI rủi ro cao. Một nguồn báo [TC] nhắc QĐ 33/2026/QĐ-TTg, **chưa xác minh**. TT 53/2026 [TC] xếp AI *tự động thanh toán* vào nhóm rủi ro cao theo ngưỡng 10/20 triệu (Điều 4, theo CafeF), không xếp AI phát hiện gian lận. **Cần pháp chế xác định** hệ thống chấm điểm và giữ tiền thuộc mức nào.
- Mã thiết bị và IP là dữ liệu cá nhân. Theo EY [TC], NĐ 356 xếp dữ liệu theo dõi hành vi trên mạng vào nhóm nhạy cảm. Chỉ dùng nội bộ, phân quyền theo Luật 91 Điều 30.3.

**Kết luận: OK.** Chuyên viên con người ra phán quyết; agent chỉ đưa khuyến nghị. Trích Luật PCRT Điều 29 và TT 40 Phụ lục 01, không trích QĐ 2345.

### F5. Miễn dịch Cộng đồng: Chỉ báo đã kiểm chứng cảnh báo người dùng khác

**Câu hỏi 1: SĐT hoặc số tài khoản của kẻ gian có phải dữ liệu cá nhân không?**
**Có.** Luật 91 Điều 2.1 [VB] định nghĩa dữ liệu cá nhân là thông tin "xác định hoặc giúp xác định một con người cụ thể". Số tài khoản hoặc ví đứng tên cá nhân (đã eKYC sinh trắc học) và SĐT chính chủ đều giúp xác định người đó. Theo EY [TC], thông tin tài khoản ngân hàng là **dữ liệu nhạy cảm** theo NĐ 356. Mã thiết bị cũng là dữ liệu cá nhân.
Tên miền, mã băm APK và tài khoản của tổ chức thường **không phải** dữ liệu cá nhân, trừ khi gắn với một cá nhân.

**Câu hỏi 2: Hiển thị Chỉ báo cho người dùng khác có phải "xử lý dữ liệu cá nhân" cần căn cứ không?**
**Có.** Hiển thị là "cung cấp" hoặc "công khai" theo Luật 91 Điều 2.6 [VB]. Người bị gắn Chỉ báo không đồng ý, nên chỉ còn các căn cứ sau:
- **Luật 91 Điều 19.1.b [VB]** (phòng, chống tội phạm và vi phạm pháp luật) và **19.1.a** (bảo vệ quyền, lợi ích hợp pháp của người khác trước hành vi xâm phạm; bên kiểm soát *có trách nhiệm chứng minh*);
- **Luật 91 Điều 16.2.c [VB]:** cho phép công khai dữ liệu cá nhân trong "trường hợp quy định tại điểm b khoản 1 Điều 19". Điều 16.1 yêu cầu "mục đích cụ thể", phạm vi phù hợp với mục đích và không xâm phạm quyền của chủ thể;
- **Điều 19.2 [VB]:** bắt buộc có quy trình, đánh giá rủi ro, kiểm tra định kỳ và **cơ chế tiếp nhận, xử lý phản ánh**. Lớp 4 Khiếu nại của sản phẩm đáp ứng đúng yêu cầu này;
- Nếu Chỉ báo là ví MoMo của một khách hàng khác: **TT 40 Điều 19.1.m [VB]** cho phép đưa vào thỏa thuận ví việc "xử lý các trường hợp nghi ngờ gian lận". Nhưng **Điều 37.1.e** buộc bảo mật thông tin ví. Nên chỉ trả về *mức cảnh báo* khi người dùng nhập đúng số đó ở bước chuyển tiền, **không** công bố một danh sách.

**Ràng buộc / rủi ro**
- **Không tiết lộ việc đã gửi báo cáo giao dịch đáng ngờ:** Luật PCRT Điều 40.2 [VB] cấm người của đối tượng báo cáo "tiết lộ thông tin về việc đã báo cáo giao dịch đáng ngờ hoặc các thông tin có liên quan đến giao dịch đáng ngờ". Nội dung cảnh báo không được nói "đã báo cáo NHNN/Công an".
- **Danh dự, uy tín và vu khống:** gọi một người là "lừa đảo" khi chưa có bản án là rủi ro dân sự và hình sự (Bộ luật Dân sự về bảo vệ danh dự, uy tín; BLHS tội vu khống) [CXM – chưa mở văn bản, không trích số điều]. Nội dung hiển thị nên là "tài khoản có dấu hiệu rủi ro cao", không phải "tài khoản lừa đảo".
- **TTL và lưu trữ:** Luật 91 Điều 3.3 và 14.1.b [VB] yêu cầu lưu trong thời gian phù hợp với mục đích, xóa khi đã hoàn thành mục đích. TTL 72h/720h phù hợp *cho việc hiển thị cảnh báo*. Tuy nhiên Luật PCRT Điều 38.2 [VB] buộc lưu hồ sơ và kết quả phân tích **05 năm**. Vì vậy hết hạn hoặc Thu hồi chỉ được gỡ cảnh báo, **không được xóa hồ sơ điều tra và nhật ký kiểm toán**.
- **Quyền của người bị gắn cờ:** người bị gắn cờ là chủ thể dữ liệu và có quyền biết, phản đối, chỉnh sửa, khiếu nại (Luật 91 Điều 4.1 [VB]). Quyền rút đồng ý và hạn chế xử lý **không áp dụng** khi xử lý theo Điều 19 (Điều 10.1). Quyền xóa **không áp dụng** trong các trường hợp Điều 19 (Điều 14.2). Như vậy Khiếu nại là kênh đúng; người bị gắn cờ không thể buộc xóa ngay. Thời hạn phản hồi theo NĐ 356 [TC – EY]: phản đối/hạn chế phản hồi trong 2 ngày làm việc, thực hiện trong 15 ngày.
- **TT 53/2026 [TC]:** khiếu nại về quyết định tự động phải do con người xem xét lại, và kết quả đó là căn cứ cuối cùng. **Chưa xác minh điều khoản.** TT 53 **không** quy định Maker–Checker, TTL hay danh sách cộng đồng (theo mọi bài tóm tắt đã đọc). Đó là lựa chọn thiết kế, không phải nghĩa vụ của TT 53.
- **SIMO đã có sẵn:** TT 40 Điều 30.2 [VB] buộc ví gửi NHNN thông tin ví nghi ngờ gian lận **trước ngày 10 hằng tháng** theo Phụ lục 01–02, qua SIMO. Chỉ báo đã Kích hoạt là ví MoMo phải được đưa vào luồng này.

**Kết luận: Rủi ro pháp lý trung bình, làm được với các điều kiện sau.**
1. Chỉ trả kết quả khi người dùng tra đúng số ở bước chuyển tiền; không công bố danh sách.
2. Che một phần định danh và hiển thị nội dung trung tính ("rủi ro cao").
3. Lập hồ sơ chứng minh căn cứ Điều 19.1.b và cơ chế giám sát Điều 19.2.
4. Mã thiết bị và IP chỉ dùng nội bộ, không bao giờ hiển thị cho người dùng.
5. Thu hồi chỉ gỡ hiển thị; hồ sơ giữ 05 năm.
6. Không tiết lộ việc đã gửi báo cáo giao dịch đáng ngờ.

### F6. Kết luận rủi ro cao → B2E hủy giao dịch bị giữ

**Căn cứ**
- Giao dịch bị giữ **chưa được thực hiện**. Hủy nó là "từ chối thực hiện giao dịch" theo TT 40 Điều 28.1.c.(iii) và Điều 19.1.l [VB], và tiền vẫn ở trong ví người dùng. Ví không chiếm giữ tài sản.
- **Luật PCRT Điều 26 và 37.2 [VB]:** nếu có cơ sở hợp lý để nghi ngờ, phải báo cáo giao dịch đáng ngờ cho NHNN trong **03 ngày làm việc** kể từ khi phát sinh giao dịch, hoặc **01 ngày làm việc** kể từ khi phát hiện. Điều 37.3: trong **24 giờ** nếu giao dịch có dấu hiệu liên quan tội phạm. Đầu mối tiếp nhận là Cục Phòng, chống rửa tiền (TT 40 Điều 49 [VB] có tên đơn vị này).
- **Luật PCRT Điều 44.4 [VB]:** đối tượng báo cáo không chịu trách nhiệm pháp lý về hậu quả khi trì hoãn *đúng Điều 44*. Hủy theo hợp đồng **không** được miễn trách nhiệm theo điều khoản này.

**Ràng buộc**
- **Không thu hồi tiền đã chuyển đi:** TT 40 Điều 19.1.e.(iii) [VB] chỉ cho trích Nợ ví "liên quan đến gian lận, lừa đảo khi có kết luận của cơ quan có thẩm quyền". Việc phong tỏa tài khoản bên nhận thực hiện theo quyết định của cơ quan có thẩm quyền (Luật PCRT Điều 45 [VB]).
- **MoMo không "kết luận" một tội phạm.** Trạng thái `CLOSED` – "Kết luận rủi ro cao" (trước đây gọi là "Xác nhận lừa đảo") là kết luận nội bộ về rủi ro. Nội dung gửi khách và CSKH không nên khẳng định đã có tội phạm.
- **Người dùng phản đối việc hủy:** chủ ví vẫn có quyền tra soát, khiếu nại (TT 40 Điều 19.1.k, 37.1.g [VB]). Theo nguồn thứ cấp [TC], TT 15/2024 (sửa bởi TT 30/2025) đặt thời hạn trả lời tra soát 04 ngày làm việc. Chưa xác minh điều khoản.
- **TT 40 Điều 37.3.b [VB]:** ví chịu trách nhiệm bồi thường nếu cơ quan có thẩm quyền đã có văn bản thông báo về ví gian lận mà ví "không có biện pháp xử lý kịp thời". Đây là rủi ro khi *không* chặn, giúp củng cố lý do để hủy.

**Kết luận: OK có điều kiện.**
1. Chỉ hủy lệnh chưa thực hiện.
2. Chuyên viên con người phê duyệt.
3. Ghi đúng `CANCELLED_BY_B2E`, không ghi thành người dùng hủy.
4. Mở kênh tra soát cho người dùng.
5. Gửi báo cáo giao dịch đáng ngờ đúng hạn.
6. Không hứa thu hồi tiền đã đi.

### Ghi chú về các văn bản được nêu trong đề bài

| Văn bản | Đánh giá |
|---|---|
| Luật Các TCTD 32/2024/QH15 | Là căn cứ ban hành TT 40. Tuy nhiên MoMo là tổ chức trung gian thanh toán phi ngân hàng, không phải TCTD, nên nghĩa vụ bảo mật áp dụng trực tiếp là TT 40 Điều 37.1.e. Các điều của Luật TCTD: [CXM] |
| NĐ 19/2023/NĐ-CP, TT 09/2023/TT-NHNN | Hướng dẫn Luật PCRT; theo VCCI vẫn "còn hiệu lực". NHNN có dự thảo sửa TT 09 [TC]. Chưa mở toàn văn: [CXM] |
| NĐ 52/2024/NĐ-CP | Hiệu lực 01/7/2024. TT 40 Điều 37.4 [VB] dẫn chiếu "hành vi bị cấm… tại Điều 8 Nghị định số 52/2024/NĐ-CP". Theo báo chí [TC], Điều 8 cấm dùng tài khoản/ví để lừa đảo và cấm mua bán ví. Có dự thảo sửa NĐ 52 năm 2026, chưa rõ đã ban hành |
| TT 17/2024 (sửa bởi TT 25/2025), TT 18/2024 (sửa bởi TT 45/2025) | Áp dụng cho tài khoản thanh toán ngân hàng và thẻ. Với ví, quy định tương ứng nằm trong TT 40. TT 25/2025 Điều 11 sửa khoản 2 Điều 22 TT 17: ngân hàng gửi định kỳ danh sách tài khoản nghi ngờ [TC] |
| NĐ 13/2023/NĐ-CP | **Đã bị thay bởi NĐ 356/2025 từ 01/01/2026** [TC – EY]. Luật 91 Điều 39 [VB] giữ hiệu lực của các đồng ý đã thu theo NĐ 13. Không trích NĐ 13 cho tính năng mới |
| Luật An ninh mạng 116/2025/QH15 | Hiệu lực 01/7/2026. Điều 7 cấm "lừa đảo chiếm đoạt tài sản", cấm dùng AI giả mạo video, hình ảnh, giọng nói, và cấm thu thập, kinh doanh trái phép dữ liệu cá nhân [TC – Cổng Hà Tĩnh, chưa có số khoản]. Điều 39: Bộ Công an cảnh báo và chia sẻ thông tin an ninh mạng [TC]. Yêu cầu lưu trữ dữ liệu tại VN: [CXM] |
| Luật Giao dịch điện tử 20/2023/QH15 | Hiệu lực 01/7/2024. Theo mục lục [TC]: Điều 8 về giá trị pháp lý của thông điệp dữ liệu, Điều 11 về giá trị làm chứng cứ, Điều 13 về lưu trữ. Đây là căn cứ cho log đồng ý và gói bằng chứng điện tử. Nội dung điều: [CXM] |
| BLHS Điều 174 (lừa đảo chiếm đoạt tài sản), Điều 290 (sử dụng mạng máy tính, mạng viễn thông, phương tiện điện tử chiếm đoạt tài sản) | Hai tội danh tồn tại [TC]. Theo bình luận, Điều 290 chỉ áp dụng khi hành vi không thuộc Điều 173/174. Chưa xác minh Luật 86/2025/QH15 (hiệu lực 01/7/2025) có sửa hai điều này không. Chỉ dùng để *giải thích* cho người dùng, không dùng để kết luận |
| QĐ 2345/QĐ-NHNN | **Hết hiệu lực từ 01/01/2025** (bãi bỏ bởi QĐ 2872/QĐ-NHNN) |
| NĐ 330/2026/NĐ-CP (xử phạt về bảo vệ dữ liệu cá nhân) | Theo EY [TC], ký 19/8/2026. Chưa mở được: [CXM] |

---

## 3. Luật thành tính năng

Mỗi ý tưởng dưới đây đều xuất phát từ một nghĩa vụ hoặc quyền đã trích ở trên.

1. **Hướng dẫn trình báo đúng luật (B2C, sau khi bị lừa hoặc khi B2E xác nhận).**
   - Căn cứ: BLTTHS Điều 146.3 [VB], sửa bởi Luật 99/2025 hiệu lực 01/7/2025. Theo đó **"Công an cấp xã, Đồn Công an có trách nhiệm tiếp nhận tố giác"**, lập biên bản và chuyển cho Cơ quan điều tra. Điều 145.1: cơ quan có trách nhiệm "không được từ chối tiếp nhận". Điều 144.4: tố giác "có thể bằng lời hoặc bằng văn bản". Điều 147.1: Cơ quan điều tra phải ra quyết định trong **20 ngày**, phức tạp thì tối đa 02 tháng, gia hạn thêm 02 tháng. Điều 145.4: người tố giác được thông báo kết quả.
   - Tính năng: thẻ "Bạn có thể trình báo ở Công an xã/phường nơi gần nhất. Họ không được từ chối tiếp nhận. Bạn có quyền được thông báo kết quả" kèm mốc 20 ngày. Thêm cảnh báo "lừa đảo lần hai" (kẻ giả công an hoặc luật sư hứa lấy lại tiền).
   - **Không** in số hotline A05/113/156 khi chưa xác minh từ nguồn chính thức [CXM]. Sau khi cấp huyện bỏ, không còn ghi "Công an cấp huyện".

2. **Gói bằng chứng cho Cơ quan điều tra.**
   - Căn cứ: BLTTHS Điều 147.3.a [VB] cho cơ quan giải quyết tố giác quyền thu thập tài liệu từ tổ chức, cá nhân. Luật 91 Điều 4.1.d và 15.2.a [VB] cho chủ thể quyền yêu cầu cung cấp dữ liệu của chính mình. Luật GDĐT 2023 công nhận thông điệp dữ liệu làm chứng cứ (Điều 11 theo mục lục [TC]).
   - Tính năng: người dùng tự xuất gói gồm Bằng chứng Phút 00, mã giao dịch, mốc thời gian và mã băm toàn vẹn. Người dùng có thể chọn đưa vào dữ liệu đầy đủ của *chính họ*. Gói **không** chứa dữ liệu khách hàng khác; dữ liệu đó chỉ cung cấp khi cơ quan có thẩm quyền yêu cầu (TT 40 Điều 19.1.n.i).

3. **Bàn giao báo cáo giao dịch đáng ngờ (B2E → Cục Phòng, chống rửa tiền).**
   - Căn cứ: Luật PCRT Điều 26, 37.2, 37.3, 40.2 [VB].
   - Tính năng: khi Vụ điều tra có Kết luận rủi ro cao, hệ thống soạn sẵn hồ sơ báo cáo giao dịch đáng ngờ kèm đồng hồ hạn chót: 01 ngày làm việc từ lúc phát hiện, 03 ngày làm việc từ lúc phát sinh, 24 giờ nếu có dấu hiệu tội phạm. Người có thẩm quyền ký gửi. Có cờ "cấm tiết lộ" chặn mọi nội dung CSKH hoặc B2C nhắc tới việc đã báo cáo. Biểu mẫu theo TT 09/2023 [CXM].

4. **Đồng bộ SIMO hằng tháng và kiểm tra trước khi chuyển tiền.**
   - Căn cứ: TT 40 Điều 28.1.d, 28.4.c, 30.2 và Phụ lục 01 (lý do 3, 4, 6, 8) [VB].
   - Tính năng: Chỉ báo đã Kích hoạt là ví MoMo được tự động đưa vào bản báo cáo Phụ lục 01 trước ngày 10 hằng tháng, kèm mã lý do. Ở bước chuyển tiền, tra cả SIMO lẫn Chỉ báo nội bộ.

5. **Trung tâm quyền dữ liệu (B2C).**
   - Căn cứ: Luật 91 Điều 4.1, 9.4, 10, 14 [VB]; thời hạn theo NĐ 356 [TC – EY]: rút đồng ý phản hồi trong 2 ngày làm việc và thực hiện trong 15 ngày; xem/cung cấp 10 ngày; xóa 20 ngày.
   - Tính năng: một màn hình liệt kê từng đồng ý (Lượt quét, Người giám hộ, Bảo vệ 24h) với thời điểm và nội dung. Mỗi mục có nút rút lại, xem hoặc xóa dữ liệu quét và yêu cầu bản sao. Hệ thống hiển thị trạng thái và hạn xử lý. Ghi chú rõ trường hợp không xóa được do Điều 19 hoặc nghĩa vụ lưu 05 năm của Luật PCRT Điều 38.

6. **Nhãn AI và nút "Nhờ người thật xem lại".**
   - Căn cứ: Luật 134 Điều 11.1 [VB] (người dùng phải nhận biết đang tương tác với AI), Điều 4.2 [VB] (con người can thiệp được), Điều 14.1.e và 14.2.đ [VB] (thông tin cho người bị ảnh hưởng ở mức mô tả chức năng). TT 53/2026: con người xem xét lại khi bị khiếu nại [TC].
   - Tính năng:
     - Mọi kết quả Lượt quét và lý do giữ tiền có nhãn "Đánh giá do AI".
     - Giải thích ngắn bằng ngôn ngữ thường.
     - Nút gửi yêu cầu người thật xem xét, có mã theo dõi.
     - Áp dụng cả cho người bị gắn Chỉ báo (Lớp 4).

7. **Tra soát và khiếu nại trong app, có tra cứu tiến độ.**
   - Căn cứ: TT 40 Điều 19.1.k, 37.1.g, 37.1.i.(iv) và 37.1.k [VB]: phải công khai quy trình tra soát, khiếu nại và mẫu đề nghị. Theo nguồn thứ cấp [TC], TT 15/2024 yêu cầu tối thiểu 2 kênh tiếp nhận và cho tra cứu tiến độ trực tuyến.
   - Tính năng: mỗi Giao dịch bị giữ hoặc bị hủy có nút "Tra soát/Khiếu nại" kèm dòng thời gian xử lý.

8. **Sổ tay ứng phó sự cố dữ liệu 72 giờ.**
   - Căn cứ: Luật 91 Điều 23.1 [VB] buộc thông báo cơ quan chuyên trách **chậm nhất 72 giờ**. Điều 27.1.d [VB] buộc thông báo cho chủ thể khi lộ thông tin tài khoản.
   - Tính năng: nếu kho Bằng chứng Phút 00 hoặc kho Chỉ báo bị lộ, quy trình tự tạo biên bản (Điều 23.2), đếm ngược 72 giờ và gửi thông báo cho người dùng bị ảnh hưởng.

---

## 4. Sai lệch trong tài liệu hiện tại

Đã grep `docs/*.md`, `README.md`, `data/vnPolicies.json` (và đối chiếu `GLOSSARY.md`). **Tài liệu này không sửa các file đó.**

| # | Vị trí | Nội dung hiện tại | Vấn đề | Đề xuất sửa |
|---|---|---|---|---|
| 1 | `README.md` L56, L67, L107, L136; `docs/HANDOVER.md` L15; `docs/ONE_PAGE_GUIDE.md` L20, L44; `docs/PRODUCT_IDEA.md` L35, L84, L105; `docs/SPEC_REQUIREMENTS.md` L54, L104; `docs/SPEC_DESIGN.md` L173; `docs/MEASURED_LATENCIES.md` L15; `vnPolicies.json` QD2345-01, QD2345-02; `GLOSSARY.md` mục "Chia nhỏ giao dịch" | Trích "QĐ 2345/QĐ-NHNN (hiệu lực 01/07/2024)" như văn bản hiện hành | **QĐ 2345 đã bị bãi bỏ toàn bộ bởi QĐ 2872/QĐ-NHNN ngày 30/12/2024, hiệu lực 01/01/2025** | Ngưỡng xác thực 10 triệu/lần, 20 triệu/ngày cho cá nhân: trích "TT 50/2024/TT-NHNN (sửa bởi TT 77/2025/TT-NHNN)" và ghi chưa xác minh phụ lục. Căn cứ phát hiện chia nhỏ giao dịch: "Luật PCRT 2022 Điều 29 khoản 2, 3, 9; TT 40/2024 Phụ lục 01 lý do 3, 8". GLOSSARY nên nói "ngưỡng xác thực sinh trắc học", không phải "ngưỡng giám sát" |
| 2 | `docs/PRODUCT_IDEA.md` L135 | "Cảnh báo mềm → ≥2 nguồn & Maker–Checker → TTL → Khiếu nại & Rollback *(Nguồn: TT 53/2026/TT-NHNN)*" | TT 53 không quy định Maker–Checker, TTL, ngưỡng ≥2 nguồn hay danh sách cộng đồng (theo mọi nguồn đã đọc) | Ghi "thiết kế quản trị của TrustLoop". Chỉ trích TT 53 cho "con người xem xét lại quyết định tự động bị khiếu nại" và ghi rõ chưa xác minh điều khoản |
| 3 | `vnPolicies.json` TT53-01; `docs/SPEC_REQUIREMENTS.md` L108; `docs/ONE_PAGE_GUIDE.md` L48 | TT 53 "đòi hỏi… kiểm toán bất biến", "giải trình hai chiều" | Nguồn chỉ nói "ghi nhật ký" (log) và giám sát của con người. "Bất biến" và "tranh biện hai chiều" là lựa chọn của sản phẩm | Sửa thành "TT 53/2026 yêu cầu ghi nhật ký, giám sát và can thiệp của con người [nguồn báo chí, chưa xác minh điều khoản]" |
| 4 | `vnPolicies.json` TT53-02; `docs/SPEC_DESIGN.md` L155; `docs/SPEC_REQUIREMENTS.md` L15, L69; `docs/ONE_PAGE_GUIDE.md` L35; `docs/HANDOVER.md` L19 | "Khiếu nại (TT 53/2026)" gộp với Maker–Checker | Nội dung "con người xem xét lại, là căn cứ cuối cùng" có nguồn (CafeF), nhưng **chưa có số điều**. Việc gộp với Maker–Checker là thiết kế, không phải yêu cầu luật | Giữ ý, bỏ phần Maker–Checker khỏi câu trích luật. Bổ sung căn cứ đã xác minh: Luật 91 Điều 19.2.d (cơ chế tiếp nhận phản ánh) và Điều 4.1.đ (quyền khiếu nại) |
| 5 | `docs/RESEARCH_PROBLEM.md` mục 5 (dòng TT 53) | Nguồn `https://sbv.gov.vn/en/w/thong-tu-so-53` | Trang này là **TT 53/2025/TT-NHNN về mạng lưới hoạt động của TCTD là hợp tác xã**, không phải TT 53/2026 | Thay bằng CafeF 16/11/2026, LuatVietnam (TT 53/2026, Điều 5.1.g.(ii): AI tự động thanh toán tối đa 100 triệu/ngày với cá nhân), VNBA |
| 6 | `docs/RESEARCH_PROBLEM.md` mục 5 và "Không xác minh được" | "QĐ 2345… chưa xác minh còn hiệu lực", và "ngưỡng QĐ 2345 được TT 53/2026 dùng lại" | Nay đã xác minh: **hết hiệu lực từ 01/01/2025** | Cập nhật. Ngưỡng 10/20 triệu trong TT 53 Điều 4 [TC] là tiêu chí xếp AI tự động thanh toán vào nhóm rủi ro cao, không liên quan QĐ 2345 |
| 7 | `docs/ONE_PAGE_GUIDE.md` L13; `docs/PRODUCT_IDEA.md` L77; `vnPolicies.json` LAW91-01 | "Bảo vệ 24h mặc định TẮT theo Luật BVDLCN 91/2025" | Luật 91 điều chỉnh *đồng ý xử lý dữ liệu*, không điều chỉnh việc ví giữ giao dịch. Căn cứ cho việc giữ là thỏa thuận ví và quy định nội bộ (TT 40 Điều 19.1.l, 28.1.c.iii) | Bảo vệ 24h: trích TT 40/2024 Điều 19.1.l, 28.1.c.(iii). Quy tắc "đồng ý từng mục đích, im lặng không phải đồng ý": trích Luật 91 Điều 9.4 cho Lượt quét và Người giám hộ. "Không tích sẵn mặc định" là quy định của NĐ 356 [TC] |
| 8 | `vnPolicies.json` LAW91-02; `docs/PRODUCT_IDEA.md` L50 | "Ẩn CCCD, SĐT, số dư theo Luật 91" | Luật 91 không liệt kê trường cụ thể. Danh mục nhạy cảm do NĐ 356 ban hành: ảnh CCCD, tài khoản ngân hàng, lịch sử giao dịch [TC]. SĐT nhiều khả năng là dữ liệu cơ bản | Trích "Luật 91 Điều 3.2, 30.1 (giới hạn mục đích, phạm vi cần thiết); NĐ 356 (danh mục dữ liệu nhạy cảm)". Ẩn SĐT là tối thiểu hóa dữ liệu, không phải vì SĐT thuộc nhóm nhạy cảm |
| 9 | `vnPolicies.json` LAW134-02 | "Tuân thủ nguyên tắc minh bạch của Luật 134… thông báo trung tính, không mạo danh" | Điều 11 Luật 134 là nghĩa vụ cho biết đang tương tác với AI và gắn nhãn nội dung AI, **không** quy định câu thông báo giữ tiền | Luật 134 Điều 11.1 là căn cứ để *gắn nhãn "Đánh giá do AI"* cho kết quả Lượt quét. Câu thông báo trung tính là yêu cầu sản phẩm (FR-03.1), có thể dựa thêm Luật PCRT Điều 40.2 (không tiết lộ việc đã gửi báo cáo giao dịch đáng ngờ) |
| 10 | `vnPolicies.json` LAW134-01; `docs/SPEC_REQUIREMENTS.md` L106 | "Điều 4 – lấy con người làm trung tâm, không thay thế thẩm quyền con người" | **Đúng** (Điều 4 khoản 1–2 [VB]). Có thể trích chính xác hơn | Ghi "Điều 4 khoản 2". Thêm Điều 7 khoản 4 (cấm vô hiệu hóa cơ chế giám sát của con người) |
| 11 | `vnPolicies.json` TT77-01; `docs/SPEC_REQUIREMENTS.md` L107; `docs/ONE_PAGE_GUIDE.md` L47 | TT 77 yêu cầu phòng "dụ cài .apk… lạm dụng Accessibility Services" | Theo thông cáo NHNN, TT 77 yêu cầu app **tự dừng khi phát hiện root/jailbreak, debugger, giả lập**, PAD theo ISO 30107 Level 2, OWASP. Không nhắc Accessibility hay việc quét tin nhắn | Ghi "TT 77/2025 yêu cầu app tự bảo vệ trước can thiệp thiết bị". Phát hiện link APK trong ảnh chat là *mở rộng của sản phẩm*, không phải nghĩa vụ của TT 77 |
| 12 | `vnPolicies.json` SIMO-01 | "gần 100 TCTD… hơn 668.000 tài khoản nghi vấn" | Không có nguồn. `RESEARCH_PROBLEM.md` ghi 147 đơn vị kết nối (09/2026) và ~596.000 bản ghi năm 2025 | Thay bằng số có nguồn. Thêm căn cứ TT 40 Điều 28.1.d, 30.2 (ví phải đối chiếu và gửi dữ liệu SIMO) |
| 13 | `README.md` L67 vs `docs/SPEC_REQUIREMENTS.md` L54 | "12 chunk" vs "~14 điều khoản" | `vnPolicies.json` hiện có 12 chunk | Thống nhất 12 |
| 14 | `vnPolicies.json` MOMO-INS-01/02; `docs/PRODUCT_IDEA.md` L86 | "Bảo hiểm An toàn chuyển tiền ≤ 2 triệu" | Không phải văn bản pháp luật; không có nguồn trong repo | Đánh dấu "điều khoản sản phẩm, chưa xác minh" hoặc thêm URL chính thức của MoMo |
| 15 | `GLOSSARY.md` "Xác nhận lừa đảo" | Kết luận "là lừa đảo thật" | MoMo không có thẩm quyền kết luận tội phạm (BLHS Điều 174/290 do cơ quan tố tụng áp dụng) | **Đã sửa 2026-11-23:** đổi thành "Kết luận rủi ro cao". Định nghĩa thành "kết luận nội bộ: rủi ro lừa đảo đã được kiểm chứng". Nội dung gửi người dùng tránh khẳng định tội danh |
| 16 | `docs/RESEARCH_PROBLEM.md` "Không xác minh được" | "NĐ 330/2026/NĐ-CP… chưa xác minh" | Nay có nguồn thứ cấp (EY) nói NĐ 330/2026 ngày 19/8/2026 về xử phạt bảo vệ dữ liệu cá nhân | Cập nhật thành [TC]. Mức trần thật nằm ở Luật 91 Điều 8.3–8.5 [VB]: 3 tỷ đồng; 5% doanh thu với vi phạm chuyển dữ liệu xuyên biên giới; 10 lần khoản thu với mua bán dữ liệu |

---

## 5. Chưa xác minh được (cần pháp chế bổ sung)

- **TT 53/2026/TT-NHNN:** chưa có toàn văn. Chưa có số điều cho quy định "con người xem xét lại khiếu nại" và "ghi nhật ký". Chưa biết TT 53 có quy định thông báo cho khách về việc dùng AI hay ngoại lệ cho phòng chống gian lận không.
- **TT 50/2024/TT-NHNN:** chưa có số phụ lục hoặc điều chứa ngưỡng 10/20 triệu cho cá nhân sau khi TT 77 sửa.
- **NĐ 356/2025:** chưa có số điều cho danh mục dữ liệu nhạy cảm, thời hạn thực hiện quyền và cơ chế tiền kiểm hồ sơ chuyển dữ liệu xuyên biên giới (nguồn chỉ có EY).
- **Danh mục hệ thống AI rủi ro cao** (Luật 134 Điều 13.4): chưa xác minh quyết định của Thủ tướng (báo chí nhắc QĐ 33/2026/QĐ-TTg).
- **Luật An ninh mạng 2025:** chưa có số khoản của Điều 7; chưa rõ nghĩa vụ lưu trữ dữ liệu tại VN áp dụng cho việc gọi LLM nước ngoài.
- **BLHS Điều 174/290 sau Luật 86/2025:** chưa đối chiếu bản hợp nhất.
- **Bộ luật Dân sự** (danh dự, uy tín, bí mật đời tư) và **BLHS tội vu khống:** chưa mở văn bản, không trích số điều.
- **Hotline trình báo** (113, đường dây A05, "156"): chưa thấy nguồn chính thức nên không đưa vào sản phẩm.
- **Quy trình người dân khiếu nại để gỡ khỏi SIMO:** không tìm thấy quy định công khai.
- **NĐ 19/2023 và TT 09/2023** (mẫu báo cáo giao dịch đáng ngờ, chi tiết trì hoãn giao dịch): chưa mở toàn văn.
