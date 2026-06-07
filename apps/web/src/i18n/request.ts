import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";
import { getMessages } from "./loaders/getMessages";

/**
 * next-intl server config.
 * Locale resolution order:
 *   1. Cookie `NEXT_LOCALE`
 *   2. Accept-Language header
 *   3. defaultLocale ("vi")
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // 1. Cookie
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  // 2. Accept-Language header (first segment, e.g. "vi-VN" → "vi")
  const acceptLang = headerStore.get("accept-language")?.split(",")[0]?.split("-")[0]?.trim();

  const resolved = [cookieLocale, acceptLang].find(
    (l): l is Locale => !!l && (locales as readonly string[]).includes(l),
  );

  const locale: Locale = resolved ?? defaultLocale;

  return {
    locale,
    messages: await getMessages(locale),
  };
});
