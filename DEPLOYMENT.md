# TSRS Coin .Forge - Deployment Guide

Complete guide for deploying TSRS Coin Forge to production.

## 🚀 Deployment Overview

This is a **full-stack Node.js application** that requires:

1. **Frontend** (React/Vite) - Static files or served by Express
2. **Backend** (Express/tRPC) - Node.js server
3. **Database** (MySQL) - Persistent data storage
4. **Solana RPC** - Blockchain interaction

## 📋 Pre-Deployment Checklist

- [ ] Database set up and migrated
- [ ] Environment variables configured
- [ ] Admin wallets configured
- [ ] Solana network selected (devnet/testnet/mainnet)
- [ ] Build tested locally (`pnpm build`)
- [ ] Tests passing (`pnpm test`)
- [ ] Domain/SSL certificate ready
- [ ] Backup strategy in place

## 🌐 Deployment Options

### Option 1: Railway (Recommended)

Railway provides the easiest deployment with built-in database support.

#### Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/tsrs-coin-forge
   git push -u origin main
   ```

2. **Connect to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Choose your repository
   - Railway auto-detects Node.js

3. **Configure Environment**
   - Go to Variables tab
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

4. **Add MySQL Database**
   - Click "Add Service"
   - Select "MySQL"
   - Railway creates `DATABASE_URL` automatically

5. **Deploy**
   - Railway auto-deploys on git push
   - View logs in Railway dashboard

#### Build Command
```
pnpm install && pnpm build
```

#### Start Command
```
pnpm start
```

#### Port
Railway exposes port from `process.env.PORT` (default 3000)

### Option 2: Render

Render provides free tier with limitations.

#### Steps:

1. **Push to GitHub** (same as Railway)

2. **Create Web Service**
   - Go to https://render.com
   - Click "New +"
   - Select "Web Service"
   - Connect GitHub repository

3. **Configure**
   - **Name**: tsrs-coin-forge
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Standard ($7/month minimum)

4. **Add Environment Variables**
   - Go to Environment tab
   - Add all variables from `.env.example`

5. **Add MySQL Database**
   - Create separate MySQL service on Render
   - Get connection string
   - Add as `DATABASE_URL`

6. **Deploy**
   - Render auto-deploys on git push

### Option 3: Vercel (Frontend Only)

**Note**: Vercel is designed for serverless functions. For this full-stack app, only deploy the frontend.

#### Frontend Only:

1. **Configure Vite for Vercel**
   ```bash
   # Create vercel.json
   ```

2. **Deploy Frontend**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **Backend Separately**
   - Deploy backend to Railway/Render/AWS
   - Update frontend API endpoint to backend URL

### Option 4: Docker + Any Cloud

Deploy using Docker container.

#### Create Dockerfile:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server
CMD ["pnpm", "start"]
```

#### Build and Push:

```bash
# Build image
docker build -t tsrs-coin-forge:latest .

# Tag for registry
docker tag tsrs-coin-forge:latest your-registry/tsrs-coin-forge:latest

# Push to registry
docker push your-registry/tsrs-coin-forge:latest
```

#### Deploy to:
- **AWS ECS** - Container orchestration
- **Google Cloud Run** - Serverless containers
- **DigitalOcean App Platform** - Simple deployment
- **Heroku** - Container registry support

### Option 5: AWS EC2

For full control and scalability.

#### Steps:

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.small or larger
   - Security group: Allow ports 80, 443, 3000

2. **Install Dependencies**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nodejs npm mysql-client
   sudo npm install -g pnpm
   ```

3. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/tsrs-coin-forge
   cd tsrs-coin-forge
   pnpm install
   ```

4. **Set Environment Variables**
   ```bash
   nano .env.local
   # Add all variables
   ```

5. **Build**
   ```bash
   pnpm build
   ```

6. **Setup PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start "pnpm start" --name tsrs-coin-forge
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx (Reverse Proxy)**
   ```bash
   sudo apt install -y nginx
   # Configure nginx to proxy to localhost:3000
   ```

8. **SSL Certificate (Let's Encrypt)**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d your-domain.com
   ```

## 🗄️ Database Setup

### MySQL/TiDB

#### Local Development:
```bash
# Start MySQL
mysql -u root -p

# Create database
CREATE DATABASE tsrs_coin;
CREATE USER 'tsrs'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON tsrs_coin.* TO 'tsrs'@'localhost';
FLUSH PRIVILEGES;

# Run migrations
pnpm db:push
```

#### Production:
- Use managed database (AWS RDS, Google Cloud SQL, TiDB Cloud)
- Enable automated backups
- Set up read replicas for scaling
- Use connection pooling (PgBouncer, ProxySQL)

#### Connection String Format:
```
mysql://username:password@host:port/database
```

## 🔐 Security Checklist

- [ ] Use HTTPS/SSL certificates
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Restrict database access to app server only
- [ ] Enable database backups
- [ ] Use environment variables for all secrets
- [ ] Don't commit `.env.local` to git
- [ ] Enable CORS only for your domain
- [ ] Rate limit API endpoints
- [ ] Monitor logs for errors
- [ ] Keep dependencies updated

## 📊 Performance Optimization

### Frontend
```bash
# Build with optimizations
pnpm build

# Analyze bundle
npm install -g vite-bundle-visualizer
```

### Backend
- Use connection pooling for database
- Enable caching headers
- Compress responses (gzip)
- Use CDN for static assets
- Monitor database query performance

### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_tokens_creator ON tokens(creator_address);
CREATE INDEX idx_tokens_created_at ON tokens(created_at DESC);
```

## 🔄 Continuous Deployment

### GitHub Actions Example:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install -g pnpm && pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 📈 Monitoring & Logging

### Recommended Tools:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **New Relic** - Performance monitoring
- **Datadog** - Infrastructure monitoring
- **Uptime Robot** - Uptime monitoring

### Application Logs:
```bash
# View server logs
tail -f .manus-logs/devserver.log

# View error logs
tail -f .manus-logs/browserConsole.log

# View network logs
tail -f .manus-logs/networkRequests.log
```

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check Node version
node --version  # Should be 18+

# Check dependencies
pnpm install

# Check environment variables
echo $DATABASE_URL
echo $SOLANA_NETWORK

# Run in debug mode
NODE_DEBUG=* pnpm start
```

### Database Connection Error
```bash
# Test connection
mysql -u user -p -h host database

# Check connection string format
# Should be: mysql://user:password@host:port/database
```

### Build Fails
```bash
# Clear cache
rm -rf dist node_modules pnpm-lock.yaml

# Reinstall
pnpm install

# Rebuild
pnpm build
```

### High Memory Usage
```bash
# Increase Node heap size
NODE_OPTIONS="--max-old-space-size=2048" pnpm start
```

## 📞 Support

- Check application logs
- Review environment variables
- Verify database connectivity
- Check Solana RPC endpoint status
- Review GitHub Actions logs (if using CI/CD)

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Express.js Deployment](https://expressjs.com/en/advanced/best-practice-performance.html)
- [MySQL Best Practices](https://dev.mysql.com/doc/)

---

**Happy Deploying!** 🚀
