import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { mainnet } from "@reown/appkit/networks";
import { injected } from "wagmi/connectors";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined;

if (!projectId) {
  console.warn(
    "[wallet] VITE_REOWN_PROJECT_ID is not set. Wallet connection will be unavailable.",
  );
}

const wagmiAdapter = new WagmiAdapter({
  projectId: projectId ?? "",
  networks: [mainnet],
  connectors: [injected()],
});

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [mainnet],
    defaultNetwork: mainnet,
    enableInjected: true,
    enableEIP6963: true,
    themeMode: "dark",
    themeVariables: {
      "--w3m-color-mix": "#111827",
      "--w3m-color-mix-strength": 40,
      "--w3m-accent": "#f9fafb",
      "--w3m-border-radius-master": "1px",
    },
    metadata: {
      name: "Tokamak DAO Agent",
      description: "Tokamak Network DAO Governance Agent",
      url: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
      icons: [],
    },
    features: {
      analytics: false,
    },
  });
}

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const isWalletConfigured = !!projectId;
