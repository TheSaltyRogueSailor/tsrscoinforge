# TSRS Coin .Forge - Token Creation Platform

**Create Coins. Ride Momentum. Own the Curve.**

A multi-chain token launch platform built for speed, hype, and early advantage. Create SPL tokens on Solana with accelerated bonding curves.

## 🏗️ Architecture Overview

This is a **full-stack Web3 application** with:

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend**: Express.js + tRPC + Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Blockchain**: Solana (SPL token creation)
- **Wallet**: Phantom wallet integration (Solana)
- **Authentication**: Wallet-based (no OAuth)

### Tech Stack

```
Frontend:
- React 19.2.1
- TypeScript 5.9.3
- Vite 7.1.7
- Tailwind CSS 4.1.14
- shadcn/ui components
- Solana Web3.js
- Phantom Wallet Adapter

Backend:
- Express 4.21.2
- tRPC 11.6.0
- Drizzle ORM 0.44.5
- MySQL2 3.15.0
- Node.js (ES modules)

Build Tools:
- esbuild 0.25.0
- tsx 4.19.1
- Vitest 2.1.4
```

## 📁 Project Structure

```
tsrs-coin-creator/
├── client/                          # Frontend (React/Vite)
│   ├── index.html                   # Entry HTML
│   ├── src/
│   │   ├── main.tsx                 # App entry point with polyfills
│   │   ├── App.tsx                  # Route definitions
│   │   ├── index.css                # Global styles
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.tsx             # Landing page
│   │   │   ├── CreateToken.tsx      # Token creation form
│   │   │   ├── AdminDashboard.tsx   # Admin panel
│   │   │   ├── TokenDetail.tsx      # Token details
│   │   │   ├── Leaderboard.tsx      # Trending tokens
│   │   │   ├── Profile.tsx          # User profile
│   │   │   └── ...
│   │   ├── components/              # Reusable components
│   │   │   ├── SolanaWalletButton.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useWalletUser.ts     # Wallet authentication
│   │   │   ├── useSolanaWallet.ts
│   │   │   └── ...
│   │   ├── lib/                     # Utilities
│   │   │   ├── trpc.ts              # tRPC client
│   │   │   ├── splTokenCreation.ts  # Solana token creation
│   │   │   ├── adminWallets.ts      # Admin wallet checking
│   │   │   ├── walletStorage.ts     # localStorage management
│   │   │   └── ...
│   │   └── contexts/                # React contexts
│   └── public/                      # Static assets
│
├── server/                          # Backend (Express/tRPC)
│   ├── _core/
│   │   ├── index.ts                 # Express server entry
│   │   ├── context.ts               # tRPC context
│   │   ├── llm.ts                   # LLM integration
│   │   ├── voiceTranscription.ts    # Voice API
│   │   ├── imageGeneration.ts       # Image API
│   │   ├── env.ts                   # Environment variables
│   │   └── ...
│   ├── routers.ts                   # tRPC procedure definitions
│   ├── db.ts                        # Database queries
│   ├── auth.logout.test.ts          # Tests
│   ├── wallet.ts                    # Wallet utilities
│   ├── splTokenDeployment.ts        # Token deployment logic
│   └── ...
│
├── drizzle/                         # Database schema
│   ├── schema.ts                    # Table definitions
│   └── migrations/                  # SQL migrations
│
├── shared/                          # Shared types
│   ├── types.ts                     # TypeScript types
│   └── const.ts                     # Constants
│
├── storage/                         # S3 helpers
│   └── index.ts                     # File upload utilities
│
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite config
├── vitest.config.ts                 # Test config
├── tailwind.config.ts               # Tailwind config
└── .env.example                     # Environment template
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (or 20+)
- pnpm 10.4.1+
- MySQL 8.0+ or compatible database (TiDB, MariaDB)
- Solana devnet/testnet RPC endpoint
- Phantom wallet (for testing)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd tsrs-coin-creator

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Update .env.local with your values (see Environment Variables section)

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173` (frontend) and backend at `http://localhost:3000`.

## 🔧 Environment Variables

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/tsrs_coin

# Solana
SOLANA_NETWORK=devnet
SOLANA_VAULT_ADDRESS=<your-vault-wallet-address>

# Phantom Wallet (for OAuth - currently disabled)
VITE_APP_ID=<your-app-id>
VITE_OAUTH_PORTAL_URL=https://api.manus.im

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=<your-website-id>

# Admin wallet addresses (comma-separated)
ADMIN_WALLETS=9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8

# S3 Storage (if using file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_S3_BUCKET=<your-bucket>

# LLM Integration (optional)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=<your-api-key>
```

## 🏗️ Build & Deployment

### Development

```bash
# Start dev server with hot reload
pnpm dev

