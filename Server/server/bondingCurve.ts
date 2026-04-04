/**
 * Bonding curve implementation for TSRS Coin Creator
 * Uses a linear bonding curve: price = k * supply
 * where k is the bonding curve constant
 */

const BONDING_CURVE_CONSTANT = 0.000001; // Starting price multiplier
const ETH_PRICE_USD = 2500; // Placeholder - in production, fetch from price oracle

/**
 * Calculate the price of a token at a given supply level
 * Linear bonding curve: price = k * supply
 */
export function calculatePrice(circulatingSupply: number): number {
  return BONDING_CURVE_CONSTANT * (circulatingSupply + 1);
}

/**
 * Calculate the cost to buy a specific amount of tokens
 * Integral of price function from current supply to new supply
 * For linear curve: cost = k * (supply_new^2 - supply_current^2) / 2
 */
export function calculateBuyCost(
  currentSupply: number,
  tokensToBuy: number
): { ethAmount: number; averagePrice: number } {
  const newSupply = currentSupply + tokensToBuy;
  const ethAmount =
    (BONDING_CURVE_CONSTANT * (newSupply * newSupply - currentSupply * currentSupply)) / 2;
  const averagePrice = ethAmount / tokensToBuy;
  return { ethAmount, averagePrice };
}

/**
 * Calculate the proceeds from selling a specific amount of tokens
 * Same formula as buy cost but in reverse
 */
export function calculateSellProceeds(
  currentSupply: number,
  tokensToSell: number
): { ethAmount: number; averagePrice: number } {
  const newSupply = Math.max(0, currentSupply - tokensToSell);
  const ethAmount =
    (BONDING_CURVE_CONSTANT * (currentSupply * currentSupply - newSupply * newSupply)) / 2;
  const averagePrice = ethAmount / tokensToSell;
  return { ethAmount, averagePrice };
}

/**
 * Calculate market cap based on current price and supply
 */
export function calculateMarketCap(circulatingSupply: number, priceUSD: number): number {
  return circulatingSupply * priceUSD;
}

/**
 * Convert ETH amount to USD
 */
export function ethToUSD(ethAmount: number): number {
  return ethAmount * ETH_PRICE_USD;
}

/**
 * Convert USD amount to ETH
 */
export function usdToETH(usdAmount: number): number {
  return usdAmount / ETH_PRICE_USD;
}

/**
 * Calculate price impact of a buy order
 * Shows how much the price will move due to the purchase
 */
export function calculatePriceImpact(
  currentSupply: number,
  tokensToBuy: number
): { priceImpactPercent: number; priceAfter: number } {
  const priceBefore = calculatePrice(currentSupply);
  const priceAfter = calculatePrice(currentSupply + tokensToBuy);
  const priceImpactPercent = ((priceAfter - priceBefore) / priceBefore) * 100;
  return { priceImpactPercent, priceAfter };
}

/**
 * Simulate a trade and return detailed information
 */
export function simulateTrade(
  tradeType: "buy" | "sell",
  currentSupply: number,
  amount: number
): {
  tradeType: "buy" | "sell";
  tokenAmount: number;
  ethAmount: number;
  priceUSD: number;
  priceImpact: number;
  newSupply: number;
} {
  if (tradeType === "buy") {
    const { ethAmount, averagePrice } = calculateBuyCost(currentSupply, amount);
    const { priceImpactPercent, priceAfter } = calculatePriceImpact(currentSupply, amount);
    return {
      tradeType: "buy",
      tokenAmount: amount,
      ethAmount,
      priceUSD: ethToUSD(averagePrice),
      priceImpact: priceImpactPercent,
      newSupply: currentSupply + amount,
    };
  } else {
    const { ethAmount, averagePrice } = calculateSellProceeds(currentSupply, amount);
    const newSupply = Math.max(0, currentSupply - amount);
    const { priceImpactPercent } = calculatePriceImpact(newSupply, 0);
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
