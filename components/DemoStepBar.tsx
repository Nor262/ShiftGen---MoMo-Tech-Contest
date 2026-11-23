"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Guided demo (DESIGN.md "Step Bar"): the closed loop ① → ② → ③ → ④ → back to ①. */
export const DEMO_STEPS = [
  {
    href: "/shield",
    title: "Bác Hùng quét ảnh",
    hint: "Chọn ảnh mẫu CASE-01 rồi bấm Quét. Sau đó bật Bảo vệ 24h và thử chuyển tiền để thấy giao dịch bị tạm giữ.",
  },
  {
    href: "/family",
    title: "Người giám hộ",
    hint: "Chị Minh chỉ thấy thẻ đã ẩn thông tin cá nhân. Bấm Chuyển cấp để đưa giao dịch sang đội Risk.",
  },
  {
    href: "/warroom",
    title: "Đội Risk điều tra",
    hint: "Chọn vụ của Bác Hùng, chạy 4 agent, rồi đề xuất chỉ báo cho tài khoản nhận tiền.",
  },
  {
    href: "/checker",
    title: "Duyệt & bảo vệ người kế tiếp",
    hint: "Anh Tuấn duyệt Kích hoạt chỉ báo. Bấm Tiếp để quay lại bước ① với một người dùng mới và thấy cảnh báo.",
  },
] as const;

export function DemoStepBar() {
  const pathname = usePathname();
  const index = DEMO_STEPS.findIndex((s) => pathname.startsWith(s.href));
  if (index === -1) return null;

  const step = DEMO_STEPS[index];
  const isLast = index === DEMO_STEPS.length - 1;
  const nextHref = isLast ? "/shield?persona=new" : DEMO_STEPS[index + 1].href;

  return (
    <nav aria-label="Các bước demo" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ol className="hidden items-center gap-2 text-sm md:flex">
            {DEMO_STEPS.map((s, i) => (
              <li key={s.href} className="flex items-center gap-2">
                <Link
                  href={s.href}
                  aria-current={i === index ? "step" : undefined}
                  className={`inline-flex min-h-[48px] items-center gap-2 rounded-lg px-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue ${
                    i === index ? "text-slate-900" : i < index ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      i === index ? "bg-shift-blue text-white" : i < index ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i < index ? "✓" : i + 1}
                  </span>
                  {s.title}
                </Link>
                {i < DEMO_STEPS.length - 1 && <span aria-hidden="true" className="text-slate-300">→</span>}
              </li>
            ))}
            <li aria-hidden="true" className="text-slate-400" title="Vòng lặp quay lại bước ①">↺</li>
          </ol>
          <p className="text-sm font-semibold text-slate-900 md:hidden">
            Bước {index + 1}/{DEMO_STEPS.length} · {step.title}
          </p>
          <Link
            href={nextHref}
            className="inline-flex min-h-[48px] items-center rounded-lg bg-momo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue"
          >
            {isLast ? "Tiếp: quay lại ① với người dùng mới →" : `Tiếp: ${DEMO_STEPS[index + 1].title} →`}
          </Link>
        </div>
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Bạn hãy: </span>
          {step.hint}
        </p>
      </div>
    </nav>
  );
}
