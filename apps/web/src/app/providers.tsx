"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toast } from "@heroui/react";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <Toast.Provider />
      {children}
    </NextThemesProvider>
  );
}
