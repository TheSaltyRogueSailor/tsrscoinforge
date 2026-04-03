import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

export function useSolanaWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnecting,
    connect,
    disconnect,
    signTransaction,
    signMessage,
  } = useWallet();

  const getWalletAddress = useCallback(() => {
    return publicKey?.toString() || null;
  }, [publicKey]);

  const isConnected = useCallback(() => {
    return connected;
  }, [connected]);

  const signAndSendTransaction = useCallback(
    async (transaction: any) => {
      if (!signTransaction) {
        throw new Error("Wallet does not support signing");
      }
      return await signTransaction(transaction);
    },
    [signTransaction]
  );

  return {
    publicKey: publicKey?.toString() || null,
    connected,
    connecting,
    disconnecting,
    connect,
    disconnect,
    getWalletAddress,
    isConnected,
    signTransaction,
    signMessage,
    signAndSendTransaction,
  };
}
