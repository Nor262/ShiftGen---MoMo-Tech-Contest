"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "trustloop.techMode";

/** "Chế độ kỹ thuật" (DESIGN.md): reveals session IDs, persona codes and enum statuses (.tech-only). */
export function TechModeToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      setOn(window.localStorage.getItem(STORAGE_KEY) === "on");
    } catch {
      // storage unavailable (private mode / blocked): stay off
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.tech = on ? "on" : "off";
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      // per-viewer convenience only
    }
  }, [on]);

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
      className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue"
    >
      Chế độ kỹ thuật: {on ? "Bật" : "Tắt"}
    </button>
  );
}
