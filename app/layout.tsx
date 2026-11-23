import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { DemoStepBar } from "@/components/DemoStepBar";
import { TechModeToggle } from "@/components/TechModeToggle";
import { DEMO_SIMULATION_LABEL } from "@/contracts";

// DESIGN.md: Be Vietnam Pro (native Vietnamese diacritics) + JetBrains Mono.
const fontSans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const fontMono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "MoMo TrustLoop — Chặn lừa đảo từ Phút 00",
  description:
    "Hệ sinh thái phòng vệ niềm tin số khép kín: B2C Phút 00, Người giám hộ, B2E FinCrime War-Room 4 Agent và Miễn dịch Cộng đồng 4 Lớp.",
};

// The story is the demo; the 4 full screens stay reachable in Technical Mode.
const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", techOnly: false },
  { href: "/story", label: "Xem câu chuyện", techOnly: false },
  { href: "/shield", label: "① Người dùng", techOnly: true },
  { href: "/family", label: "② Người giám hộ", techOnly: true },
  { href: "/warroom", label: "③ Đội Risk điều tra", techOnly: true },
  { href: "/checker", label: "④ Duyệt & bảo vệ", techOnly: true },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-lg text-lg font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
              >
                <Image src="/shiftgen-mark.png" alt="" width={40} height={28} priority />
                <span>
                  TrustLoop
                  <span className="ml-1.5 align-middle text-xs font-medium text-slate-500">by ShiftGen</span>
                </span>
              </Link>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {DEMO_SIMULATION_LABEL}
              </span>
            </div>

            <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${item.techOnly ? "tech-only " : ""}rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-momo-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <DemoStepBar />

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-8 text-sm text-slate-600">
          <span>
            TrustLoop by ShiftGen · Dữ liệu demo là {DEMO_SIMULATION_LABEL}
          </span>
          <TechModeToggle />
        </footer>
      </body>
    </html>
  );
}
