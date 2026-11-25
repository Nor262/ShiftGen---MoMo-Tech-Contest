"use client";

import Image from "next/image";
import {
  NEUTRAL_HOLD_MESSAGE,
  type ApproveImmunityResponse,
  type CaseDecisionResponse,
  type FamilyEscalateResponse,
  type InvestigateCaseResponse,
  type ShieldScanResponse,
  type TransferResponse,
} from "@/contracts";
import { DEMO_PRESETS, RISK_LEVEL_META, SCAM_CATEGORY_VI } from "@/components/b2c/labels";
import { AiResultNotice } from "@/components/b2c/AiResultNotice";
import { CAST, modelDisplayName } from "@/lib/cast";
import { GUARDIAN_SCOPE } from "@/lib/guardian-scope";
import { isReplayModel, isReplayNotice } from "@/lib/replay-label";
import { STORY_AMOUNT_VND, STORY_RECIPIENT_ACCOUNT } from "@/lib/story/actions";
import { beatById, type StoryState } from "@/lib/story/machine";

import { duration as seconds, vnd, vnTime } from "@/lib/story/format";
const maskedAccount = `•••• ${STORY_RECIPIENT_ACCOUNT.slice(-4)}`;
const CASE01_IMAGE = DEMO_PRESETS.find((p) => p.code === "CASE-01")!.imagePath;

/** DESIGN.md Hold Banner: the page's single Signal Orange surface. */
function HoldBanner({ holdExpiresAt }: { holdExpiresAt: string | null }) {
  return (
    <div className="rounded-lg border-l-4 border-signal-500 bg-signal-50 p-3 text-slate-900">
      <p>{NEUTRAL_HOLD_MESSAGE}</p>
      {holdExpiresAt && <p className="mt-1 font-semibold">Giữ đến {vnTime(holdExpiresAt)}</p>}
    </div>
  );
}

interface ViewProps {
  state: StoryState;
}

