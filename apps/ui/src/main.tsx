import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";

import App from "./App.tsx";
import "./i18n"; // Khởi tạo i18next
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Toast.Provider />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
