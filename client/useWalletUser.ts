import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { isAdminWallet } from "@/lib/adminWallets";

export interface WalletUser {
  walletAddress: string | null;
  isConnected: boolean;
  isAdmin: boolean;
  shortAddress: string | null;
}

/**
 * Hook to get wallet-based user information
 * Replaces useAuth() for wallet-only authentication
 */
export function useWalletUser(): WalletUser {
  const { publicKey, connected } = useWallet();
  const [user, setUser] = useState<WalletUser>({
    walletAddress: null,
    isConnected: false,
    isAdmin: false,
    shortAddress: null,
  });

  useEffect(() => {
    const walletAddress = publicKey?.toString() || null;
    const isAdmin = isAdminWallet(walletAddress);
    const shortAddress = walletAddress
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : null;

    setUser({
      walletAddress,
      isConnected: connected,
      isAdmin,
      shortAddress,
    });

    // Store wallet address in localStorage for persistence
    if (walletAddress) {
      localStorage.setItem("tsrs_wallet_address", walletAddress);
    }
  }, [publicKey, connected]);

  return user;
}
