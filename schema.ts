import {
  bigint,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  walletAddress: varchar("walletAddress", { length: 128 }),
  walletChain: varchar("walletChain", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tokens = mysqlTable("tokens", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  symbol: varchar("symbol", { length: 16 }).notNull(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  blockchain: varchar("blockchain", { length: 32 }).notNull(),
  totalSupply: bigint("totalSupply", { mode: "number" }).notNull().default(1000000000),
  circulatingSupply: bigint("circulatingSupply", { mode: "number" }).notNull().default(0),
  creatorId: int("creatorId").notNull(),
  creatorWallet: varchar("creatorWallet", { length: 128 }),
  contractAddress: varchar("contractAddress", { length: 128 }).notNull(),
  // Bonding curve state
  reserveBalance: decimal("reserveBalance", { precision: 36, scale: 18 }).notNull().default("0"),
  currentPriceUSD: decimal("currentPriceUSD", { precision: 36, scale: 18 }).notNull().default("0.000001"),
  marketCapUSD: decimal("marketCapUSD", { precision: 36, scale: 18 }).notNull().default("0"),
  volume24hUSD: decimal("volume24hUSD", { precision: 36, scale: 18 }).notNull().default("0"),
  totalVolumeUSD: decimal("totalVolumeUSD", { precision: 36, scale: 18 }).notNull().default("0"),
  holderCount: int("holderCount").notNull().default(0),
  tradeCount: int("tradeCount").notNull().default(0),
  // Social links
  website: varchar("website", { length: 256 }),
  twitter: varchar("twitter", { length: 128 }),
  telegram: varchar("telegram", { length: 128 }),
  status: mysqlEnum("status", ["active", "graduated", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Token = typeof tokens.$inferSelect;
export type InsertToken = typeof tokens.$inferInsert;

export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  tokenId: int("tokenId").notNull(),
  userId: int("userId").notNull(),
  walletAddress: varchar("walletAddress", { length: 128 }),
  tradeType: mysqlEnum("tradeType", ["buy", "sell"]).notNull(),
  tokenAmount: decimal("tokenAmount", { precision: 36, scale: 18 }).notNull(),
  ethAmount: decimal("ethAmount", { precision: 36, scale: 18 }).notNull(),
  priceUSD: decimal("priceUSD", { precision: 36, scale: 18 }).notNull(),
  blockchain: varchar("blockchain", { length: 32 }).notNull(),
  txHash: varchar("txHash", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  tokenId: int("tokenId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  tokenId: int("tokenId").notNull(),
  priceUSD: decimal("priceUSD", { precision: 36, scale: 18 }).notNull(),
  volumeUSD: decimal("volumeUSD", { precision: 36, scale: 18 }).notNull().default("0"),
  marketCapUSD: decimal("marketCapUSD", { precision: 36, scale: 18 }).notNull().default("0"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId").notNull(),
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  totalEarnings: decimal("totalEarnings", { precision: 36, scale: 18 }).notNull().default("0"),
  totalReferrals: int("totalReferrals").notNull().default(0),
  rewardPercentage: int("rewardPercentage").notNull().default(10), // 10% default
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

export const referralEarnings = mysqlTable("referral_earnings", {
  id: int("id").autoincrement().primaryKey(),
  referralId: int("referralId").notNull(),
  tradeId: int("tradeId").notNull(),
  earningAmount: decimal("earningAmount", { precision: 36, scale: 18 }).notNull(),
  earningPercentage: int("earningPercentage").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type InsertReferralEarning = typeof referralEarnings.$inferInsert;

export const userHoldings = mysqlTable("user_holdings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenId: int("tokenId").notNull(),
  balance: decimal("balance", { precision: 36, scale: 18 }).notNull().default("0"),
  valueUSD: decimal("valueUSD", { precision: 36, scale: 18 }).notNull().default("0"),
  averageBuyPrice: decimal("averageBuyPrice", { precision: 36, scale: 18 }).notNull().default("0"),
  totalSpent: decimal("totalSpent", { precision: 36, scale: 18 }).notNull().default("0"),
  totalSold: decimal("totalSold", { precision: 36, scale: 18 }).notNull().default("0"),
  unrealizedGain: decimal("unrealizedGain", { precision: 36, scale: 18 }).notNull().default("0"),
  unrealizedGainPercent: decimal("unrealizedGainPercent", { precision: 36, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserHolding = typeof userHoldings.$inferSelect;
export type InsertUserHolding = typeof userHoldings.$inferInsert;
