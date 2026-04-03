import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Comment,
  InsertComment,
  InsertToken,
  InsertTrade,
  InsertUser,
  InsertUserHolding,
  PriceHistory,
  Token,
  Trade,
  User,
  UserHolding,
  comments,
  priceHistory,
  tokens,
  trades,
  userHoldings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserWallet(
  userId: number,
  walletAddress: string,
  walletChain: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ walletAddress, walletChain }).where(eq(users.id, userId));
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function createToken(data: InsertToken): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tokens).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getTokenById(id: number): Promise<Token | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tokens).where(eq(tokens.id, id)).limit(1);
  return result[0];
}

export async function listTokens(opts: {
  blockchain?: string;
  search?: string;
  sortBy?: "createdAt" | "marketCap" | "volume" | "price";
  limit?: number;
  offset?: number;
}): Promise<Token[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts.blockchain && opts.blockchain !== "all") {
    conditions.push(eq(tokens.blockchain, opts.blockchain));
  }
  if (opts.search) {
    conditions.push(
      or(
        like(tokens.name, `%${opts.search}%`),
        like(tokens.symbol, `%${opts.search}%`)
      )
    );
  }

  const sortColumn =
    opts.sortBy === "marketCap"
      ? tokens.marketCapUSD
      : opts.sortBy === "volume"
      ? tokens.totalVolumeUSD
      : opts.sortBy === "price"
      ? tokens.currentPriceUSD
      : tokens.createdAt;

  const query = db
    .select()
    .from(tokens)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sortColumn))
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);

  return query;
}

export async function getTokensByCreator(creatorId: number): Promise<Token[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tokens).where(eq(tokens.creatorId, creatorId)).orderBy(desc(tokens.createdAt));
}

export async function updateTokenStats(
  tokenId: number,
  updates: {
    circulatingSupply?: number;
    reserveBalance?: string;
    currentPriceUSD?: string;
    marketCapUSD?: string;
    volume24hUSD?: string;
    totalVolumeUSD?: string;
    holderCount?: number;
    tradeCount?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(tokens).set(updates).where(eq(tokens.id, tokenId));
}

export async function countTokens(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(tokens);
  return result[0]?.count ?? 0;
}

// ─── Trade helpers ────────────────────────────────────────────────────────────

export async function createTrade(data: InsertTrade): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trades).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getTradesByToken(tokenId: number, limit = 50): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trades)
    .where(eq(trades.tokenId, tokenId))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getTradesByUser(userId: number, limit = 50): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

// ─── Comment helpers ──────────────────────────────────────────────────────────

export async function createComment(data: InsertComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getCommentsByToken(tokenId: number): Promise<Comment[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(comments)
    .where(eq(comments.tokenId, tokenId))
    .orderBy(desc(comments.createdAt))
    .limit(100);
}

export async function deleteComment(commentId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(and(eq(comments.id, commentId), eq(comments.userId, userId)));
}

// ─── Price history helpers ────────────────────────────────────────────────────

export async function addPriceHistory(data: {
  tokenId: number;
  priceUSD: string;
  volumeUSD: string;
  marketCapUSD: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(priceHistory).values(data);
}

export async function getPriceHistory(tokenId: number, limit = 100): Promise<PriceHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.tokenId, tokenId))
    .orderBy(desc(priceHistory.timestamp))
    .limit(limit);
}

// ─── Referral helpers ─────────────────────────────────────────────────────────

import { Referral, InsertReferral, ReferralEarning, InsertReferralEarning, referrals, referralEarnings } from "../drizzle/schema";

export async function createReferral(data: InsertReferral): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(referrals).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getReferralByCode(code: string): Promise<Referral | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(referrals).where(eq(referrals.referralCode, code)).limit(1);
  return result[0];
}

export async function getReferralsByReferrer(referrerId: number): Promise<Referral[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, referrerId))
    .orderBy(desc(referrals.createdAt));
}