# Run tests
pnpm test

# Type check
pnpm check

# Format code
pnpm format
```

### Production Build

```bash
# Build frontend and backend
pnpm build

# Start production server
pnpm start
```

This creates:
- `dist/` - Compiled backend
- `client/dist/` - Built frontend

### Deployment Options

#### Option 1: Node.js Server (Recommended for Backend)

```bash
# Build the project
pnpm build

# Deploy dist/ folder to your server
# Set environment variables on your server
# Run: node dist/index.js
```

Suitable for:
- Railway
- Render
- Heroku
- AWS EC2
- DigitalOcean

#### Option 2: Vercel (Frontend Only)

The frontend can be deployed to Vercel as a static site:

```bash
# Build frontend only
pnpm build

# Deploy client/dist to Vercel
```

Then point backend API calls to your Node.js server.

#### Option 3: Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

#### Option 4: GitHub Pages (Static Frontend Only)

Not recommended for this app since it requires a backend server.

## 🔐 Authentication

**Wallet-Based Authentication (No OAuth)**

- Users connect their Phantom wallet
- Wallet address becomes user identity
- Stored in localStorage with session management
- Admin access via wallet whitelist (ADMIN_WALLETS env var)

### Admin Wallets

Edit `ADMIN_WALLETS` environment variable to grant admin access:

```env
ADMIN_WALLETS=9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8,<other-wallet-address>
```

## 💾 Database

### Schema

Key tables:
- `users` - User profiles (wallet-based)
- `tokens` - Created tokens
- `transactions` - Token creation transactions
- `leaderboard_entries` - Trending tokens

### Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate
```

See `drizzle/schema.ts` for full schema.

## 🌐 API Routes

All API routes are under `/api/trpc`:

### Public Procedures
- `tokens.list` - Get all tokens
- `tokens.getById` - Get token details
- `leaderboard.getTrending` - Get trending tokens

### Protected Procedures (Require Wallet Connection)
- `tokens.create` - Create new token
- `profile.get` - Get user profile
- `profile.update` - Update profile

### Admin Procedures (Admin Wallet Only)
- `admin.getDashboard` - Admin dashboard data
- `admin.getAnalytics` - Platform analytics

## 🔗 Solana Integration

### Token Creation Flow

1. User connects Phantom wallet
2. Fills token creation form (name, symbol, supply, etc.)
3. Clicks "Create Token"
4. Frontend calls backend `tokens.create` procedure
5. Backend:
   - Validates token parameters
   - Creates SPL token on Solana
   - Initializes token account
   - Creates bonding curve
6. Phantom prompts user to sign 3 transactions
7. Token deployed on-chain
8. Token details stored in database

### Supported Networks

- Solana Devnet (for testing)
- Solana Testnet
- Solana Mainnet (production)

Configure via `SOLANA_NETWORK` environment variable.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/wallet.test.ts

# Watch mode
pnpm test --watch
```

Test files:
- `server/*.test.ts` - Backend tests
- `client/src/**/*.test.ts` - Frontend tests

## 📦 Key Dependencies

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **@solana/web3.js** - Solana blockchain
- **@solana/wallet-adapter-react** - Wallet integration
- **@trpc/react-query** - API client
- **wouter** - Routing

### Backend
- **Express** - Web server
- **tRPC** - Type-safe API
- **Drizzle ORM** - Database
- **MySQL2** - Database driver
- **@solana/web3.js** - Solana blockchain

## 🐛 Troubleshooting

### "Buffer is not defined" Error

The Buffer polyfill is already included in `client/src/main.tsx`. If you see this error:

```typescript
// Already in main.tsx
import { Buffer } from "buffer";
window.Buffer = Buffer;
window.process = window.process || { env: {} };
```

### Phantom Wallet Not Connecting

1. Ensure Phantom extension is installed
2. Check browser console for errors
3. Verify you're on the correct Solana network
4. Try disconnecting and reconnecting wallet

### Database Connection Error

```bash
# Check DATABASE_URL format
# Should be: mysql://user:password@host:port/database

# Test connection
mysql -u user -p -h host database_name
```

### Build Fails

```bash
# Clear cache and rebuild
rm -rf dist node_modules
pnpm install
pnpm build
```

## 📄 License

MIT

## 🤝 Support

For issues or questions:
1. Check `.env.example` for required variables
2. Review server logs: `tail -f .manus-logs/devserver.log`
3. Check browser console for client errors
4. Verify database connection

## 📚 Additional Resources

- [Solana Documentation](https://docs.solana.com)
- [Phantom Wallet Docs](https://docs.phantom.app)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [React Documentation](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)

---

**Built with Manus** - Deploy your Web3 apps with confidence.
