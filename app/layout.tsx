import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { DEMO_SIMULATION_LABEL } from "@/contracts";

export const metadata: Metadata = {
  title: "MoMo TrustLoop v2 — Closed-Loop Anti-Scam & Multi-Agent Workspace",
  description:
    "Hệ sinh thái phòng vệ niềm tin số khép kín: B2C Phút 00, Family Co-Sign, B2E FinCrime War-Room 4 Agent và Miễn dịch Cộng đồng 4 Lớp.",
};

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan" },
  { href: "/shield", label: "B2C Phút 00" },
  { href: "/family", label: "Family Co-Sign" },
  { href: "/warroom", label: "B2E War-Room" },
  { href: "/checker", label: "Checker & Miễn dịch" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen font-sans">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-bold text-momo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-momo-600 text-sm font-extrabold text-white">
                  TL
                </span>
                <span>MoMo TrustLoop v2</span>
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
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-momo-50 hover:text-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
