/**
 * Accelerated bonding curve implementation for TSRS Coin Creator
 * Supports exponential, power, and quadratic curves for faster token progression
 */

import { BlockchainType, getBlockchainConfig } from "./config";

const ETH_PRICE_USD = 2500; // Placeholder - in production, fetch from price oracle

export interface BondingCurveParams {
  type: "exponential" | "power" | "quadratic";
  constant: number;
  exponent?: number;
}

/**
 * Calculate price at a given supply level based on curve type
 */
export function calculatePrice(supply: number, params: BondingCurveParams): number {
  if (supply < 0) return params.constant;

  switch (params.type) {
    case "exponential":
      // Exponential: price = k * e^(supply/constant)
      return params.constant * Math.exp(supply / 1e9);

    case "power":
      // Power: price = k * supply^exponent
      const exponent = params.exponent || 1.5;
      return params.constant * Math.pow(supply + 1, exponent);

    case "quadratic":
      // Quadratic: price = k * supply^2
      return params.constant * Math.pow(supply + 1, 2);

    default:
      return params.constant;
  }
}

/**
 * Calculate the cost to buy tokens using numerical integration
 * Uses Simpson's rule for accurate integration
 */
export function calculateBuyCost(
  currentSupply: number,
  tokensToBuy: number,
  params: BondingCurveParams
): { ethAmount: number; averagePrice: number } {
  const newSupply = currentSupply + tokensToBuy;
  const ethAmount = integratePrice(currentSupply, newSupply, params);
  const averagePrice = ethAmount / tokensToBuy;
  return { ethAmount, averagePrice };
}

/**
 * Calculate proceeds from selling tokens
 */
export function calculateSellProceeds(
  currentSupply: number,
  tokensToSell: number,
  params: BondingCurveParams
): { ethAmount: number; averagePrice: number } {
  const newSupply = Math.max(0, currentSupply - tokensToSell);
  const ethAmount = integratePrice(newSupply, currentSupply, params);
  const averagePrice = ethAmount / tokensToSell;
  return { ethAmount, averagePrice };
}

/**
 * Numerical integration using Simpson's rule
 * Integrates the price function from a to b
 */
function integratePrice(a: number, b: number, params: BondingCurveParams): number {
  const n = 100; // Number of intervals
  const h = (b - a) / n;

  let sum = calculatePrice(a, params) + calculatePrice(b, params);

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const weight = i % 2 === 0 ? 2 : 4;
    sum += weight * calculatePrice(x, params);
  }

  return (h / 3) * sum;
}

/**
 * Calculate market cap
 */
export function calculateMarketCap(circulatingSupply: number, priceUSD: number): number {
  return circulatingSupply * priceUSD;
}

/**
 * Convert ETH to USD
 */
export function ethToUSD(ethAmount: number): number {
  return ethAmount * ETH_PRICE_USD;
}

/**
 * Convert USD to ETH
 */
export function usdToETH(usdAmount: number): number {
  return usdAmount / ETH_PRICE_USD;
}

/**
 * Calculate price impact of a trade
 */
export function calculatePriceImpact(
  currentSupply: number,
  tokenAmount: number,
  params: BondingCurveParams
): { priceImpactPercent: number; priceAfter: number } {
  const priceBefore = calculatePrice(currentSupply, params);
  const priceAfter = calculatePrice(currentSupply + tokenAmount, params);
  const priceImpactPercent = ((priceAfter - priceBefore) / priceBefore) * 100;
  return { priceImpactPercent, priceAfter };
}

/**
 * Simulate a complete trade with all details
 */
export function simulateTrade(
  tradeType: "buy" | "sell",
  currentSupply: number,
  amount: number,
  params: BondingCurveParams
): {
  tradeType: "buy" | "sell";
  tokenAmount: number;
  ethAmount: number;
  priceUSD: number;
  priceImpact: number;
  newSupply: number;
} {
  if (tradeType === "buy") {
    const { ethAmount, averagePrice } = calculateBuyCost(currentSupply, amount, params);
    const { priceImpactPercent, priceAfter } = calculatePriceImpact(currentSupply, amount, params);
    return {
      tradeType: "buy",
      tokenAmount: amount,
      ethAmount,
      priceUSD: ethToUSD(averagePrice),
      priceImpact: priceImpactPercent,
      newSupply: currentSupply + amount,
    };
  } else {
    const { ethAmount, averagePrice } = calculateSellProceeds(currentSupply, amount, params);
    const newSupply = Math.max(0, currentSupply - amount);
    const { priceImpactPercent } = calculatePriceImpact(newSupply, 0, params);
    return {
      tradeType: "sell",
      tokenAmount: amount,
      ethAmount,
      priceUSD: ethToUSD(averagePrice),
      priceImpact: priceImpactPercent,
      newSupply,
    };
  }
}

/**
 * Get bonding curve params for a blockchain
 */
export function getBondingCurveParams(blockchain: BlockchainType): BondingCurveParams {
  const config = getBlockchainConfig(blockchain);
  return config.bondingCurve;
}

/**
 * Calculate graduation progress (0-100%)
 */
export function calculateGraduationProgress(
  currentSupply: number,
  totalSupply: number,
  graduationThreshold: number
): number {
  const threshold = (totalSupply * graduationThreshold) / 100;
  return Math.min(100, (currentSupply / threshold) * 100);
}
