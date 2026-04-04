/**
 * Admin wallet addresses that have special access to the admin dashboard
 * These are Solana wallet addresses that can access admin features
 */
export const ADMIN_WALLETS = [
  "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8", // Main admin wallet
];

/**
 * Check if a wallet address is an admin wallet
 * @param walletAddress - The wallet address to check (e.g., from PublicKey.toString())
 * @returns true if the wallet is in the admin list
 */
export function isAdminWallet(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return ADMIN_WALLETS.includes(walletAddress);
}
