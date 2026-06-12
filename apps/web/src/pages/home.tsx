import { Card } from "@heroui/react";
import { Bot, Cpu, Shield, Zap, ArrowRight, Database } from "lucide-react";
import { Link } from "react-router";
import { useTranslation, Trans } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Bot className="w-5 h-5" />,
      title: t("home.feature.specialist.title"),
      description: t("home.feature.specialist.desc"),
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: t("home.feature.mcp.title"),
      description: t("home.feature.mcp.desc"),
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: t("home.feature.knowledge.title"),
      description: t("home.feature.knowledge.desc"),
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: t("home.feature.security.title"),
      description: t("home.feature.security.desc"),
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/5 via-background to-background overflow-hidden px-6 pb-16">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full z-10 pt-10 md:pt-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Zap className="w-3.5 h-3.5" /> {t("home.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            <Trans
              i18nKey="home.title"
              components={{
                br: <br />,
                gradient: (
                  <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 bg-clip-text text-transparent" />
                ),
              }}
            />
          </h1>
          <p className="text-base md:text-lg text-default-500 max-w-2xl mx-auto leading-relaxed">
            {t("home.subtitle")}
          </p>
        </div>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full sm:w-auto justify-center">
          <Link
            className="px-8 py-4 rounded-xl text-black bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 hover:opacity-95 transition-all duration-300 font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm"
            to="/chat"
          >
            {t("home.cta.chat")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            className="px-8 py-4 rounded-xl border border-default-300 hover:bg-default-100 text-foreground transition-all duration-300 font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm"
            to="/admin"
          >
            {t("home.cta.admin")}
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 w-full">
          {features.map((feat, index) => (
            <Card
              key={index}
              className="bg-content1/50 dark:bg-content1/30 border border-default-200/80 backdrop-blur-md p-6 rounded-2xl hover:border-emerald-500/50 hover:bg-content1/80 dark:hover:bg-content1/50 transition-all duration-300 cursor-pointer shadow-sm group"
            >
              <div className="w-10 h-10 rounded-xl bg-default-100 dark:bg-default-200/10 flex items-center justify-center mb-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                {feat.title}
              </h3>
              <p className="text-xs text-default-500 leading-relaxed">
                {feat.description}
              </p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
