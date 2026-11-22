import Link from "next/link";
import { DEMO_SIMULATION_LABEL, NEUTRAL_HOLD_MESSAGE } from "@/contracts";

// shortcut: Wave 0 route skeleton; Wave 1 b2c-ui replaces with full Minute-00 Scanner & Opt-in Hold UI
export default function ShieldPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">
          Lá chắn Phút 00 (B2C) — {DEMO_SIMULATION_LABEL}
        </h1>
        <Link href="/" className="text-sm font-semibold text-momo-600 hover:underline">
          ← Về trang tổng quan
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Không gian B2C dành cho Wave 1 (<code>b2c-ui</code>): quét ảnh chat/link <code>.apk</code>,
        hiển thị đối chiếu ẩn PII, bật Opt-in Bảo vệ 24h (mặc định TẮT) và hủy giao dịch tạm giữ.
      </p>
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        Thông điệp tạm giữ chuẩn: <strong>{NEUTRAL_HOLD_MESSAGE}</strong>
      </p>
    </section>
  );
}
