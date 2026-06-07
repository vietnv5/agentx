import type { Locale } from "../config";

// Helper chuyển đổi flat object với keys dạng "a.b.c" thành nested object {a: {b: {c: value}}}
function unflatten(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const parts = key.split(".");
      let current = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i === parts.length - 1) {
          current[part] = data[key];
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      }
    }
  }

  return result;
}

// Danh sách các features trong hệ thống
const FEATURES = ["auth", "agent-admin", "chat-session"];

/**
 * Merge common messages với toàn bộ các feature-specific messages hiện có.
 * Đảm bảo Client Components luôn có đủ translations mà không cần khai báo thủ công ở Layout.
 */
export async function getMessages(locale: Locale) {
  // Load common translations
  const commonRaw = (await import(`../common/${locale}.json`))
    .default as Record<string, any>;
  let mergedRaw = { ...commonRaw };

  // Tự động quét và gộp tất cả các feature translations có sẵn
  for (const feature of FEATURES) {
    try {
      const featureRaw = (
        await import(`../../features/${feature}/i18n/${locale}.json`)
      ).default as Record<string, any>;

      mergedRaw = { ...mergedRaw, ...featureRaw };
    } catch {
      // Bỏ qua nếu feature chưa có file dịch
    }
  }

  return unflatten(mergedRaw);
}
