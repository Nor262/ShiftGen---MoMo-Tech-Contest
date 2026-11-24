/** #6: what a guardian sees and may do — shown on the invitation before they accept (client-safe). */
export const GUARDIAN_SCOPE = {
  sees: [
    "Thẻ báo giao dịch đang tạm giữ, đã ẩn thông tin cá nhân",
    "Số tiền và số tài khoản nhận (chỉ 4 số cuối)",
    "Mức rủi ro và tóm tắt dấu hiệu lừa đảo",
  ],
  neverSees: ["Số dư ví", "Số CCCD, số điện thoại", "Lịch sử chi tiêu hằng ngày", "Ảnh chụp gốc"],
  canDo: "Chỉ được Chuyển cấp cho đội Risk, không được Giải phóng giao dịch.",
  revocable: "Chủ ví thu hồi quyền này bất kỳ lúc nào; sau đó bạn không thấy thẻ nào nữa.",
} as const;
