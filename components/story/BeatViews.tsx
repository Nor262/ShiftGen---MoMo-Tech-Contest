"use client";

import Image from "next/image";
import {
  NEUTRAL_HOLD_MESSAGE,
  type FamilyEscalateResponse,
  type ShieldScanResponse,
  type TransferResponse,
} from "@/contracts";
import { DEMO_PRESETS, RISK_LEVEL_META, SCAM_CATEGORY_VI } from "@/components/b2c/labels";
import { CAST, modelDisplayName } from "@/lib/cast";
import { isReplayNotice } from "@/lib/replay-label";
import { STORY_AMOUNT_VND, STORY_RECIPIENT_ACCOUNT } from "@/lib/story/actions";
import { STORY_BEATS, type StoryState } from "@/lib/story/machine";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const seconds = (ms: number) => `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây`;
const maskedAccount = `•••• ${STORY_RECIPIENT_ACCOUNT.slice(-4)}`;
const CASE01_IMAGE = DEMO_PRESETS.find((p) => p.code === "CASE-01")!.imagePath;

interface ViewProps {
  state: StoryState;
}

/** Left: what the person in the story sees on their phone. */
export function PhoneFrame({ state }: ViewProps) {
  const beat = state.shown;
  const done = state.done.includes(beat);
  const owner = STORY_BEATS.find((b) => b.id === beat)!.actor;
  const scan = state.results["1.2"] as ShieldScanResponse | undefined;

  let screen: React.ReactNode;
  switch (beat) {
    case "1.1":
      screen = (
        <div className="space-y-3">
          <p className="font-semibold text-slate-900">Bảo vệ 24h</p>
          <p>Giao dịch rủi ro cao sẽ được tạm giữ tối đa 24 giờ và báo cho người thân.</p>
          <p className={done ? "font-semibold text-emerald-800" : "text-slate-600"}>
            {done ? `Đã bật · Người giám hộ: ${CAST.FAMILY_MINH.name}` : "Chưa bật"}
          </p>
        </div>
      );
      break;
    case "1.2":
      screen = (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Tin nhắn Zalo vừa nhận</p>
          <Image
            src={CASE01_IMAGE}
            alt="Ảnh chụp tin nhắn Zalo tự xưng công an, dọa bắt giam (mẫu mô phỏng)"
            width={300}
            height={420}
            className="max-h-56 w-full rounded-lg border border-slate-200 object-cover object-top"
          />
          {scan && (
            <p className="font-semibold text-signal-800">
              Cảnh báo: rủi ro {RISK_LEVEL_META[scan.result.risk_level].labelVi.toLowerCase()}
            </p>
          )}
        </div>
      );
      break;
    case "2.1":
      screen = done ? (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Chuyển {vnd(STORY_AMOUNT_VND)}</p>
          <p className="rounded-lg border-l-4 border-signal-700 bg-signal-50 p-3 text-slate-900">{NEUTRAL_HOLD_MESSAGE}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Chuyển tiền</p>
          <p>Tới: {maskedAccount}</p>
          <p className="text-2xl font-semibold text-slate-900">{vnd(STORY_AMOUNT_VND)}</p>
        </div>
      );
      break;
    case "2.2":
      screen = (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Thẻ báo cho người giám hộ</p>
          <p>
            Giao dịch {vnd(STORY_AMOUNT_VND)} của {CAST.USER_B2C_HUNG.name} tới {maskedAccount} đang được tạm giữ.
          </p>
          <p className="text-slate-600">Thông tin cá nhân đã được ẩn.</p>
          {done && <p className="font-semibold text-emerald-800">Đã chuyển cấp cho đội Risk</p>}
        </div>
      );
      break;
    default:
      screen = <p>{STORY_BEATS.find((b) => b.id === beat)!.narration}</p>;
  }

  return (
    <figure className="w-full max-w-[340px] shrink-0 rounded-[28px] border-4 border-momo-primary bg-white p-4 shadow-sm">
      <figcaption className="mb-3 text-center text-sm font-semibold text-slate-600">
        Điện thoại của {CAST[owner].name}
      </figcaption>
      <div className="min-h-[280px] text-lg leading-relaxed text-slate-700">{screen}</div>
    </figure>
  );
}

/** Right: what TrustLoop did in response — one headline, at most 3 details, the rest behind "Xem thêm". */
export function Backstage({ state }: ViewProps) {
  const beat = state.shown;
  const result = state.results[beat];
  let headline = "Bấm nút bên dưới để xem hệ thống phản ứng.";
  let held = false;
  let details: string[] = [];
  let more: string[] = [];
  let meta: string | null = null;
  let replay: string | null = null;

  if (result) {
    switch (beat) {
      case "1.1":
        headline = "Đã bật Bảo vệ 24h";
        details = [`Người giám hộ: ${CAST.FAMILY_MINH.name}`, "Đồng ý được ghi vào nhật ký, Bác có thể tắt bất kỳ lúc nào."];
        break;
      case "1.2": {
        const r = result as ShieldScanResponse;
        headline = `Rủi ro ${RISK_LEVEL_META[r.result.risk_level].labelVi.toLowerCase()} · ${r.result.risk_score}/100 · ${SCAM_CATEGORY_VI[r.result.scam_category]}`;
        details = r.result.psych_manipulation_cues.slice(0, 3).map((c) => c.explanation_vi);
        more = [...r.result.visual_tampering_flags, ...r.result.psych_manipulation_cues.slice(3).map((c) => c.explanation_vi)];
        meta = `${modelDisplayName(r.modelUsed)} · ${seconds(r.measuredLatencyMs)}`;
        replay = r.fallbackNoticeVi && isReplayNotice(r.fallbackNoticeVi) ? r.fallbackNoticeVi : null;
        break;
      }
      case "2.1": {
        const r = result as TransferResponse;
        held = true;
        headline = "Tiền đang tạm giữ — chưa rời ví";
        details = [
          r.holdExpiresAt
            ? `Giữ đến ${new Date(r.holdExpiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
            : "Đang tạm giữ",
          `${CAST.FAMILY_MINH.name} đã được báo, chỉ thấy thông tin đã ẩn.`,
        ];
        break;
      }
      case "2.2": {
        const r = result as FamilyEscalateResponse;
        headline = "Đã chuyển cấp cho đội Risk";
        details = [`Vụ việc "${r.caseRecord.title}" vào hàng đợi điều tra.`, "Tiền vẫn đang tạm giữ trong lúc đội Risk xem xét."];
        break;
      }
      default:
        headline = "Đã xong bước này.";
    }
  }

  return (
    <section aria-labelledby="backstage-title" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 id="backstage-title" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Phía sau màn hình
      </h3>
      <div aria-live="polite" className="mt-3 space-y-3">
        <p
          className={
            held
              ? "rounded-lg bg-signal-700 px-4 py-3 text-xl font-semibold text-white"
              : "text-xl font-semibold text-momo-primary"
          }
        >
          {headline}
        </p>
        {details.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-base text-slate-700">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        {more.length > 0 && (
          <details className="text-base text-slate-700">
            <summary className="cursor-pointer font-medium text-shift-blue">Xem thêm</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {more.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </details>
        )}
        {meta && <p className="font-mono text-sm text-emerald-800">{meta}</p>}
        {replay && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{replay}</p>}
      </div>
    </section>
  );
}
