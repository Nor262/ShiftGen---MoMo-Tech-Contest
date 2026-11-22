import Link from "next/link";
import { DEMO_SIMULATION_LABEL } from "@/contracts";

// shortcut: Wave 0 route skeleton; Wave 2 warroom-ui replaces with 4-Agent War-Room & React Flow graph
export default function WarRoomPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">
          B2E FinCrime War-Room (4 Agent) — {DEMO_SIMULATION_LABEL}
        </h1>
        <Link href="/" className="text-sm font-semibold text-momo-300 hover:underline">
          ← Về trang tổng quan
        </Link>
      </div>
      <p className="text-sm text-slate-300">
        Không gian Risk Maker dành cho Wave 2 (<code>warroom-ui</code>): điều phối 4 Agent song
        song, đồ thị dòng tiền tương tác và Thẻ Bàn giao CSKH Thấu cảm.
      </p>
    </section>
  );
}
