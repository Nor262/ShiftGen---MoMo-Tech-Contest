import Link from "next/link";
import { DEMO_SIMULATION_LABEL } from "@/contracts";

// shortcut: Wave 0 route skeleton; Wave 3 immunity replaces with Maker-Checker, Appeals & Rollback UI
export default function CheckerPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">
          Checker & Quản trị Miễn dịch 4 Lớp — {DEMO_SIMULATION_LABEL}
        </h1>
        <Link href="/" className="text-sm font-semibold text-momo-600 hover:underline">
          ← Về trang tổng quan
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Không gian Risk Checker dành cho Wave 3 (<code>immunity</code>): phê duyệt 2 cấp
        Maker–Checker (≥2 nguồn độc lập), giả lập hết hạn TTL, rà soát khiếu nại người thật (TT
        53/2026) và Rollback tức thì.
      </p>
    </section>
  );
}
