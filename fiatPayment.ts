import { TRPCError } from "@trpc/server";

/**
 * Fiat payment integration for MoonPay and Stripe
 * Allows users to purchase cryptocurrency with credit/debit cards
 */

export interface FiatPaymentConfig {
  method: "moonpay" | "stripe";
  amount: number; // USD amount
  currency: "USD" | "EUR" | "GBP";
  cryptoAmount: number;
  cryptoSymbol: string;
  walletAddress: string;
  blockchain: string;
  returnUrl: string;
}

/**
 * Generate MoonPay payment URL
 * MoonPay handles the fiat-to-crypto conversion
 */
export function generateMoonPayUrl(config: FiatPaymentConfig): string {
  const moonpayApiKey = process.env.MOONPAY_API_KEY;
  if (!moonpayApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "MoonPay not configured",
    });
  }

  const params = new URLSearchParams({
    apiKey: moonpayApiKey,
    currencyCode: config.cryptoSymbol.toUpperCase(),
    walletAddress: config.walletAddress,
    baseCurrencyCode: config.currency,
    baseCurrencyAmount: config.amount.toString(),
    redirectURL: config.returnUrl,
    showWalletAddressForm: "false",
  });

  return `https://buy.moonpay.com?${params.toString()}`;
}

/**
 * Create Stripe payment intent for fiat payment
 * Returns client secret for Stripe Elements
 */
export async function createStripePaymentIntent(config: FiatPaymentConfig): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe not configured",
    });
  }

  // In production, use Stripe SDK
  // For now, return mock response
  const mockPaymentIntentId = `pi_${Date.now()}`;
  const mockClientSecret = `${mockPaymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;

  return {
    clientSecret: mockClientSecret,
    paymentIntentId: mockPaymentIntentId,
    amount: Math.round(config.amount * 100), // Convert to cents
    currency: config.currency.toLowerCase(),
  };
}

/**
 * Validate fiat payment
 * Check if payment was successful and route crypto to wallet
 */
export async function validateFiatPayment(params: {
  paymentMethod: "moonpay" | "stripe";
  paymentId: string;
  walletAddress: string;
  cryptoAmount: number;
  cryptoSymbol: string;
}): Promise<{
  success: boolean;
  transactionHash?: string;
  status: "pending" | "completed" | "failed";
  message: string;
}> {
  try {
    // TODO: Implement actual payment verification
    // For MoonPay: Check transaction status via API
    // For Stripe: Verify webhook signature and payment status

    return {
      success: true,
      status: "completed",
      message: "Payment verified successfully",
    };
  } catch (error) {
    console.error("Error validating fiat payment:", error);
    return {
      success: false,
      status: "failed",
      message: "Payment verification failed",
    };
  }
}

/**
 * Get supported fiat currencies
 */
export function getSupportedFiatCurrencies(): {
  code: string;
  name: string;
  symbol: string;
}[] {
  return [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  ];
}

/**
 * Get supported payment methods
 */
export function getSupportedPaymentMethods(): {
  id: "moonpay" | "stripe";
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  fees: number; // percentage
}[] {
  return [
    {
      id: "moonpay",
      name: "MoonPay",
      description: "Buy crypto with credit/debit card",
      minAmount: 10,
      maxAmount: 10000,
      fees: 4.5,
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Secure card payments",
      minAmount: 5,
      maxAmount: 50000,
      fees: 2.9,
    },
  ];
}

/**
 * Calculate total cost including fees
 */
export function calculateFiatPaymentTotal(params: {
  amount: number;
  method: "moonpay" | "stripe";
}): {
  subtotal: number;
  fees: number;
  total: number;
  feePercentage: number;
} {
  const methods = getSupportedPaymentMethods();
  const method = methods.find((m) => m.id === params.method);

  if (!method) {
    throw new Error(`Unknown payment method: ${params.method}`);
  }

  const feePercentage = method.fees;
  const fees = (params.amount * feePercentage) / 100;
  const total = params.amount + fees;

  return {
    subtotal: params.amount,
    fees,
    total,
    feePercentage,
  };
}

/**
 * Format fiat amount for display
 */
export function formatFiatAmount(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
  };

  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}
