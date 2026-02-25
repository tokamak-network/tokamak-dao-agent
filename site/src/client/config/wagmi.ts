import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { sepolia } from "@reown/appkit/networks";
import { injected } from "wagmi/connectors";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined;

if (!projectId) {
  console.warn(
    "[wallet] VITE_REOWN_PROJECT_ID is not set. Wallet connection will be unavailable."
  );
}

const wagmiAdapter = new WagmiAdapter({
  projectId: projectId ?? "",
  networks: [sepolia],
  connectors: [injected()],
});

let appKitInstance: ReturnType<typeof createAppKit> | null = null;

const initialTheme = (typeof window !== "undefined" && localStorage.getItem("theme") === "light")
  ? "light" as const
  : "dark" as const;

if (projectId) {
  appKitInstance = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [sepolia],
    defaultNetwork: sepolia,
    enableInjected: true,
    enableEIP6963: true,
    themeMode: initialTheme,
    themeVariables: {
      "--w3m-color-mix": initialTheme === "dark" ? "#0a0a0f" : "#f5f5f7",
      "--w3m-color-mix-strength": 40,
      "--w3m-accent": initialTheme === "dark" ? "#4a9eff" : "#2563eb",
      "--w3m-border-radius-master": "1px",
    },
    metadata: {
      name: "ERC AI Governance Demo",
      description: "Interactive demo of the ERC AI Agent Governance Interface",
      url: typeof window !== "undefined" ? window.location.origin : "http://localhost:4002",
      icons: [],
    },
    features: {
      analytics: false,
    },
  });
}

export function setAppKitTheme(theme: "dark" | "light") {
  if (!appKitInstance) return;
  appKitInstance.setThemeMode(theme);
  appKitInstance.setThemeVariables({
    "--w3m-color-mix": theme === "dark" ? "#0a0a0f" : "#f5f5f7",
    "--w3m-accent": theme === "dark" ? "#4a9eff" : "#2563eb",
  });
}

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const isWalletConfigured = !!projectId;
