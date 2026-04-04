import {
  BaseSignerWalletAdapter,
  WalletConnectionError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  WalletSignMessageError,
  WalletSignTransactionError,
  type WalletName,
} from "@solana/wallet-adapter-base";
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

interface PhantomProvider {
  publicKey?: PublicKey;
  isConnected?: boolean;
  isPhantom?: boolean;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): PhantomProvider;
  off(event: string, listener: (...args: any[]) => void): PhantomProvider;
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider;
    };
  }
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function isPhantomInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.phantom?.solana?.isPhantom;
}

function getPhantomDeeplink(action: string, params?: Record<string, string>): string {
  const baseUrl = "https://phantom.app/ul/v1";
  const queryParams = new URLSearchParams({
    action,
    redirect_link: window.location.href,
    ...params,
  });
  return `${baseUrl}?${queryParams.toString()}`;
}

const PHANTOM_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjQUIwMDAwIi8+Cjwvc3ZnPgo=";

export class PhantomMobileWalletAdapter extends BaseSignerWalletAdapter<"Phantom"> {
  name: WalletName<"Phantom"> = "Phantom" as WalletName<"Phantom">;
  url = "https://phantom.app";
  icon = PHANTOM_ICON;
  supportedTransactionVersions = new Set(["legacy", 0] as const);

  private _connecting: boolean;
  private _wallet: PhantomProvider | null;
  private _publicKey: PublicKey | null;
  private _readyState: WalletReadyState;

  constructor() {
    super();
    this._connecting = false;
    this._wallet = null;
    this._publicKey = null;

    // Determine ready state based on environment
    if (typeof window === "undefined") {
      this._readyState = WalletReadyState.Unsupported;
    } else if (isPhantomInstalled()) {
      this._readyState = WalletReadyState.Installed;
    } else if (isMobileDevice()) {
      // On mobile, show as loadable (can open via deeplink)
      this._readyState = WalletReadyState.Loadable;
    } else {
      // On desktop without Phantom, mark as not detected
      this._readyState = WalletReadyState.NotDetected;
    }

    this._setupListeners();
  }

  private _setupListeners(): void {
    if (typeof window !== "undefined" && window.phantom?.solana) {
      window.phantom.solana.on("connect", this._onConnect);
      window.phantom.solana.on("disconnect", this._onDisconnect);
      window.phantom.solana.on("accountChanged", this._onAccountChanged);
    }
  }

  private _onConnect = (): void => {
    if (this._publicKey) {
      this.emit("connect", this._publicKey);
    }
  };

  private _onDisconnect = (): void => {
    this._publicKey = null;
    this._wallet = null;
    this.emit("disconnect");
  };

  private _onAccountChanged = (publicKey: PublicKey | null): void => {
    this._publicKey = publicKey;
  };

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected) return;

      if (this._connecting) {
        throw new WalletConnectionError("Wallet is already connecting");
      }

      this._connecting = true;

      // Check if Phantom is installed
      if (!isPhantomInstalled()) {
        if (isMobileDevice()) {
          // On mobile without Phantom, open deeplink to install/connect
          const deeplink = getPhantomDeeplink("connect");
          window.location.href = deeplink;
          return;
        } else {
          // On desktop without Phantom, throw error
          throw new WalletNotReadyError();
        }
      }

      // Phantom is installed, use standard connection
      this._wallet = window.phantom?.solana || null;

      if (!this._wallet) {
        throw new WalletNotReadyError();
      }

      try {
        const response = await this._wallet.connect();
        this._publicKey = response.publicKey;
      } catch (error: any) {
        throw new WalletConnectionError(
          error?.message || "Failed to connect to Phantom"
        );
      }
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this._wallet) {
      try {
        await this._wallet.disconnect();
      } catch (error: any) {
        console.error("Error disconnecting:", error);
      }
    }

    this._publicKey = null;
    this._wallet = null;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    try {
      if (!this.connected) throw new WalletNotConnectedError();
      if (!this._wallet) throw new WalletNotConnectedError();

      try {
        return await this._wallet.signTransaction(transaction);
      } catch (error: any) {
        throw new WalletSignTransactionError(
          error?.message || "Failed to sign transaction"
        );
      }
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    }
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    try {
      if (!this.connected) throw new WalletNotConnectedError();
      if (!this._wallet) throw new WalletNotConnectedError();

      try {
        return await this._wallet.signAllTransactions(transactions);
      } catch (error: any) {
        throw new WalletSignTransactionError(
          error?.message || "Failed to sign transactions"
        );
      }
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this.connected) throw new WalletNotConnectedError();
      if (!this._wallet) throw new WalletNotConnectedError();

      try {
        const response = await this._wallet.signMessage(message);
        return response.signature;
      } catch (error: any) {
        throw new WalletSignMessageError(
          error?.message || "Failed to sign message"
        );
      }
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    }
  }

  async signIn(input?: SolanaSignInInput): Promise<SolanaSignInOutput> {
    try {
      if (!this.connected) throw new WalletNotConnectedError();
      if (!this._wallet) throw new WalletNotConnectedError();
      if (!this._publicKey) throw new WalletNotConnectedError();

      const message = new TextEncoder().encode(
        input?.statement || "Sign in to TSRS Coin Creator"
      );

      const signature = await this.signMessage(message);
      return {
        account: {
          address: this._publicKey.toBase58(),
          publicKey: this._publicKey.toBytes(),
          chains: ["solana:mainnet"],
          features: ["solana:signMessage"],
        },
        signature: Buffer.from(signature),
        signedMessage: message,
      };
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    }
  }
}
