import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, isWalletConfigured } from "./config/wagmi";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import LandingPage from "./pages/LandingPage";
import SpecPage from "./pages/SpecPage";
import DemoPage from "./pages/DemoPage";
import SequencePage from "./pages/SequencePage";

type View = "landing" | "spec" | "demo" | "sequence";

function parseView(): View {
  const path = window.location.pathname;
  if (path === "/spec") return "spec";
  if (path === "/demo") return "demo";
  if (path === "/sequence") return "sequence";
  return "landing";
}

export function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const queryClient = new QueryClient();

export default function App() {
  const [view, setView] = useState<View>(parseView);

  useEffect(() => {
    const onPop = () => setView(parseView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const content =
    view === "sequence" ? <SequencePage /> :
    view === "demo" ? <DemoPage /> :
    view === "spec" ? <SpecPage /> :
    <LandingPage />;

  if (!isWalletConfigured) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Header currentView={view} />
              <main style={{ flex: 1 }}>{content}</main>
              <Footer />
            </div>
          </QueryClientProvider>
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Header currentView={view} />
              <main style={{ flex: 1 }}>{content}</main>
              <Footer />
            </div>
          </QueryClientProvider>
        </WagmiProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
