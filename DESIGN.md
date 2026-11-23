# TrustLoop — Design System
> deep navy ledger, one orange signal

**Theme:** light · **Team mark:** ShiftGen (`ShiftGen.png`) · **Product:** MoMo TrustLoop (contest entry, not an official MoMo surface)

TrustLoop must read in 10 seconds as *"a calm, trustworthy bank surface that stops a scam before the money leaves"*. The language is a deep-navy institutional ledger on a near-white canvas. Color is functional punctuation, never decoration:

- **Navy** carries structure and trust (headings, primary actions).
- **Shift Blue** (from the ShiftGen logo) marks what is interactive (links, focus, selected step).
- **Seafoam** marks data and "safe" (numbers, measured latency, verified states).
- **Signal Orange** (from the logo's arrow) is reserved for the one moment that matters on a page: *a transfer is being held* or *a high-risk signal*. If everything is orange, nothing is.

Origin: tokens were adapted from a public fintech style analysis; all third-party brand references were removed. Do not imitate MoMo's pink brand color or any government visual identity (AGENTS.md: no impersonation).

## Tokens — Colors

All text colors below are measured against white (`#ffffff`) and canvas (`#f6f6f8`). Body text must reach **≥ 4.5:1** (WCAG AA; elderly users are a primary audience).

| Name | Value | Token | Contrast (white / canvas) | Role |
|------|-------|-------|---------------------------|------|
| Indigo Navy | `#111a4a` | `--color-navy` | 16.5 / 15.3 | Headings, primary button fill, active nav |
| Slate Ink | `#3b3e47` | `--color-ink` | 10.7 / 9.9 | Body text |
| Steel 600 | `#5b5e68` | `--color-steel` | 6.5 / 6.0 | Muted text, captions, labels (replaces old `#7c7f88`, which failed at 3.7:1) |
| Fog | `#a9acb6` | `--color-fog` | 2.3 / 2.1 | Icons, borders, placeholders only — **never text** |
| Silver Lining | `#e3e4e8` | `--color-line` | — | Hairline borders, dividers |
| Cloud Canvas | `#f6f6f8` | `--color-canvas` | — | Page background |
| Pure White | `#ffffff` | `--color-surface` | — | Cards, nav |
| Shift Blue | `#0b57d0` | `--color-blue` | 6.4 / 5.9 | Links, focus ring, selected step, secondary emphasis (logo blue `#0060f8` darkened for AA) |
| Shift Cyan | `#00d8f8` | `--color-cyan` | — | Logo mark and decorative strokes only — **never text** |
| Seafoam 700 | `#13705f` | `--color-seafoam` | 6.0 / 5.5 (5.4 on Seafoam 50) | Data values, measured numbers, "safe / verified / released" states |
| Seafoam 50 | `#e8f6f1` | `--color-seafoam-wash` | — | Background of safe/verified badges |
| Signal Orange 700 | `#c2410c` | `--color-signal` | 5.2 / 4.8 | **The one signal surface per page**: hold banner, high-risk badge fill (white text on it = 5.2:1) |
| Signal Orange 500 | `#ec652b` | `--color-signal-bright` | 3.3 / 3.0 | Large decorative accents ≥ 24px bold, icons, timeline marker — never small text, never text-bearing fills |
| Signal Wash | `#fdf0e9` | `--color-signal-wash` | — | Background behind orange content |
| Error Red 600 | `#b42318` | `--color-error` | 6.4 / 5.9 | Form/API **errors** only (`role="alert"`). Never for risk or hold state — that is Signal Orange |
| Amber 800 | `#8a5a00` | `--color-amber` | ≈ 5.9 | Medium-risk text; pair with `#fdf6e3` wash |
| Midnight Ink | `#011821` | `--color-midnight` | — | Dark inverted sections (B2E War-Room canvas) |

Risk level mapping (one source of truth): `LOW` → Seafoam · `MEDIUM` → Amber · `HIGH`/`CRITICAL` → Signal Orange 700. Never use red-on-green alone to encode state; always add a text label.

## Tokens — Typography

### Be Vietnam Pro — primary typeface · `--font-sans`
Grotesk designed with native Vietnamese diacritic stacking (ể, ộ, ữ stay clean at every size). Free on Google Fonts; load with `next/font/google` (`subsets: ["latin", "vietnamese"]`, weights 400/500/600/700).
- **Weights:** 400 body · 500 UI labels, sub-headings · 600 headings · 700 display only
- **Line height:** never below **1.2** on headings — stacked Vietnamese diacritics clip at 1.1
- **Letter spacing:** -0.02em ≥ 40px, -0.01em 20–32px, normal ≤ 18px

### JetBrains Mono — mono companion · `--font-mono`
Supports Vietnamese. For identifiers, case codes (`CASE-01`), amounts in data tables, measured latency, audit entries. 12–14px, weight 400, tinted Seafoam 700 for values.

### Type Scale

| Role | Size | Line height | Weight | Use |
|------|------|-------------|--------|-----|
| caption | 13px | 1.5 | 400 | Fine print, timestamps (B2E only) |
| body (B2E/Checker) | 16px | 1.5 | 400 | Professional workspaces |
| **body (B2C)** | **18px** | 1.55 | 400 | `/shield`, `/family` — Bác Hùng is 62 |
| subheading | 20px | 1.3 | 500 | Card titles |
| heading-sm | 28px | 1.25 | 600 | Section titles |
| heading | 40px | 1.2 | 600 | Page titles |
| display | 52px | 1.15 | 700 | Home hero only |

Minimum text size anywhere: 13px. B2C: 16px minimum.

## Tokens — Spacing & Shape

- **Base unit:** 4px · scale 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 72, 96
- **Page max-width:** 1200px · **section gap:** 72px (home), 40px (workspaces) · **card padding:** 24px
- **Radius:** 8px for cards, buttons, inputs, nav items · 9999px **only** for tags/badges
- **Touch targets:** ≥ 48px tall on B2C, ≥ 40px elsewhere
- **Focus:** 2px Shift Blue ring with 2px offset on every interactive element; never remove outlines without a replacement

### Shadows (max two styles per page)

| Name | Value | Use |
|------|-------|-----|
| hairline | `rgba(18,22,30,.05) 0 1px 0, rgba(18,22,30,.024) 0 0 0 1px, rgba(18,22,30,.024) 0 1px 4px` | Default card |
| float | `rgba(17,26,74,.05) 0 8px 16px, rgba(17,26,74,.05) 0 4px 8px` | The single "hero" widget (e.g. the held-transfer card on Home) |

## Components

### Primary Button
Navy `#111a4a` fill, white text 15px/500, radius 8px, padding 12px 20px, optional trailing arrow. One per view. Pair only with the Secondary Button — never two filled buttons side by side.

### Secondary Button
Transparent, 1px navy border, navy text, radius 8px, padding 12px 24px.

### Danger-Adjacent Action
Actions that end a hold (Hủy giao dịch) use the Primary Button, not orange — orange signals *a state*, not *an action*.

### Hold Banner (signature state)
The one orange surface on the B2C screen. Signal Orange 700 fill or Signal Wash background with a 4px Signal Orange 700 left rule; white or ink text; contains the exact `NEUTRAL_HOLD_MESSAGE` (import from `@/contracts`, never paraphrase) and the time remaining. Never mentions authorities or suspicious-transaction reports.

### Risk Badge
Pill (9999px), 13px/600, uppercase label + level word in Vietnamese ("RỦI RO CAO"). Colors per the risk mapping. Always text, never color alone.

### Simulation Tag
Every synthetic scenario, seed record and replayed result carries `DEMO_SIMULATION_LABEL` ("MẪU MÔ PHỎNG") as a small outlined amber tag. Non-negotiable (AGENTS.md).

### Replay Notice
When showing a stored real LLM result instead of a live call: Seafoam-wash bar, mono text — *"Kết quả đã chạy thật lúc HH:mm dd/mm · model X · phát lại"* + a Secondary Button "Chạy lại trực tiếp". Never present a replay as live.

### Step Bar (guided demo)
Fixed under the nav on every demo screen: 4 numbered steps ① Bác Hùng quét ảnh → ② Người giám hộ → ③ Đội Risk điều tra → ④ Duyệt & bảo vệ người kế tiếp, with a loop arrow back to ①. Current step: Shift Blue number + navy label; done: Seafoam check; upcoming: Steel. "Tiếp →" is the page's Primary Button. Uses `<nav aria-label="Các bước demo">` and `aria-current="step"`.

### Minute Timeline (signature visual)
Horizontal line Phút 00 ──── Phút 89 ── Phút 90+. Segment 00–88 labeled "Điểm mù ngoài ứng dụng" in Steel; a Signal Orange 500 marker at Phút 00 labeled "TrustLoop can thiệp tại đây"; Phút 89 labeled "Mở ví chuyển tiền"; 90+ labeled "Tiền đã rời ví". This replaces any decorative illustration — the product's idea *is* the visual.

### Data Card / Stats Row
White card, hairline shadow. Numbers in JetBrains Mono or Be Vietnam Pro 600 tinted Seafoam 700; label in Steel 600 below. Only measured or sourced numbers (AGENTS.md: no hardcoded SLAs).

### Technical Mode
Session IDs, DB/LLM status, persona codes (`RISK_MAKER`), enum statuses and wave labels are hidden by default behind a "Chế độ kỹ thuật" toggle in the footer. Judges see Vietnamese labels; engineers can reveal codes.

### Team Mark
ShiftGen logo (cropped mark, `public/shiftgen-mark.png`) 28px in the nav next to the product name "TrustLoop", followed by "by ShiftGen" in caption Steel. The logo's cyan→blue→orange gradient lives only inside the logo file — never on UI elements.

## Layout

- **Home:** hero (left: display headline "Chặn lừa đảo từ Phút 00 — trước khi tiền rời ví", one-sentence explanation, Primary "Xem demo 3 phút: Bác Hùng", Secondary "Tự thử với ảnh của bạn"; right: floating held-transfer widget) → Minute Timeline → 4-step loop explained in one row → sample scenarios list (small) → sources & legal basis link → footer with technical-mode toggle.
- **Workspaces:** Step Bar under the nav; one clear page title stating *who* is acting and *what they decide* ("Chị Huyền — Chuyên viên Risk: điều tra vụ của Bác Hùng"); main action area left, evidence right on desktop, stacked on mobile.
- Mobile: 16px side gutter, no horizontal scroll, Step Bar collapses to "Bước 2/4 · Người giám hộ".

## Do

- Write every label in plain Vietnamese first; put codes (enum, persona IDs) only in technical mode.
- Use at most one **solid** Signal Orange surface per page (the Hold Banner). Other risk content (risk cards, high-risk badges) uses Signal Wash or badges, never a second solid fill.
- Keep errors red and risk orange: an error is "something failed", a signal is "this transfer/account is risky".
- Keep body text ≥ 4.5:1; check new colors before use.
- Keep heading line-height ≥ 1.2 for Vietnamese diacritics.
- Use GLOSSARY.md terms in UI copy (Tạm giữ, Giải phóng, Chuyển cấp, Minh oan, Kết luận rủi ro cao…).

## Don't

- Don't use MoMo pink or any government emblem/visual style.
- Don't put text on Signal Orange 500 `#ec652b` or Shift Cyan.
- Don't use Fog `#a9acb6` or lighter for any text.
- Don't use pill radius on buttons.
- Don't present replayed AI output as live, and don't show unmeasured performance numbers.
- Don't show internal evidence-source names, STR status, or full personal identifiers on B2C screens.

## Agent Prompt Guide

- **Primary action:** navy `#111a4a` fill, white text, 8px radius, 12px 20px padding.
- **Signal state:** Signal Orange 700 `#c2410c` (hold / high risk), once per page.
- **Links & focus:** Shift Blue `#0b57d0`.
- **Data & safe:** Seafoam 700 `#13705f`.
- **Text:** Navy headings, Slate Ink body, Steel 600 muted. Canvas `#f6f6f8`, cards white.
- **Fonts:** Be Vietnam Pro (UI), JetBrains Mono (codes/data).

## Quick Start

### CSS custom properties
```css
:root {
  --color-navy: #111a4a;
  --color-ink: #3b3e47;
  --color-steel: #5b5e68;
  --color-fog: #a9acb6;
  --color-line: #e3e4e8;
  --color-canvas: #f6f6f8;
  --color-surface: #ffffff;
  --color-blue: #0b57d0;
  --color-cyan: #00d8f8;
  --color-seafoam: #13705f;
  --color-seafoam-wash: #e8f6f1;
  --color-signal: #c2410c;
  --color-signal-bright: #ec652b;
  --color-signal-wash: #fdf0e9;
  --color-error: #b42318;
  --color-amber: #8a5a00;
  --color-amber-wash: #fdf6e3;
  --color-midnight: #011821;

  --radius: 8px;
  --shadow-hairline: rgba(18,22,30,.05) 0 1px 0, rgba(18,22,30,.024) 0 0 0 1px, rgba(18,22,30,.024) 0 1px 4px;
  --shadow-float: rgba(17,26,74,.05) 0 8px 16px, rgba(17,26,74,.05) 0 4px 8px;
}
```

### Tailwind v3 (`tailwind.config.ts` → `theme.extend`)
```ts
colors: {
  navy: "#111a4a", ink: "#3b3e47", steel: "#5b5e68", fog: "#a9acb6",
  line: "#e3e4e8", canvas: "#f6f6f8",
  shift: { blue: "#0b57d0", cyan: "#00d8f8" },
  seafoam: { DEFAULT: "#13705f", wash: "#e8f6f1" },
  signal: { DEFAULT: "#c2410c", bright: "#ec652b", wash: "#fdf0e9" },
  amber: { DEFAULT: "#8a5a00", wash: "#fdf6e3" },
  midnight: "#011821",
},
fontFamily: {
  sans: ["var(--font-sans)", "system-ui", "sans-serif"],
  mono: ["var(--font-mono)", "ui-monospace", "monospace"],
},
borderRadius: { DEFAULT: "8px" },
boxShadow: { hairline: "var(--shadow-hairline)", float: "var(--shadow-float)" },
```
