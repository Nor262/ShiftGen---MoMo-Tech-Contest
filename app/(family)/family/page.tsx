import Link from "next/link";
import { DEMO_SIMULATION_LABEL } from "@/contracts";

// shortcut: Wave 0 route skeleton; Wave 1 b2c-ui replaces with minimal PII-redacted Family Co-Sign UI
export default function FamilyPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">
          Family Co-Sign (1 Màn hình ẩn PII) — {DEMO_SIMULATION_LABEL}
        </h1>
        <Link href="/" className="text-sm font-semibold text-momo-600 hover:underline">
          ← Về trang tổng quan
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Không gian Family Guardian dành cho Wave 1 (<code>b2c-ui</code>): chỉ hiển thị giao dịch rủi
        ro cao đã ẩn CCCD/SĐT/số dư với 3 thao tác duyệt nhanh.
      </p>
    </section>
  );
}
