import { createHash } from "node:crypto";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const DEFAULT_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

export type AllowedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type UploadValidationErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_FORMAT";

export class UploadValidationError extends Error {
  readonly statusCode = 400 as const;
  readonly code: UploadValidationErrorCode;

  constructor(code: UploadValidationErrorCode, message: string) {
    super(message);
    this.name = "UploadValidationError";
    this.code = code;
  }
}

export function detectImageMimeFromMagicBytes(buf: Buffer): AllowedImageMimeType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export interface ValidatedImage {
  buffer: Buffer;
  base64: string;
  mimeType: AllowedImageMimeType;
  sizeBytes: number;
  sha256: string;
}

export function validateImageBuffer(
  buf: Buffer,
  declaredMimeType?: string,
): ValidatedImage {
  if (!buf || buf.length === 0) {
    throw new UploadValidationError("EMPTY_FILE", "Tệp hình ảnh trống.");
  }
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      "FILE_TOO_LARGE",
      "Kích thước hình ảnh vượt quá giới hạn tối đa 5 MB.",
    );
  }

  const detected = detectImageMimeFromMagicBytes(buf);
  if (!detected) {
    throw new UploadValidationError(
      "INVALID_IMAGE_FORMAT",
      "Định dạng hình ảnh không hợp lệ (chỉ hỗ trợ JPEG, PNG, WEBP đúng chữ ký nhị phân).",
    );
  }

  const normalizedDeclared = declaredMimeType?.trim().toLowerCase();
  if (
    normalizedDeclared &&
    normalizedDeclared !== "application/octet-stream" &&
    normalizedDeclared !== detected
  ) {
    throw new UploadValidationError(
      "INVALID_IMAGE_FORMAT",
      `Định dạng khai báo (${normalizedDeclared}) không khớp với dữ liệu thực tế (${detected}).`,
    );
  }

  const sha256 = createHash("sha256").update(buf).digest("hex");
  return {
    buffer: buf,
    base64: buf.toString("base64"),
    mimeType: detected,
    sizeBytes: buf.length,
    sha256,
  };
}

export function validateBase64Image(
  rawBase64: string,
  declaredMimeType?: string,
): ValidatedImage {
  const trimmed = rawBase64.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
  const effectiveMime = declaredMimeType ?? dataUrlMatch?.[1];
  const pureBase64 = (dataUrlMatch ? dataUrlMatch[2] : trimmed).replace(/\s+/g, "");

  if (!pureBase64) {
    throw new UploadValidationError("EMPTY_FILE", "Dữ liệu ảnh base64 trống.");
  }

  const estimatedBytes = Math.ceil((pureBase64.length * 3) / 4);
  if (estimatedBytes > MAX_UPLOAD_BYTES + 64) {
    throw new UploadValidationError(
      "FILE_TOO_LARGE",
      "Kích thước hình ảnh vượt quá giới hạn tối đa 5 MB.",
    );
  }

  const buf = Buffer.from(pureBase64, "base64");
  return validateImageBuffer(buf, effectiveMime);
}

export async function purgeExpiredUploads(
  dir: string,
  ttlMs: number = DEFAULT_UPLOAD_TTL_MS,
  nowMs: number = Date.now(),
): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }

  let deleted = 0;
  for (const name of entries) {
    const filePath = path.join(dir, name);
    try {
      const info = await stat(filePath);
      if (info.isFile() && nowMs - info.mtimeMs > ttlMs) {
        await unlink(filePath);
        deleted += 1;
      }
    } catch {
      // Ignore concurrent deletes or unreadable entries.
    }
  }
  return deleted;
}
