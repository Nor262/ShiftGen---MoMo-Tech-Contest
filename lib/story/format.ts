/** Number/time formatting shared by the story views. */
export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export const duration = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây`;

export const vnTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
