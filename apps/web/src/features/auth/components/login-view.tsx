"use client";

import React, { useState } from "react";
import {
  Card,
  InputGroup,
  TextField,
  Label,
  Button,
  Form,
} from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTranslations } from "next-intl";

import { authService } from "@/src/features/auth/services/auth.service";
import { useAuthStore } from "@/src/features/auth/auth-store";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";

export default function LoginView() {
  const router = useRouter();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const t = useTranslations();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Nếu đã đăng nhập, chuyển hướng luôn
  React.useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(user.role?.name === "ADMIN" ? "/admin" : "/chat");
    }
  }, [isAuthenticated, user, router]);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const data = await authService.login({
        email,
        password,
      });

      const { accessToken, refreshToken, user: authUser } = data;

      setAuth(accessToken, refreshToken, authUser);

      // Chuyển hướng người dùng dựa vào vai trò
      if (authUser.role?.name === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/chat");
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(
          error.response.data?.message || t("login.error.invalidCredentials"),
        );
      } else {
        setErrorMessage(t("error.connection"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-background to-background overflow-hidden px-4">
      {/* Control Panel (Theme + Language) */}
      <div className="absolute top-4 right-4 z-20 bg-content1/50 dark:bg-content1/30 border border-default-200/50 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm flex items-center justify-center gap-1">
        <ThemeSwitch />
        <span className="w-[1px] h-4 bg-default-300/60 mx-1" />
        <LanguageSwitch />
      </div>

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        {/* App Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/15 mb-4 transition-transform hover:scale-105 duration-300">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("app.name")}
          </h1>
          <p className="text-sm text-default-500 mt-1">{t("app.tagline")}</p>
        </div>

        {/* Card Form */}
        <Card className="backdrop-blur-md bg-content1/70 border border-default-200/80 shadow-2xl p-2 rounded-2xl">
          <Card.Header className="flex flex-col items-start px-6 pt-6 pb-2">
            <h2 className="text-xl font-bold text-foreground">
              {t("login.title")}
            </h2>
            <p className="text-xs text-default-500 mt-1">
              {t("login.subtitle")}
            </p>
          </Card.Header>

          <Card.Content className="px-6 py-4">
            <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {errorMessage && (
                <div className="p-3 text-xs text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl w-full animate-pulse">
                  {errorMessage}
                </div>
              )}

              <TextField isRequired className="w-full flex flex-col gap-1.5">
                <Label className="text-default-700 text-xs font-semibold">
                  {t("login.email.label")}
                </Label>
                <InputGroup className="border border-default-200 focus-within:border-emerald-500/50 hover:border-default-300 bg-default-100/40 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <InputGroup.Prefix className="text-default-400 flex items-center">
                    <Mail className="w-4 h-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    className="w-full text-foreground text-sm placeholder:text-default-400 bg-transparent outline-none border-none focus:outline-none focus:ring-0"
                    placeholder={t("login.email.placeholder")}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </InputGroup>
              </TextField>

              <TextField isRequired className="w-full flex flex-col gap-1.5">
                <Label className="text-default-700 text-xs font-semibold">
                  {t("login.password.label")}
                </Label>
                <InputGroup className="border border-default-200 focus-within:border-emerald-500/50 hover:border-default-300 bg-default-100/40 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <InputGroup.Prefix className="text-default-400 flex items-center">
                    <Lock className="w-4 h-4" />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    className="w-full text-foreground text-sm placeholder:text-default-400 bg-transparent outline-none border-none focus:outline-none focus:ring-0"
                    placeholder={t("login.password.placeholder")}
                    type={isVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <InputGroup.Suffix className="flex items-center">
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={toggleVisibility}
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4 text-default-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-default-400" />
                      )}
                    </button>
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>

              <Button
                className="w-full font-medium text-black bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 py-6 rounded-xl mt-2 transition-all duration-300 hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer"
                isDisabled={isLoading}
                type="submit"
              >
                {isLoading ? t("login.submitting") : t("login.submit")}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </Form>

            <div className="flex flex-col items-center justify-center mt-6 text-[10px] text-default-400 gap-1 text-center">
              <div>{t("login.demo.label")}</div>
              <div className="mt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  admin@agentx.local
                </span>
                <span className="mx-1.5">/</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  Admin@123456
                </span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
