import { describe, expect, it } from "vitest";
import { needsFreshSession } from "@/lib/demo-session";

/** Seam: when /story must mint a new session (spec: "Tải lại trang thì bắt đầu lại với phiên mới"). */
describe("needsFreshSession", () => {
  it("mints one when the URL has none", () => {
    expect(needsFreshSession(null, "navigate")).toBe(true);
  });
  it("mints one on a reload, even if the URL already has a session", () => {
    expect(needsFreshSession("demo-abc", "reload")).toBe(true);
  });
  it("keeps the session the home CTA or 'Chạy lại từ đầu' just created", () => {
    expect(needsFreshSession("demo-abc", "navigate")).toBe(false);
    expect(needsFreshSession("demo-abc", undefined)).toBe(false);
  });
});
