/**
 * Blockchain and fee configuration for TSRS Coin Creator
 * Staggered fees and bonding curve settings per blockchain
 */

export type BlockchainType = "ethereum" | "solana" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism";

export interface BlockchainConfig {
  name: string;
  nativeToken: string;
  nativeTokenSymbol: string;
  chainId?: number;
  rpcUrl?: string;
  explorerUrl: string;
  fees: {
    creation: number; // in USD
    buy: number; // percentage (0-100)
    sell: number; // percentage (0-100)
    graduation: number; // percentage (0-100)
  };
  bondingCurve: {
    type: "exponential" | "power" | "quadratic";
    constant: number;
    exponent?: number;
  };
  distribution: {
    creatorAllocationPercent: number;
    bondingCurvePercent: number;
  };
  graduationThreshold: number; // percentage of bonding curve completion (0-100)
}

export const BLOCKCHAINS: Record<BlockchainType, BlockchainConfig> = {
  solana: {
    name: "Solana",
    nativeToken: "SOL",
    nativeTokenSymbol: "SOL",
    explorerUrl: "https://solscan.io",
    fees: {
      creation: 50, // 0.5 SOL at ~$100/SOL
      buy: 1,
      sell: 1,
      graduation: 1,
    },
    bondingCurve: {
      type: "exponential",
      constant: 0.000001,
    },
    distribution: {
      creatorAllocationPercent: 10,
      bondingCurvePercent: 90,
    },
    graduationThreshold: 80,
  },
  ethereum: {
    name: "Ethereum",
    nativeToken: "ETH",
    nativeTokenSymbol: "ETH",
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    fees: {
      creation: 125, // 0.05 ETH at ~$2500/ETH
      buy: 2,
      sell: 2,
      graduation: 2,
    },
    bondingCurve: {
      type: "power",
      constant: 0.000001,
      exponent: 1.5,
    },
    distribution: {
      creatorAllocationPercent: 8,
      bondingCurvePercent: 92,
    },
    graduationThreshold: 75,
  },
  bsc: {
    name: "Binance Smart Chain",
    nativeToken: "BNB",
    nativeTokenSymbol: "BNB",
    chainId: 56,
    explorerUrl: "https://bscscan.com",
    fees: {
      creation: 30, // 0.1 BNB at ~$300/BNB
      buy: 1.5,
      sell: 1.5,
      graduation: 1.5,
    },
    bondingCurve: {
      type: "quadratic",
      constant: 0.000001,
      exponent: 2,
    },
    distribution: {
      creatorAllocationPercent: 12,
      bondingCurvePercent: 88,
    },
    graduationThreshold: 80,
  },
  base: {
    name: "Base",
    nativeToken: "ETH",
    nativeTokenSymbol: "ETH",
    chainId: 8453,
    explorerUrl: "https://basescan.org",
    fees: {
      creation: 50, // 0.02 ETH at ~$2500/ETH
      buy: 1.5,
      sell: 1.5,
      graduation: 1.5,
    },
    bondingCurve: {
      type: "power",
      constant: 0.000001,
      exponent: 1.5,
    },
    distribution: {
      creatorAllocationPercent: 10,
      bondingCurvePercent: 90,
    },
    graduationThreshold: 80,
  },
  polygon: {
    name: "Polygon",
    nativeToken: "MATIC",
    nativeTokenSymbol: "MATIC",
    chainId: 137,
    explorerUrl: "https://polygonscan.com",
    fees: {
      creation: 5, // 10 MATIC at ~$0.50/MATIC
      buy: 1,
      sell: 1,
      graduation: 1,
    },
    bondingCurve: {
      type: "quadratic",
      constant: 0.000001,
      exponent: 2,
    },
    distribution: {
      creatorAllocationPercent: 15,
      bondingCurvePercent: 85,
    },
    graduationThreshold: 85,
  },
  arbitrum: {
    name: "Arbitrum",
    nativeToken: "ETH",
    nativeTokenSymbol: "ETH",
    chainId: 42161,
    explorerUrl: "https://arbiscan.io",
    fees: {
      creation: 40,
      buy: 1.5,
      sell: 1.5,
      graduation: 1.5,
    },
    bondingCurve: {
      type: "power",
      constant: 0.000001,
      exponent: 1.5,
    },
    distribution: {
      creatorAllocationPercent: 10,
      bondingCurvePercent: 90,
    },
    graduationThreshold: 80,
  },
  optimism: {
    name: "Optimism",
    nativeToken: "ETH",
    nativeTokenSymbol: "ETH",
    chainId: 10,
    explorerUrl: "https://optimistic.etherscan.io",
    fees: {
      creation: 40,
      buy: 1.5,
      sell: 1.5,
      graduation: 1.5,
    },
    bondingCurve: {
      type: "power",
      constant: 0.000001,
      exponent: 1.5,
    },
    distribution: {
      creatorAllocationPercent: 10,
      bondingCurvePercent: 90,
    },
    graduationThreshold: 80,
  },
};

// All fees go to TSRS (100%)
export const FEE_SPLIT = {
  TSRS: 1.0,
};

export function getBlockchainConfig(blockchain: BlockchainType): BlockchainConfig {
  const config = BLOCKCHAINS[blockchain];
  if (!config) {
    throw new Error(`Unknown blockchain: ${blockchain}`);
  }
  return config;
}

export function getCreationFeeUSD(blockchain: BlockchainType): number {
  return getBlockchainConfig(blockchain).fees.creation;
}

export function getBuyFeePercent(blockchain: BlockchainType): number {
  return getBlockchainConfig(blockchain).fees.buy;
}

export function getSellFeePercent(blockchain: BlockchainType): number {
  return getBlockchainConfig(blockchain).fees.sell;
}

export function getGraduationFeePercent(blockchain: BlockchainType): number {
  return getBlockchainConfig(blockchain).fees.graduation;
}

/**
 * All fees go to TSRS treasury (100%)
 */
export function calculateTSRSFee(totalFee: number): number {
  return totalFee * FEE_SPLIT.TSRS;
}
