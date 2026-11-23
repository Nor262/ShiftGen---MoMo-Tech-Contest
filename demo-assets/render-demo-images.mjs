import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_PATH,
    path.join(
      process.env.HOME || "",
      ".local",
      "share",
      "mise",
      "installs",
      "playwright",
      "latest",
      "node_modules",
      "playwright",
    ),
  ].filter(Boolean);
  for (const modPath of candidates) {
    try {
      return require(modPath);
    } catch {
      // try next candidate
    }
  }
  throw new Error("Could not load playwright module");
}

function findChromiumExecutable() {
  const cacheDir = path.join(process.env.HOME || "", ".cache", "ms-playwright");
  if (!fs.existsSync(cacheDir)) return undefined;
  const dirs = fs
    .readdirSync(cacheDir)
    .filter((d) => d.startsWith("chromium_headless_shell-") || d.startsWith("chromium-"))
    .sort()
    .reverse();
  for (const dir of dirs) {
    const candidates = [
      path.join(cacheDir, dir, "chrome-headless-shell-linux64", "chrome-headless-shell"),
      path.join(cacheDir, dir, "chrome-linux64", "chrome"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return undefined;
}

const fakePoliceHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 430px; min-height: 780px;
    background: #e5effa;
    font-family: 'Be Vietnam Pro', sans-serif;
    color: #111827;
  }
  .header {
    background: #0068ff; color: #fff; padding: 12px 15px;
    display: flex; align-items: center; gap: 11px;
  }
  .avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: #334155; border: 2px solid #cbd5e1;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 11px; color: #f8fafc;
  }
  .h-title { font-size: 14px; font-weight: 700; }
  .h-sub { font-size: 11px; color: #dbeafe; margin-top: 2px; }
  .banner {
    background: #fef2f2; border-bottom: 1px solid #fecaca;
    padding: 5px 12px; font-size: 10.5px; font-weight: 700; color: #991b1b; text-align: center;
  }
  .chat { padding: 12px 13px; display: flex; flex-direction: column; gap: 10px; }
  .msg-in {
    background: #fff; border-radius: 12px; padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    max-width: 94%; font-size: 12.5px; line-height: 1.45;
  }
  .msg-out {
    background: #d5f1ff; border-radius: 12px; padding: 9px 12px;
    align-self: flex-end; max-width: 82%; font-size: 12px; line-height: 1.4;
  }
  .doc-card {
    background: #f8fafc; border: 1.5px solid #94a3b8; border-radius: 8px;
    padding: 10px 10px 24px; position: relative; font-family: 'Liberation Serif', serif; overflow: hidden;
  }
  .doc-top { text-align: center; font-size: 10px; font-weight: 700; line-height: 1.3; color: #334155; }
  .doc-title { text-align: center; color: #b91c1c; font-size: 12.5px; font-weight: 800; margin: 6px 0 5px; }
  .doc-body { font-size: 10.8px; line-height: 1.42; color: #1e293b; padding-right: 76px; }
  .stamp {
    position: absolute; right: 6px; bottom: 4px;
    width: 72px; height: 72px; border-radius: 50%;
    border: 2.5px dashed #dc2626; color: #dc2626;
    font-family: 'Be Vietnam Pro', sans-serif;
    font-size: 8px; font-weight: 800; line-height: 1.25;
    display: flex; align-items: center; justify-content: center;
    text-align: center; transform: rotate(-16deg);
    background: rgba(254, 226, 226, 0.35);
  }
  .highlight-red { color: #b91c1c; font-weight: 700; }
  .bank-box {
    margin-top: 6px; padding: 7px 10px; border-radius: 8px;
    background: #fff7ed; border: 1px dashed #ea580c; font-size: 12px;
  }
  .time { font-size: 10px; color: #64748b; margin-top: 4px; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div class="avatar">SIM</div>
    <div>
      <div class="h-title">Cán bộ Điều tra — Phòng Hình sự (MẪU MÔ PHỎNG)</div>
      <div class="h-sub">Tài khoản giả lập • Hồ sơ mô phỏng #HS-SIM-884</div>
    </div>
  </div>
  <div class="banner">MẪU MÔ PHỎNG — Dữ liệu tổng hợp kiểm thử chống lừa đảo</div>
  <div class="chat">
    <div class="msg-in">
      <div class="doc-card">
        <div class="doc-top">
          VĂN BẢN GIẢ MẠO MINH HỌA (MẪU MÔ PHỎNG)<br/>
          Đơn vị giả lập — Không phải cơ quan nhà nước
        </div>
        <div class="doc-title">LỆNH BẮT TẠM GIAM QUA ZALO (MẪU MÔ PHỎNG)</div>
        <div class="doc-body">
          Họ tên: <strong>NGUYỄN VĂN HÙNG (MÔ PHỎNG)</strong><br/>
          Số CCCD: <strong>001064012345</strong> • SĐT: <strong>0901234567</strong><br/>
          Liên quan đường dây rửa tiền 4,2 tỷ đồng. Yêu cầu giữ bí mật tuyệt đối, không báo người thân hay con cái, nếu chống đối sẽ phong tỏa tài sản trong 30 phút.
        </div>
        <div class="stamp">DẤU GIẢ LẬP<br/>MẪU MÔ PHỎNG</div>
      </div>
      <div class="time">14:22</div>
    </div>

    <div class="msg-in">
      <span class="highlight-red">KHẨN CẤP TRƯỚC 15H00:</span> Bác phải chuyển <strong>38.000.000đ</strong> để chứng minh tiền sạch. Chia nhỏ thành <strong>4 lần × 9.500.000đ</strong> để tránh nghẽn hệ thống.
      <div class="bank-box">
        STK nhận: <strong>990123456789</strong><br/>
        Ngân hàng: <strong>NGAN_HANG_MO_PHONG_X</strong><br/>
        Nội dung: XAC MINH HO SO MAT
      </div>
      <div style="margin-top:6px;font-weight:700;color:#991b1b;font-size:12px;">
        TUYỆT ĐỐI KHÔNG BÁO CON GÁI (CHỊ MINH) VÀ KHÔNG NÓI VỚI AI!
      </div>
      <div class="time">14:25</div>
    </div>

    <div class="msg-out">
      Dạ tôi lo quá, tôi đang mở ví chuẩn bị chuyển đợt 1 là 9.500.000đ ngay đây...
      <div class="time">14:27</div>
    </div>
  </div>
</body>
</html>`;

const vneidApkHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 430px; min-height: 780px;
    background: #eef2f6;
    font-family: 'Be Vietnam Pro', sans-serif;
    color: #0f172a;
  }
  .header {
    background: #0284c7; color: #fff; padding: 12px 15px;
    display: flex; align-items: center; gap: 11px;
  }
  .avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: #f59e0b; color: #111827;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 11px;
  }
  .h-title { font-size: 14px; font-weight: 700; }
  .h-sub { font-size: 11px; color: #e0f2fe; margin-top: 2px; }
  .banner {
    background: #fffbeb; border-bottom: 1px solid #fde68a;
    padding: 5px 12px; font-size: 10.5px; font-weight: 700; color: #92400e; text-align: center;
  }
  .chat { padding: 13px; display: flex; flex-direction: column; gap: 11px; }
  .msg-in {
    background: #fff; border-radius: 12px; padding: 11px 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    max-width: 94%; font-size: 12.5px; line-height: 1.48;
  }
  .msg-out {
    background: #dbeafe; border-radius: 12px; padding: 10px 12px;
    align-self: flex-end; max-width: 82%; font-size: 12px; line-height: 1.45;
  }
  .link-card {
    margin-top: 8px; padding: 9px 10px; border-radius: 8px;
    background: #fef2f2; border: 1.5px solid #ef4444;
  }
  .link-url {
    font-family: 'Liberation Mono', monospace;
    font-size: 9.8px; color: #b91c1c; font-weight: 700; white-space: nowrap;
  }
  .steps {
    margin-top: 8px; padding: 9px 11px; border-radius: 8px;
    background: #f8fafc; border: 1px solid #cbd5e1; font-size: 12px; line-height: 1.45;
  }
  .steps li { margin-left: 16px; margin-top: 4px; }
  .time { font-size: 10px; color: #64748b; margin-top: 5px; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div class="avatar">SIM</div>
    <div>
      <div class="h-title">"Hỗ trợ cập nhật định danh" (MẪU MÔ PHỎNG)</div>
      <div class="h-sub">SĐT giả lập: 0987654321 • Nhắn tin Zalo mô phỏng</div>
    </div>
  </div>
  <div class="banner">MẪU MÔ PHỎNG — Kịch bản kiểm thử mã độc APK / Accessibility</div>
  <div class="chat">
    <div class="msg-in">
      Chào bạn Minh Anh (SĐT: <strong>0912345678</strong>). Tài khoản định danh điện tử VNeID của bạn sắp bị <strong>khóa</strong> do chưa cập nhật phiên bản mới. Nếu không cập nhật trong <strong>15 phút</strong>, bạn sẽ không thể giao dịch ngân hàng.
      <div class="time">19:10</div>
    </div>

    <div class="msg-in">
      Bản cập nhật VNeID chưa có trên CH Play, vui lòng tải trực tiếp theo đường dẫn dưới đây:
      <div class="link-card">
        <div style="font-weight:700;color:#991b1b;font-size:11.5px;margin-bottom:4px;">Liên kết tải tệp Android (.APK):</div>
        <div class="link-url">https://dichvucong-xacminh-hoso.example/capnhat.apk</div>
      </div>
      <div class="steps">
        <strong>Hướng dẫn 3 bước cài đặt bắt buộc:</strong>
        <ol>
          <li>Tải <strong>capnhat.apk</strong> và chọn "Cho phép cài đặt từ nguồn không xác định".</li>
          <li>Mở <strong>Cài đặt → Dịch vụ hỗ trợ (Accessibility Services)</strong>.</li>
          <li>Bật quyền <strong>"Kiểm soát màn hình &amp; đọc thông báo"</strong> để hoàn tất trong 15 phút.</li>
        </ol>
      </div>
      <div class="time">19:12</div>
    </div>

    <div class="msg-out">
      Ủa sao phải bật Dịch vụ hỗ trợ (Accessibility Services) vậy anh? Để em kiểm tra lại trên app bảo vệ trước ạ.
      <div class="time">19:14</div>
    </div>
  </div>
</body>
</html>`;

const livestreamMerchantHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 430px; min-height: 780px;
    background: #f0fdf4;
    font-family: 'Be Vietnam Pro', sans-serif;
    color: #0f172a;
  }
  .header {
    background: #059669; color: #fff; padding: 12px 15px;
    display: flex; align-items: center; gap: 11px;
  }
  .avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: #fef3c7; color: #065f46;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 12px;
  }
  .h-title { font-size: 14px; font-weight: 700; }
  .h-sub { font-size: 11px; color: #d1fae5; margin-top: 2px; }
  .banner {
    background: #ecfdf5; border-bottom: 1px solid #a7f3d0;
    padding: 5px 12px; font-size: 10.5px; font-weight: 700; color: #065f46; text-align: center;
  }
  .summary {
    margin: 12px 13px 0; padding: 10px 12px; border-radius: 10px;
    background: #fff; border: 1px solid #bbf7d0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px;
  }
  .badge {
    background: #dcfce7; color: #166534; font-weight: 700;
    padding: 3px 8px; border-radius: 999px; font-size: 10.5px;
  }
  .chat { padding: 12px 13px; display: flex; flex-direction: column; gap: 10px; }
  .msg-in {
    background: #fff; border-radius: 12px; padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    max-width: 90%; font-size: 12.5px; line-height: 1.45;
  }
  .msg-out {
    background: #d1fae5; border-radius: 12px; padding: 10px 12px;
    align-self: flex-end; max-width: 86%; font-size: 12.5px; line-height: 1.45;
  }
  .order-tag {
    display: inline-block; margin-top: 5px; padding: 3px 8px; border-radius: 6px;
    background: #f0fdf4; border: 1px solid #86efac; color: #166534;
    font-size: 11px; font-weight: 700;
  }
  .time { font-size: 10px; color: #64748b; margin-top: 4px; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div class="avatar">HM</div>
    <div>
      <div class="h-title">Shop Gia Dụng Hoa Mai (MẪU MÔ PHỎNG)</div>
      <div class="h-sub">Phiên Livestream 20:00–21:00 • Lịch sử 14 tháng sạch</div>
    </div>
  </div>
  <div class="banner">MẪU MÔ PHỎNG — Kịch bản kiểm chứng Chống chặn oan (CASE-03)</div>
  <div class="summary">
    <div><strong>35 đơn hàng gia dụng</strong><br/><span style="color:#475569;font-size:11px;">Khung giờ 20:00–21:00 • 0 khiếu nại</span></div>
    <div class="badge">HỢP LỆ</div>
  </div>
  <div class="chat">
    <div class="msg-in">
      Chị Hoa ơi em chốt combo hộp đựng thực phẩm trên live nhé, em vừa chuyển khoản xong ạ!
      <div><span class="order-tag">Đơn #LIVE-2014 • 180.000đ • Đã nhận</span></div>
      <div class="time">20:14</div>
    </div>

    <div class="msg-out">
      Dạ shop Hoa Mai cảm ơn em nhiều nha, chị xác nhận đã nhận 180.000đ. Sáng mai shop đóng hàng gửi sớm cho em ạ!
      <div class="time">20:15</div>
    </div>

    <div class="msg-in">
      Shop cho mình lấy 1 nồi chiên mini mã #GD09 nhé, mình vừa thanh toán 420.000đ qua ví rồi ạ.
      <div><span class="order-tag">Đơn #LIVE-2031 • 420.000đ • Đã nhận</span></div>
      <div class="time">20:31</div>
    </div>

    <div class="msg-in">
      Chị Hoa ơi em đặt thêm bộ dao thớt inox 295.000đ như trên live chị giới thiệu nha, em cảm ơn shop!
      <div><span class="order-tag">Đơn #LIVE-2048 • 295.000đ • Đã nhận</span></div>
      <div class="time">20:48</div>
    </div>

    <div class="msg-out">
      Dạ shop đã ghi đủ đơn 420.000đ và 295.000đ rồi ạ. Cảm ơn các anh chị đã ủng hộ phiên live tối nay!
      <div class="time">20:50</div>
    </div>
  </div>
</body>
</html>`;

async function main() {
  const { chromium } = loadPlaywright();
  const outDir = path.resolve(process.cwd(), "public", "demo-images");
  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = findChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const targets = [
    { file: "zalo-fake-police.png", html: fakePoliceHtml },
    { file: "vneid-apk.png", html: vneidApkHtml },
    { file: "livestream-merchant.png", html: livestreamMerchantHtml },
  ];

  const only = process.argv.slice(2);
  const selected = only.length ? targets.filter((t) => only.includes(t.file)) : targets;

  try {
    const context = await browser.newContext({
      viewport: { width: 430, height: 780 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    for (const target of selected) {
      await page.setContent(target.html, { waitUntil: "load" });
      await page.screenshot({
        path: path.join(outDir, target.file),
        fullPage: false,
      });
    }
  } finally {
    await browser.close();
  }

  console.log(`Generated ${selected.length} demo PNG(s) in`, outDir);
}

main().catch((err) => {
  console.error("Failed to generate demo images:", err);
  process.exit(1);
});
