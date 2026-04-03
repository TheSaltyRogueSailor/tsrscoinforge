# TSRS Coin .Forge - Architecture Documentation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                   │
│  - Pages: Home, CreateToken, AdminDashboard, Leaderboard   │
│  - Components: UI library, Wallet button, Forms             │
│  - Hooks: useWalletUser, useSolanaWallet, custom hooks      │
│  - State: localStorage (wallet address, session)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/tRPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Express/tRPC)                      │
│  - API Routes: /api/trpc/* (tRPC endpoints)                 │
│  - Procedures: tokens.*, admin.*, profile.*                 │
│  - Middleware: Auth, validation, error handling             │
│  - Services: Solana, database, LLM, storage                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (MySQL)                           │
│  - Tables: users, tokens, transactions, leaderboard         │
│  - Drizzle ORM: Type-safe queries                           │
│  - Migrations: Schema versioning                            │
└─────────────────────────────────────────────────────────────┘
                           │ RPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              BLOCKCHAIN (Solana)                            │
│  - Token Creation: SPL token deployment                     │
│  - Transactions: Signed by user wallet                      │
│  - Network: devnet/testnet/mainnet                          │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 API Architecture

### tRPC Procedures

All API calls use tRPC (type-safe RPC). No REST endpoints.

#### Public Procedures (No Auth Required)
```typescript
// Accessible without wallet connection
trpc.tokens.list.useQuery()
trpc.tokens.getById.useQuery({ id })
trpc.leaderboard.getTrending.useQuery()
```

#### Protected Procedures (Wallet Required)
```typescript
// Requires connected wallet
trpc.tokens.create.useMutation()
trpc.profile.get.useQuery()
trpc.profile.update.useMutation()
```

#### Admin Procedures (Admin Wallet Only)
```typescript
// Requires admin wallet address
trpc.admin.getDashboard.useQuery()
trpc.admin.getAnalytics.useQuery()
```

### API Endpoint Structure

```
POST /api/trpc/[procedure]
Content-Type: application/json

Request:
{
  "0": {
    "json": { /* procedure input */ }
  }
}

Response:
{
  "result": {
    "data": { /* procedure output */ }
  }
}
```

## 🗄️ Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  profile_image_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `tokens`
```sql
CREATE TABLE tokens (
  id VARCHAR(255) PRIMARY KEY,
  mint_address VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  description TEXT,
  logo_url TEXT,
  creator_address VARCHAR(255) NOT NULL,
  total_supply BIGINT NOT NULL,
  decimals INT DEFAULT 9,
  bonding_curve_address VARCHAR(255),
  transaction_hash VARCHAR(255),
  status ENUM('pending', 'deployed', 'failed'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_address) REFERENCES users(wallet_address),
  INDEX idx_creator (creator_address),
  INDEX idx_created_at (created_at DESC)
);
```

#### `transactions`
```sql
CREATE TABLE transactions (
  id VARCHAR(255) PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL,
  transaction_hash VARCHAR(255) UNIQUE NOT NULL,
  transaction_type ENUM('create_mint', 'create_account', 'mint_supply'),
  status ENUM('pending', 'confirmed', 'failed'),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES tokens(id),
  INDEX idx_token_id (token_id),
  INDEX idx_hash (transaction_hash)
);
```

#### `leaderboard_entries`
```sql
CREATE TABLE leaderboard_entries (
  id VARCHAR(255) PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL,
  rank INT,
  volume_24h DECIMAL(20, 8),
  holders INT,
  market_cap DECIMAL(20, 8),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES tokens(id),
  INDEX idx_rank (rank),
  INDEX idx_updated_at (updated_at DESC)
);
```

## 🔐 Authentication Flow

### Wallet-Based Authentication (No OAuth)

```
1. User visits app
   ↓
2. Frontend detects Phantom wallet
   ↓
3. User clicks "Connect Phantom"
   ↓
4. Phantom prompts user to connect
   ↓
5. Frontend receives wallet address
   ↓
6. Frontend stores in localStorage:
   {
     walletAddress: "9kkj...",
     connectedAt: timestamp,
     network: "devnet"
   }
   ↓
7. Frontend includes wallet in API calls
   ↓
8. Backend verifies wallet (no signature verification needed)
   ↓
9. User authenticated
```

### Admin Access Check

```
1. Frontend gets wallet address
   ↓
2. Checks if wallet in ADMIN_WALLETS env var
   ↓
3. If match → Show admin button
   ↓
4. User clicks admin button
   ↓
5. Frontend calls trpc.admin.* procedures
   ↓
6. Backend verifies wallet is in admin list
   ↓
7. If authorized → Return admin data
   ↓
8. If not authorized → Return 403 Forbidden
```

## 🔄 Token Creation Flow

```
Frontend                          Backend                    Blockchain
─────────────────────────────────────────────────────────────────────────

User fills form
    │
    ├─ Token name
    ├─ Symbol
    ├─ Total supply
    └─ Decimals
    │
    ▼
User clicks "Create Token"
    │
    ├─ Validate form
    ├─ Check wallet connected
    └─ Call trpc.tokens.create()
    │
    ├────────────────────────────────────────────────────────────────────►
                                Backend validates:
                                ├─ Wallet address
                                ├─ Token parameters
                                └─ User permissions
                                    │
                                    ▼
                                Create SPL token
                                    │
                                    ├─ Generate keypair
                                    ├─ Create mint account
                                    ├─ Initialize token
                                    └─ Create ATA
                                    │
                                    ▼
                                Build 3 transactions:
                                ├─ Create mint
                                ├─ Create token account
                                └─ Mint supply
                                    │
                                    ▼
                                Return transactions to sign
    │
    ◄────────────────────────────────────────────────────────────────────
    │
    ▼
