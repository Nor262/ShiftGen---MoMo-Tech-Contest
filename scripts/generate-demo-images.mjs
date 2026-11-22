import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    "playwright",
    "/home/nor/.local/share/mise/installs/playwright/latest/node_modules/playwright",
  ];
  for (const modPath of candidates) {
    try {
      return require(modPath);
    } catch {
      // try next candidate
    }
  }
  throw new Error("Could not load playwright module");
}

const fakePoliceHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 430px;
    background: #e5effa;
    font-family: 'Be Vietnam Pro', sans-serif;
    color: #111827;
  }
  .header {
    background: #0068ff;
    color: #fff;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: #b91c1c; border: 2px solid #fde047;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px; color: #fde047;
  }
  .h-title { font-size: 15px; font-weight: 700; }
  .h-sub { font-size: 11px; color: #dbeafe; margin-top: 2px; }
  .banner {
    background: #fef2f2; border-bottom: 1px solid #fecaca;
    padding: 6px 14px; font-size: 11px; color: #991b1b; text-align: center;
  }
  .chat { padding: 14px; display: flex; flex-direction: column; gap: 11px; }
  .msg-in {
    background: #fff; border-radius: 12px; padding: 11px 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    max-width: 92%;
    font-size: 13px; line-height: 1.48;
  }
  .msg-out {
    background: #d5f1ff; border-radius: 12px; padding: 10px 12px;
    align-self: flex-end; max-width: 82%; font-size: 12.5px; line-height: 1.45;
  }
  .doc-card {
    background: #f8fafc;
    border: 1.5px solid #94a3b8;
    border-radius: 8px;
    padding: 11px;
    position: relative;
    font-family: 'Liberation Serif', serif;
    overflow: hidden;
  }
  .doc-top { text-align: center; font-size: 10.5px; font-weight: 700; line-height: 1.3; }
  .doc-title { text-align: center; color: #b91c1c; font-size: 13px; font-weight: 800; margin: 7px 0 5px; letter-spacing: 0.3px; }
  .doc-body { font-size: 10.8px; line-height: 1.42; color: #1e293b; }
  .stamp {
    position: absolute; right: 10px; bottom: 8px;
    width: 78px; height: 78px; border-radius: 50%;
    border: 3px solid #dc2626;
    color: #dc2626; font-size: 8px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    text-align: center; transform: rotate(-16deg);
    background: rgba(255,255,255,0.2);
    box-shadow: 0 0 0 1px rgba(220,38,38,0.6);
  }
  .highlight-red { color: #b91c1c; font-weight: 700; }
  .bank-box {
    margin-top: 6px; padding: 8px 10px; border-radius: 8px;
    background: #fff7ed; border: 1px dashed #ea580c; font-size: 12.5px;
  }
  .time { font-size: 10px; color: #64748b; margin-top: 4px; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div class="avatar">CA</div>
    <div>
      <div class="h-title">Cán bộ Điều tra — Phòng Hình sự</div>
      <div class="h-sub">Đang trực tuyến • Hồ sơ mật #HS-2026-884</div>
    </div>
  </div>
  <div class="banner">Zalo (Mô phỏng dữ liệu tổng hợp — Không phải tài khoản thật)</div>
  <div class="chat">
    <div class="msg-in">
      <div class="doc-card">
        <div class="doc-top">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>
          Độc lập - Tự do - Hạnh phúc<br/>
          <span style="font-size:9px;font-weight:400;">CƠ QUAN CẢNH SÁT ĐIỀU TRA (MÔ PHỎNG)</span>
        </div>
        <div class="doc-title">LỆNH BẮT TẠM GIAM KHẨN CẤP QUA ZALO</div>
        <div class="doc-body">
          Đối tượng: <strong>NGUYỄN VĂN HÙNG</strong><br/>
          Số CCCD: <strong>001064012345</strong> • SĐT: <strong>0901234567</strong><br/>
          Liên quan đường dây rửa tiền 4,2 tỷ đồng. Yêu cầu giữ bí mật tuyệt đối, không thông báo cho người thân hay con cái, nếu chống đối sẽ phong tỏa toàn bộ tài sản trong 30 phút.
        </div>
        <div class="stamp">CON DẤU ĐỎ<br/>ĐƯỢC GHÉP<br/>LỆCH PHÔNG</div>
      </div>
      <div class="time">14:22</div>
    </div>

    <div class="msg-in">
      <span class="highlight-red">KHẨN CẤP TRƯỚC 15H00:</span> Bác phải chứng minh tiền sạch ngay bằng cách chuyển <strong>38.000.000đ</strong> vào tài khoản tạm giữ điều tra. Để tránh nghẽn mạng, <strong>chia làm 4 lần, mỗi lần 9.500.000đ</strong>.
      <div class="bank-box">
        STK nhận: <strong>990123456789</strong><br/>
        Ngân hàng: <strong>NGAN_HANG_MO_PHONG_X</strong><br/>
        Nội dung: XAC MINH HO SO MAT
      </div>
      <div style="margin-top:6px;font-weight:700;color:#991b1b;">
        TUYỆT ĐỐI KHÔNG BÁO CON GÁI (CHỊ MINH) VÀ KHÔNG NÓI VỚI NHÂN VIÊN NGÂN HÀNG!
      </div>
      <div class="time">14:25</div>
    </div>

    <div class="msg-out">
      Dạ tôi sợ quá, tôi đang mở ví chuẩn bị chuyển đợt 1 là 9.500.000đ ngay đây ạ...
      <div class="time">14:27</div>
    </div>
  </div>
</body>
</html>`;

const shipperApkHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 430px;
    background: #eef2f6;
    font-family: 'Be Vietnam Pro', sans-serif;
    color: #0f172a;
  }
  .header {
    background: #0284c7;
    color: #fff;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: #f59e0b; color: #111827;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px;
  }
  .h-title { font-size: 15px; font-weight: 700; }
  .h-sub { font-size: 11px; color: #e0f2fe; margin-top: 2px; }
  .banner {
    background: #fffbeb; border-bottom: 1px solid #fde68a;
    padding: 6px 14px; font-size: 11px; color: #92400e; text-align: center;
  }
  .chat { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
  .msg-in {
    background: #fff; border-radius: 12px; padding: 12px 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    max-width: 94%;
    font-size: 13px; line-height: 1.5;
  }
  .msg-out {
    background: #dbeafe; border-radius: 12px; padding: 10px 12px;
    align-self: flex-end; max-width: 82%; font-size: 12.5px; line-height: 1.45;
  }
  .link-card {
    margin-top: 8px; padding: 10px; border-radius: 8px;
    background: #fef2f2; border: 1.5px solid #ef4444;
  }
  .link-url {
    font-family: 'Liberation Mono', monospace;
    font-size: 11.5px; color: #b91c1c; font-weight: 700; word-break: break-all;
  }
  .steps {
    margin-top: 8px; padding: 9px 11px; border-radius: 8px;
    background: #f8fafc; border: 1px solid #cbd5e1; font-size: 12px;
  }
  .steps li { margin-left: 16px; margin-top: 4px; }
  .time { font-size: 10px; color: #64748b; margin-top: 5px; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div class="avatar">GH</div>
    <div>
      <div class="h-title">Bưu cục Giao Hàng Nhanh #09</div>
      <div class="h-sub">CSKH Đồng bộ Dịch vụ Công • SĐT: 0987654321</div>
    </div>
  </div>
  <div class="banner">Zalo (Mô phỏng dữ liệu tổng hợp — Không phải tài khoản thật)</div>
  <div class="chat">
    <div class="msg-in">
      Chào bạn Minh Anh (SĐT nhận hàng: <strong>0987654321</strong>). Đơn hàng của bạn đang bị treo do sai mã bưu cục và chưa xác thực hồ sơ cư trú. Nếu không cập nhật trong <strong>15 phút</strong>, đơn sẽ bị hủy và tính phí lưu kho 350.000đ/ngày.
      <div class="time">19:10</div>
    </div>

    <div class="msg-in">
      Bạn tải gấp ứng dụng xác nhận bưu cục chính thức bên dưới (không có trên CH Play do đang bảo trì):
      <div class="link-card">
        <div style="font-weight:700;color:#991b1b;font-size:12px;margin-bottom:4px;">Tải gói cài đặt Android (.APK):</div>
        <div class="link-url">https://dichvucong-xacminh-hoso.example/capnhat.apk</div>
      </div>
      <div class="steps">
        <strong>Hướng dẫn 3 bước cài đặt bắt buộc:</strong>
        <ol>
          <li>Tải file <strong>capnhat.apk</strong> và chọn "Vẫn cho phép cài đặt từ nguồn không xác định".</li>
          <li>Vào <strong>Cài đặt → Hỗ trợ (Accessibility Services)</strong>.</li>
          <li>Bật quyền <strong>"Cho phép kiểm soát màn hình & đọc thông báo"</strong> để hoàn tất hoàn tiền 35.000đ.</li>
        </ol>
      </div>
      <div class="time">19:12</div>
    </div>

    <div class="msg-out">
      Ủa sao phải bật quyền Accessibility vậy anh? Để em kiểm tra lại chút ạ.
      <div class="time">19:14</div>
    </div>
  </div>
</body>
</html>`;

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

async function main() {
  const { chromium } = loadPlaywright();
  const outDir = path.resolve(process.cwd(), "public", "demo-images");
  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = findChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 430, height: 760 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await page.setContent(fakePoliceHtml, { waitUntil: "load" });
    await page.screenshot({
      path: path.join(outDir, "zalo-fake-police.png"),
      fullPage: true,
    });

    await page.setContent(shipperApkHtml, { waitUntil: "load" });
    await page.screenshot({
      path: path.join(outDir, "shipper-apk.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }

  console.log("Generated demo images in", outDir);
}

main().catch((err) => {
  console.error("Failed to generate demo images:", err);
  process.exit(1);
});
