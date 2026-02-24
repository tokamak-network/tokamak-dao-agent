import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, isWalletConfigured } from "./config/wagmi";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import SpecPage from "./pages/SpecPage";
import DemoPage from "./pages/DemoPage";

type View = "spec" | "demo";

function parseView(): View {
  const path = window.location.pathname;
  if (path === "/demo") return "demo";
  return "spec";
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

  const content = view === "demo" ? <DemoPage /> : <SpecPage />;

  if (!isWalletConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Header currentView={view} />
          <main style={{ flex: 1 }}>{content}</main>
          <Footer />
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Header currentView={view} />
          <main style={{ flex: 1 }}>{content}</main>
          <Footer />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