export async function updateReferralEarnings(
  referralId: number,
  earningAmount: string,
  rewardPercentage: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Update total earnings in referrals table
  const referral = await db.select().from(referrals).where(eq(referrals.id, referralId)).limit(1);
  if (referral[0]) {
    const currentEarnings = referral[0].totalEarnings || "0";
    const newEarnings = (parseFloat(currentEarnings) + parseFloat(earningAmount)).toString();
    await db.update(referrals).set({ totalEarnings: newEarnings }).where(eq(referrals.id, referralId));
  }
}

export async function addReferralEarning(data: InsertReferralEarning): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(referralEarnings).values(data);
}

export async function getReferralEarnings(referralId: number): Promise<ReferralEarning[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(referralEarnings)
    .where(eq(referralEarnings.referralId, referralId))
    .orderBy(desc(referralEarnings.createdAt));
}


// ─── User Holdings helpers ───────────────────────────────────────────────────

export async function getUserHoldings(userId: number): Promise<UserHolding[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userHoldings)
    .where(eq(userHoldings.userId, userId))
    .orderBy(desc(userHoldings.valueUSD));
}

export async function getUserHolding(userId: number, tokenId: number): Promise<UserHolding | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(userHoldings)
    .where(and(eq(userHoldings.userId, userId), eq(userHoldings.tokenId, tokenId)))
    .limit(1);
  return result[0] || null;
}

export async function updateUserHolding(data: Partial<UserHolding> & { userId: number; tokenId: number }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getUserHolding(data.userId, data.tokenId);
  if (existing) {
    await db
      .update(userHoldings)
      .set({
        balance: data.balance ?? existing.balance,
        valueUSD: data.valueUSD ?? existing.valueUSD,
        averageBuyPrice: data.averageBuyPrice ?? existing.averageBuyPrice,
        totalSpent: data.totalSpent ?? existing.totalSpent,
        totalSold: data.totalSold ?? existing.totalSold,
        unrealizedGain: data.unrealizedGain ?? existing.unrealizedGain,
        unrealizedGainPercent: data.unrealizedGainPercent ?? existing.unrealizedGainPercent,
        updatedAt: new Date(),
      })
      .where(and(eq(userHoldings.userId, data.userId), eq(userHoldings.tokenId, data.tokenId)));
  } else {
    await db.insert(userHoldings).values({
      userId: data.userId,
      tokenId: data.tokenId,
      balance: data.balance ?? "0",
      valueUSD: data.valueUSD ?? "0",
      averageBuyPrice: data.averageBuyPrice ?? "0",
      totalSpent: data.totalSpent ?? "0",
      totalSold: data.totalSold ?? "0",
      unrealizedGain: data.unrealizedGain ?? "0",
      unrealizedGainPercent: data.unrealizedGainPercent ?? "0",
    } as InsertUserHolding);
  }
}

export async function deleteUserHolding(userId: number, tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(userHoldings)
    .where(and(eq(userHoldings.userId, userId), eq(userHoldings.tokenId, tokenId)));
}

export async function getTokenHolders(tokenId: number): Promise<UserHolding[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userHoldings)
    .where(and(eq(userHoldings.tokenId, tokenId), sql`balance > 0`))
    .orderBy(desc(userHoldings.balance));
}

export async function getPortfolioStats(userId: number): Promise<{
  totalValue: number;
  totalInvested: number;
  totalRealized: number;
  totalUnrealized: number;
  holdingCount: number;
}> {
  const holdings = await getUserHoldings(userId);
  
  return {
    totalValue: holdings.reduce((sum, h) => sum + parseFloat(h.valueUSD || "0"), 0),
    totalInvested: holdings.reduce((sum, h) => sum + parseFloat(h.totalSpent || "0"), 0),
    totalRealized: holdings.reduce((sum, h) => sum + parseFloat(h.totalSold || "0"), 0),
    totalUnrealized: holdings.reduce((sum, h) => sum + parseFloat(h.unrealizedGain || "0"), 0),
    holdingCount: holdings.length,
  };
}
