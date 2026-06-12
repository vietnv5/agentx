import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";

export function LayoutWrapper() {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        <Outlet />
      </main>
      <footer className="w-full flex items-center justify-center py-3 border-t border-default-100">
        <span className="text-default-400 text-sm">
          {t("footer.poweredBy")}
        </span>
      </footer>
    </div>
  );
}

export default LayoutWrapper;
