"use client";

import React from "react";
import {
  Dropdown,
  Button,
  Label,
} from "@heroui/react";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export function LanguageSwitch({ className }: { className?: string }) {
  const currentLocale = useLocale();
  const router = useRouter();

  const handleLocaleChange = (key: string | number) => {
    const locale = String(key);
    // Lưu locale vào cookie NEXT_LOCALE
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Refresh trang để cập nhật lại i18n
    router.refresh();
  };

  const languages = [
    { key: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
    { key: "en", label: "English", flag: "🇺🇸" },
  ];

  const activeLang = languages.find((lang) => lang.key === currentLocale) || languages[0];

  return (
    <div className={className}>
      <Dropdown>
        <Dropdown.Trigger>
          <span
            className="cursor-pointer text-default-500 hover:bg-default-100/50 p-2 rounded-xl flex items-center justify-center text-lg leading-none inline-flex"
            aria-label={activeLang.label}
          >
            {activeLang.flag}
          </span>
        </Dropdown.Trigger>
        <Dropdown.Popover className="min-w-[120px]">
          <Dropdown.Menu
            aria-label="Chọn ngôn ngữ"
            disallowEmptySelection
            selectionMode="single"
            selectedKeys={new Set([currentLocale])}
            onAction={handleLocaleChange}
          >
            {languages.map((lang) => (
              <Dropdown.Item
                key={lang.key}
                id={lang.key}
                textValue={lang.label}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="text-sm font-medium text-foreground cursor-pointer">{lang.label}</span>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