Frontend receives transactions
    │
    ├─ Show to user
    └─ Call Phantom to sign
    │
    ▼
Phantom prompts user
    │
    ├─ "Approve transaction 1/3"
    ├─ "Approve transaction 2/3"
    └─ "Approve transaction 3/3"
    │
    ▼
User signs all 3 transactions
    │
    ├──────────────────────────────────────────────────────────────────────►
                                                                Backend:
                                                                ├─ Receive signed txs
                                                                ├─ Submit to Solana
                                                                ├─ Wait for confirmation
                                                                └─ Store in database
                                                                    │
                                                                    ▼
                                                                Solana:
                                                                ├─ Validate signatures
                                                                ├─ Execute transactions
                                                                ├─ Create token on-chain
                                                                └─ Return tx hash
    │
    ◄──────────────────────────────────────────────────────────────────────
    │
    ▼
Frontend receives confirmation
    │
    ├─ Show success message
    ├─ Display token details
    └─ Redirect to token page
```

## 🔌 Backend API Routes

### tRPC Router Structure

```typescript
// server/routers.ts
export const appRouter = router({
  // Public procedures
  tokens: router({
    list: publicProcedure.query(),
    getById: publicProcedure.input(z.object({ id: z.string() })).query(),
  }),
  
  leaderboard: router({
    getTrending: publicProcedure.query(),
  }),
  
  // Protected procedures
  profile: router({
    get: protectedProcedure.query(),
    update: protectedProcedure.input(profileSchema).mutation(),
  }),
  
  tokens: router({
    create: protectedProcedure
      .input(createTokenSchema)
      .mutation(),
  }),
  
  // Admin procedures
  admin: router({
    getDashboard: adminProcedure.query(),
    getAnalytics: adminProcedure.query(),
  }),
});
```

## 🌐 Frontend State Management

### Global State (localStorage)

```typescript
// Wallet session
{
  walletAddress: "9kkj...",
  connectedAt: 1712150400000,
  network: "devnet",
  isAdmin: true
}

// User profile (cached)
{
  username: "user123",
  profileImage: "https://...",
  bio: "..."
}
```

### Component State (React Hooks)

```typescript
// useWalletUser hook
{
  walletAddress: string | null,
  shortAddress: string,
  isConnected: boolean,
  isAdmin: boolean,
  network: string
}

// useWallet hook (Solana adapter)
{
  publicKey: PublicKey | null,
  connected: boolean,
  connecting: boolean,
  disconnecting: boolean,
  select: (walletName) => void,
  connect: () => Promise<void>,
  disconnect: () => Promise<void>,
  sendTransaction: (tx) => Promise<string>
}
```

## 🔗 Environment Variables

### Frontend (Exposed via VITE_)
```env
VITE_APP_TITLE=TSRS Coin .Forge
VITE_APP_LOGO=https://...
VITE_APP_ID=app-id
VITE_OAUTH_PORTAL_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=key
VITE_ANALYTICS_ENDPOINT=https://...
VITE_ANALYTICS_WEBSITE_ID=id
```

### Backend (Server-side only)
```env
DATABASE_URL=mysql://...
SOLANA_NETWORK=devnet
SOLANA_VAULT_ADDRESS=...
ADMIN_WALLETS=address1,address2
JWT_SECRET=...
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=key
OWNER_NAME=...
OWNER_OPEN_ID=...
```

## 🚀 Deployment Architecture

### Development
```
localhost:5173 (Frontend Vite Dev Server)
    ↓ (proxy)
localhost:3000 (Backend Express)
    ↓ (SQL)
localhost:3306 (MySQL)
```

### Production
```
https://your-domain.com (Frontend - Static files)
    ↓ (API calls)
https://api.your-domain.com (Backend - Node.js)
    ↓ (SQL)
Managed MySQL (AWS RDS, Google Cloud SQL, TiDB)
    ↓ (RPC)
Solana RPC Endpoint
```

## 📊 Performance Considerations

### Frontend Optimization
- Code splitting by route
- Lazy loading components
- Image optimization
- CSS-in-JS caching
- React query caching

### Backend Optimization
- Database connection pooling
- Query optimization with indexes
- Response caching
- Gzip compression
- Rate limiting

### Database Optimization
- Indexes on frequently queried columns
- Partitioning for large tables
- Query result caching
- Connection pooling (ProxySQL)

## 🔒 Security Architecture

### Input Validation
- All inputs validated with Zod schemas
- tRPC validates at procedure level
- Database constraints enforce data integrity

### Authentication
- Wallet address as user identity
- No password storage
- Session via localStorage
- Admin wallet whitelist

### Authorization
- Public procedures: No auth required
- Protected procedures: Wallet required
- Admin procedures: Admin wallet required

### Data Protection
- HTTPS/TLS for all communications
- Secrets in environment variables
- No sensitive data in localStorage
- SQL injection prevention via ORM

## 🧪 Testing Architecture

### Test Files
```
server/
├── wallet.test.ts          # Wallet utilities
├── auth.logout.test.ts     # Authentication
├── transactionSigner.test.ts # Transaction signing
└── ...

client/src/
├── lib/adminWallets.test.ts
├── hooks/useWalletUser.test.ts
└── ...
```

### Test Framework
- Vitest for unit tests
- Mock Solana RPC calls
- Mock database queries
- 96 tests total

## 📈 Scalability

### Horizontal Scaling
- Stateless backend (can run multiple instances)
- Load balancer in front
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching layer (Redis)
- Use connection pooling

### Database Scaling
- Sharding by user/token
- Read replicas
- Managed database service
- Backup strategy

---

**For deployment instructions, see DEPLOYMENT.md**