/** Left: what the person in the story sees on their phone. */
export function PhoneFrame({ state }: ViewProps) {
  const beat = state.shown;
  const done = state.done.includes(beat);
  const owner = beatById(beat).phoneOwner;
  const approval = state.results["4.1"] as { txStatus?: string } | undefined;
  const tx = state.results["2.1"] as TransferResponse | undefined;
  const scan = state.results["1.4"] as ShieldScanResponse | undefined;

  let screen: React.ReactNode;
  switch (beat) {
    case "1.1":
      screen = (
        <div className="space-y-3">
          <p className="font-semibold text-slate-900">Bảo vệ 24h</p>
          <p>Giao dịch rủi ro cao được tạm giữ tối đa 24 giờ và báo cho người thân.</p>
          <p className={done ? "font-semibold text-emerald-800" : "text-slate-600"}>
            {done ? `Đã bật · Người giám hộ: ${CAST.FAMILY_MINH.name}` : "Chưa bật"}
          </p>
        </div>
      );
      break;
    case "1.2":
      screen = (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Lời mời làm người giám hộ</p>
          <p>Chị sẽ thấy:</p>
          <ul className="list-disc pl-5">
            {GUARDIAN_SCOPE.sees.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p>Không bao giờ thấy: {GUARDIAN_SCOPE.neverSees.join(", ").toLowerCase()}.</p>
          <p className={done ? "font-semibold text-emerald-800" : "text-slate-600"}>
            {done ? "Đã xác nhận" : GUARDIAN_SCOPE.canDo}
          </p>
        </div>
      );
      break;
    case "1.3":
      screen = (
        <div className="space-y-3">
          <p className="font-semibold text-slate-900">Cho AI phân tích khi quét</p>
          <p>
            Ảnh tin nhắn được gửi tới AI để tìm dấu hiệu lừa đảo, rồi xóa sau phiên. Không liên quan tới Bảo vệ 24h.
          </p>
          <p className={done ? "font-semibold text-emerald-800" : "text-slate-600"}>
            {done ? "Đã đồng ý · rút lại được bất kỳ lúc nào" : "Chưa đồng ý"}
          </p>
        </div>
      );
      break;
    case "1.4":
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
            <p className="font-semibold text-momo-primary">
              Cảnh báo: rủi ro {RISK_LEVEL_META[scan.result.risk_level].labelVi.toLowerCase()}
            </p>
          )}
        </div>
      );
      break;
    case "2.1": {
      screen = done ? (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Chuyển {vnd(STORY_AMOUNT_VND)}</p>
          <HoldBanner holdExpiresAt={tx?.holdExpiresAt ?? null} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Chuyển tiền</p>
          <p>Tới: {maskedAccount}</p>
          <p className="text-2xl font-semibold text-slate-900">{vnd(STORY_AMOUNT_VND)}</p>
        </div>
      );
      break;
    }
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
    case "3.1":
    case "3.2":
    case "4.1": {
      const cancelled = approval?.txStatus === "CANCELLED_BY_B2E";
      screen = cancelled ? (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Giao dịch {vnd(STORY_AMOUNT_VND)}</p>
          <p className="font-semibold text-emerald-800">Đội Risk đã hủy giao dịch. Tiền vẫn ở trong ví của Bác.</p>
          <p>Bác không cần làm gì thêm.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Chuyển {vnd(STORY_AMOUNT_VND)}</p>
          <HoldBanner holdExpiresAt={tx?.holdExpiresAt ?? null} />
        </div>
      );
      break;
    }
    case "4.2": {
      const probe = state.results["4.2"] as ShieldScanResponse | undefined;
      screen = (
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Tra cứu trước khi chuyển</p>
          <p>Tài khoản nhận: {maskedAccount}</p>
          {probe?.immunityHit && (
            <p className="font-semibold text-momo-primary">
              Tài khoản này đã bị đội Risk kết luận rủi ro cao. Đừng chuyển tiền.
            </p>
          )}
        </div>
      );
      break;
    }
  }

  return (
    <figure className="w-full max-w-[340px] shrink-0 rounded-[28px] border-4 border-momo-primary bg-white p-4 shadow-sm">
      <figcaption className="mb-3 text-center text-base font-semibold text-slate-600">
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
  let details: string[] = [];
  let more: string[] = [];
  let meta: string | null = null;
  let replay: string | null = null;
  let scanForNotice: ShieldScanResponse | null = null;

  if (result) {
    switch (beat) {
      case "1.1":
        headline = "Đã bật Bảo vệ 24h";
        details = [`Người giám hộ: ${CAST.FAMILY_MINH.name}`, "Đồng ý được ghi nhật ký; Bác tắt được bất kỳ lúc nào."];
        break;
      case "1.2":
        headline = `${CAST.FAMILY_MINH.name} đã tự xác nhận làm người giám hộ`;
        details = [
          "Trước khi xác nhận, chị không thấy thẻ nào.",
          GUARDIAN_SCOPE.canDo,
          GUARDIAN_SCOPE.revocable,
        ];
        break;
      case "1.3":
        headline = "Đã ghi nhận đồng ý cho AI phân tích khi quét";
        details = ["Một mục đồng ý riêng, ghi nhật ký riêng.", "Chưa đồng ý thì hệ thống không quét."];
        break;
      case "1.4": {
        const r = result as ShieldScanResponse;
        headline = `Rủi ro ${RISK_LEVEL_META[r.result.risk_level].labelVi.toLowerCase()} · ${r.result.risk_score}/100 · ${SCAM_CATEGORY_VI[r.result.scam_category]}`;
        details = r.result.psych_manipulation_cues.slice(0, 3).map((c) => c.explanation_vi);
        more = [
          ...r.result.visual_tampering_flags,
          ...r.result.psych_manipulation_cues.slice(3).map((c) => c.explanation_vi),
        ];
        meta = `${modelDisplayName(r.modelUsed)} · ${seconds(r.measuredLatencyMs)}`;
        replay = r.fallbackNoticeVi && isReplayNotice(r.fallbackNoticeVi) ? r.fallbackNoticeVi : null;
        scanForNotice = r;
        break;
      }
      case "2.1": {
        const r = result as TransferResponse;
        headline = "Tiền đang tạm giữ — chưa rời ví";
        details = [
          r.holdExpiresAt ? `Giữ đến ${vnTime(r.holdExpiresAt)}` : "Đang tạm giữ",
          `${CAST.FAMILY_MINH.name} đã được báo, chỉ thấy thông tin đã ẩn.`,
        ];
        break;
      }
      case "2.2": {
        const r = result as FamilyEscalateResponse;
        headline = "Đã chuyển cấp cho đội Risk";
        details = [
          `Vụ việc "${r.caseRecord.title}" vào hàng đợi điều tra.`,
          "Tiền vẫn đang tạm giữ trong lúc đội Risk xem xét.",
        ];
        break;
      }
      case "3.1": {
        const r = result as InvestigateCaseResponse;
        const a = r.debate.agents;
        headline =
          r.debate.synthesis.recommendation === "RECOMMEND_DISMISS_FP"
            ? "4 agent đề nghị Minh oan"
            : "4 agent đề nghị giữ tạm và cảnh báo tài khoản nhận";
        // one conclusion line per agent (4 — the one place the 3-line rule yields, per plan Task 6)
        details = [
          `Dòng tiền: ${a.graph_tracer.key_findings[0] ?? "không có phát hiện"}`,
          `Bằng chứng: ${a.evidence_correlator.independent_sources.length} nguồn độc lập khớp nhau`,
          `Quy định: ${a.compliance_rag.policy_notes_vi[0] ?? "không có trích dẫn"}`,
          `Phản biện: ${a.false_positive_defender.recommend_dismiss ? "đề nghị Minh oan" : "không tìm thấy dấu hiệu khách hàng thật"}`,
        ];
        more = [
          ...a.compliance_rag.policy_notes_vi.slice(1),
          ...a.compliance_rag.cited_chunks.map((c) => c.document_code),
        ];
        meta = `${modelDisplayName(r.debate.model_used)} · ${seconds(r.debate.total_latency_ms)}`;
        replay = isReplayModel(r.debate.model_used)
          ? "Kết quả phát lại từ một lần chạy thật đã ghi (thời điểm và model ghi ở trên)."
          : null;
        break;
      }
      case "3.2": {
        const r = result as CaseDecisionResponse;
        headline = "Đã đề xuất bật Chỉ báo — chờ người thứ hai duyệt";
        details = [
          `Tài khoản ${maskedAccount}`,
          `${r.indicator?.evidenceSources.length ?? 0} nguồn bằng chứng; người duyệt phải là người khác ${CAST.RISK_MAKER_HUYEN.name}.`,
        ];
        break;
      }
      case "4.1": {
        const r = result as ApproveImmunityResponse & { txStatus?: string };
        headline =
          r.txStatus === "CANCELLED_BY_B2E"
            ? `Chỉ báo đã bật · đội Risk đã hủy giao dịch của ${CAST.USER_B2C_HUNG.name}`
            : "Chỉ báo đã bật";
        details = [
          `Hiệu lực đến ${vnTime(r.indicator.expiresAt)}`,
          `${CAST.RISK_CHECKER_TUAN.name} duyệt độc lập với ${CAST.RISK_MAKER_HUYEN.name}.`,
        ];
        break;
      }
      case "4.2": {
        const r = result as ShieldScanResponse;
        headline = r.immunityHit ? "Người dùng mới được cảnh báo ngay" : "Không có cảnh báo";
        details = ["Tra trong Kho Miễn dịch, chưa cần AI đọc ảnh."];
        meta = `${modelDisplayName(r.modelUsed)} · ${seconds(r.measuredLatencyMs)}`;
        break;
      }
    }
  }

  return (
    <section aria-labelledby="backstage-title" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 id="backstage-title" className="text-base font-semibold uppercase tracking-wide text-slate-600">
        Phía sau màn hình
      </h3>
      <div aria-live="polite" className="mt-3 space-y-3">
        <p className="text-xl font-semibold text-momo-primary">{headline}</p>
        {details.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-base text-slate-700">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
        {more.length > 0 && (
          <details className="text-base text-slate-700">
            <summary className="cursor-pointer font-medium text-shift-blue">Xem thêm</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {more.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </details>
        )}
        {meta && <p className="font-mono text-base text-emerald-800">{meta}</p>}
        {scanForNotice && <AiResultNotice scan={scanForNotice} userId="USER_B2C_HUNG" large />}
        {replay && (
          <p className="rounded-lg border-l-4 border-emerald-700 bg-emerald-50 px-3 py-2 font-mono text-base text-emerald-900">
            {replay}
          </p>
        )}
        {result != null && (
          <p className="tech-only font-mono text-base text-slate-600">{JSON.stringify(techIds(result))}</p>
        )}
      </div>
    </section>
  );
}

/** Technical Mode: the ids/enums behind the story beat. */
function techIds(result: unknown): Record<string, unknown> {
  const r = result as Record<string, unknown>;
  const keys = ["scanId", "txId", "status", "caseId", "modelUsed"];
  return Object.fromEntries(keys.filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
}
