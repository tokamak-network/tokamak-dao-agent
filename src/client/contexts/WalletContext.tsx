import { createContext, useContext, useCallback, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { wagmiConfig, isWalletConfigured } from "../config/wagmi.ts";

interface WalletContextValue {
  address: string | undefined;
  isConnected: boolean;
  openModal: () => void;
}

const noop = () => {};

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  isConnected: false,
  openModal: noop,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function WalletContextBridge({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const openModal = useCallback(() => open(), [open]);

  return (
    <WalletContext.Provider value={{ address, isConnected, openModal }}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  if (!isWalletConfigured) {
    return (
      <WalletContext.Provider value={{ address: undefined, isConnected: false, openModal: noop }}>
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletContextBridge>{children}</WalletContextBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
