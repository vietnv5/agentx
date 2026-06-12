import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { defaultLocale, locales } from "./config";

// Import trực tiếp JSON files (Vite tự động resolve JSON)
import commonVi from "./common/vi.json";
import commonEn from "./common/en.json";
import authVi from "../features/auth/i18n/vi.json";
import authEn from "../features/auth/i18n/en.json";
import adminVi from "../features/agent-admin/i18n/vi.json";
import adminEn from "../features/agent-admin/i18n/en.json";
import chatVi from "../features/chat-session/i18n/vi.json";
import chatEn from "../features/chat-session/i18n/en.json";

// Unflatten function (giữ nguyên từ web)
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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: unflatten({ ...commonVi, ...authVi, ...adminVi, ...chatVi }) },
      en: { translation: unflatten({ ...commonEn, ...authEn, ...adminEn, ...chatEn }) },
    },
    fallbackLng: defaultLocale,
    supportedLngs: [...locales],
    interpolation: { escapeValue: false },
    detection: {
      order: ["cookie", "navigator"],
      caches: ["cookie"],
      lookupCookie: "NEXT_LOCALE", // Giữ backward-compat với cookie cũ
    },
  });

export default i18n;
