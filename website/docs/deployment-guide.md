# Deployment Guide

## Overview

This guide covers the deployment process for the Realtime Fraud Detection Dashboard, including production setup, environment configuration, monitoring, and maintenance procedures.

## Prerequisites

### System Requirements
- **Node.js**: 18.0 or higher
- **NPM/Yarn**: Latest stable version
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 512MB RAM, recommended 1GB+
- **Storage**: 200MB available space

### External Dependencies
- **Apache Pinot**: Real-time analytics database
- **Website API**: Backend authentication service
- **SSL Certificate**: For HTTPS in production

## Environment Configuration

### Environment Variables Setup

Create a `.env.local` file in the project root:

```bash
# Copy template
cp .env.example .env.local

# Edit with production values
nano .env.local
```

### Required Environment Variables

```env
# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# External Services
NEXT_PUBLIC_PINOT_URL=https://pinot.your-domain.com

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-domain.com

# Security
ENCRYPTION_KEY=your-32-character-encryption-key

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME_FEATURES=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info

# Database (if using additional databases)
DATABASE_URL=postgresql://user:password@localhost:5432/fraud_detection

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Environment Validation

Create a script to validate environment variables:

```typescript
// scripts/validate-env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_PINOT_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
});

export function validateEnvironment() {
  try {
    envSchema.parse(process.env);
    console.log('✅ Environment validation passed');
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    process.exit(1);
  }
}
```

## Build Process

### Development Build

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Start development server
npm run dev
```

### Production Build

```bash
# Clean previous builds
rm -rf .next

# Install dependencies (production only)
npm ci --only=production

# Run full test suite
npm run test

# Build for production
npm run build

# Export static files (optional, for static hosting)
npm run export
```

### Build Optimization

#### Bundle Analysis
```bash
# Analyze bundle size
npm install --save-dev @next/bundle-analyzer

# Add to package.json scripts
"analyze": "ANALYZE=true npm run build"

# Run analysis
npm run analyze
```

#### Performance Budget
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

## Deployment Options

### Vercel (Recommended)

#### Automatic Deployment
1. **Connect Repository**
   ```bash
   # Vercel CLI
   npm i -g vercel
   vercel login
   vercel link
   ```

2. **Configure Build Settings**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm ci",
     "framework": "nextjs"
   }
   ```

3. **Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL
   vercel env add JWT_SECRET
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

#### Vercel Configuration
```javascript
// vercel.json
{
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["fra1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

### Docker Deployment

#### Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.example.com
      - NEXT_PUBLIC_PINOT_URL=https://pinot.example.com
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
```

### Traditional Server Deployment

#### PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'fraud-detection-dashboard',
    script: 'npm run start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/fraud-detection
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3000;
    }

    # Static files caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
```

## Monitoring & Observability

### Application Monitoring

#### Sentry Error Tracking
```typescript
// pages/_app.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

#### Performance Monitoring
```typescript
// lib/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric) {
  // Send to analytics service
  console.log(metric);

  // Example: Send to Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}
```

### Infrastructure Monitoring

#### Health Checks
```typescript
// pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseConnection();

    // Check external API connectivity
    const apiStatus = await checkApiConnectivity();

    // Check Pinot connectivity
    const pinotStatus = await checkPinotConnectivity();

    const isHealthy = dbStatus && apiStatus && pinotStatus;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        api: apiStatus,
        pinot: pinotStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}
```

#### Log Aggregation
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Usage
logger.info({ userId, action: 'login' }, 'User logged in successfully');
logger.error({ error, userId }, 'Login failed');
```

## Security Configuration

### HTTPS Setup
```bash
# Generate SSL certificate (Let's Encrypt)
certbot certonly --webroot -w /var/www/html -d your-domain.com

# Automatic renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

### Content Security Policy
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.your-domain.com https://pinot.your-domain.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

## Backup & Recovery

### Database Backups
```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U username -h localhost database_name > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Compress old backups
gzip $BACKUP_DIR/backup_$DATE.sql
```

### Application Backups
```bash
# Application data backup
#!/bin/bash
BACKUP_DIR="/var/backups/app"
SOURCE_DIR="/var/www/fraud-detection"

# Create backup
tar -czf $BACKUP_DIR/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C $SOURCE_DIR .

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/app_backup_*.tar.gz s3://your-backup-bucket/
```

## Scaling Strategies

### Horizontal Scaling
```javascript
// next.config.js
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  images: {
    domains: ['your-cdn.com'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};
```

### CDN Configuration
```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://cdn.your-domain.com' : '',
  images: {
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/your-account/',
  },
};
```

### Database Scaling
```typescript
// lib/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Log Rotation
```bash
# /etc/logrotate.d/fraud-detection
/var/log/fraud-detection/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### SSL Certificate Renewal
```bash
# Check certificate expiry
openssl x509 -in /etc/ssl/certs/your-domain.crt -text -noout | grep "Not After"

# Renew certificate
certbot renew

# Reload nginx
systemctl reload nginx
```

#### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Test application after updates
npm run build
npm run test

# Deploy updated version
npm run deploy
```

### Emergency Procedures

#### Application Failure
```bash
# Check application status
pm2 status

# Restart application
pm2 restart fraud-detection-dashboard

# Check logs
pm2 logs fraud-detection-dashboard --lines 100

# Rollback to previous version
pm2 stop fraud-detection-dashboard
git checkout previous-commit-hash
npm run build
pm2 start ecosystem.config.js
```

#### Database Issues
```bash
# Check database connectivity
psql -U username -d database_name -c "SELECT 1;"

# Restore from backup
pg_restore -U username -d database_name /var/backups/backup.sql

# Check data integrity
# Run data validation scripts
```

## Performance Optimization

### Runtime Optimization
```typescript
// lib/performance.ts
import dynamic from 'next/dynamic';

// Lazy load heavy components
const FraudMap = dynamic(
  () => import('@/components/organisms/fraud-map'),
  {
    loading: () => <MapSkeleton />,
    ssr: false,
  }
);

// Optimize re-renders
const TransactionList = memo(({ transactions, onSelect }) => {
  return (
    <div>
      {transactions.map(transaction => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
```

### Build Optimization
```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'zustand'],
  },
};
```

## Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm install
npm run build
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### Port Conflicts
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### SSL Issues
```bash
# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate validity
openssl x509 -in /etc/ssl/certs/cert.pem -text -noout | grep -A 2 "Validity"
```

### Monitoring Dashboards

#### Application Metrics
- Response times
- Error rates
- User sessions
- API usage

#### Infrastructure Metrics
- CPU usage
- Memory usage
- Disk space
- Network traffic

#### Business Metrics
- Fraud detection accuracy
- Transaction volume
- User engagement
- System uptime

This deployment guide ensures your fraud detection dashboard is production-ready with proper monitoring, security, and scalability configurations.
