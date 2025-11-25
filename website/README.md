````markdown
# Realtime Pinot - Fraud Detection Dashboard

A modern fraud detection dashboard built with Next.js, integrating with Apache Pinot for real-time transaction analytics.

## Features

- 🔍 **Real-time Transaction Analysis**: Input credit card transaction details for instant fraud scoring
- 📊 **Apache Pinot Integration**: Configurable connection to Pinot instance for advanced analytics
- 🎯 **Risk Assessment**: Multi-factor fraud scoring with confidence levels based on real transaction patterns
- 📈 **Interactive Dashboard**: Monitor fraud metrics, risk factors, and transaction trends
- 🔐 **Authentication System**: Secure login/register system for internal fraud analysis team
- 📱 **Responsive Design**: Modern UI built with TailwindCSS and ShadcnUI

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Apache Pinot instance (optional - will use mock data if unavailable)

### Installation

1. **Clone and install dependencies:**

```bash
cd website
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. **Configure environment variables:**

Copy the environment template and configure your settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the following variables:

### Environment Configuration

#### Required Variables
```env
# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Authentication (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

#### Apache Pinot Configuration
```env
# Pinot broker URL for SQL queries (required for real analytics)
NEXT_PUBLIC_PINOT_BROKER_URL=http://localhost:8099

# Pinot controller URL for management operations
NEXT_PUBLIC_PINOT_CONTROLLER_URL=http://localhost:9000

# Connection settings (optional - uses defaults if not specified)
NEXT_PUBLIC_PINOT_TIMEOUT=10000
NEXT_PUBLIC_PINOT_QUERY_PATH=/query/sql
NEXT_PUBLIC_PINOT_HEALTH_PATH=/health
```

#### Optional Configuration
```env
# Feature flags
NEXT_PUBLIC_ENABLE_REAL_TIME_FEATURES=true

# Development settings
DEBUG=false
NEXT_PUBLIC_DEBUG=false

# Caching
CACHE_TTL=300
ENABLE_REDIS_CACHE=false
ENABLE_MEMORY_CACHE=true
```

3. **Start the development server:**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Pinot Setup

#### Option 1: Use Existing Pinot Instance
If you have an existing Pinot instance:

1. Update the environment variables in `.env.local`:
```env
NEXT_PUBLIC_PINOT_BROKER_URL=http://your-pinot-host:8099
NEXT_PUBLIC_PINOT_CONTROLLER_URL=http://your-pinot-host:9000
```

2. Ensure your Pinot instance has the required `transactions` table with fraud detection data.

#### Option 2: Local Pinot Setup
To set up a local Pinot instance, see the main project documentation in the parent directory.

#### Option 3: Demo Mode
If no Pinot instance is available, the application will automatically fall back to using mock data for demonstration purposes.

## Architecture

This project follows **MVVM (Model-View-ViewModel)** architecture with **Atomic Design** principles:

- **Components**: Organized in atoms, molecules, and organisms
- **Services**: External API communication (Pinot, WebSocket)
- **ViewModels**: State management with Zustand
- **Contexts**: Application-wide state and theme management
- **Hooks**: Reusable logic (authentication, WebSocket connections)

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS + ShadcnUI + RadixUI
- **State Management**: Zustand + React Context
- **Charts**: Recharts
- **Authentication**: JWT + React Context
- **Real-time**: WebSocket integration
- **Analytics**: Apache Pinot integration

## Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Type checking
npm run type-check
```

### File Structure

```
src/
├── components/           # UI components (Atomic Design)
│   ├── atoms/           # Basic UI elements
│   ├── molecules/       # Simple component groups
│   └── organisms/       # Complex components
├── contexts/            # React contexts
├── hooks/              # Custom React hooks
├── services/           # External service clients
│   └── pinot-client.ts # Apache Pinot integration
├── viewmodels/         # MVVM state management
└── utils/              # Utility functions
```

## Configuration Details

### Pinot Client Configuration

The Pinot client automatically configures itself based on environment variables:

```typescript
// Default configuration
const config = {
  brokerUrl: process.env.NEXT_PUBLIC_PINOT_BROKER_URL || 'http://localhost:8099',
  controllerUrl: process.env.NEXT_PUBLIC_PINOT_CONTROLLER_URL || 'http://localhost:9000',
  timeout: parseInt(process.env.NEXT_PUBLIC_PINOT_TIMEOUT || '10000', 10),
  queryPath: process.env.NEXT_PUBLIC_PINOT_QUERY_PATH || '/query/sql',
  healthPath: process.env.NEXT_PUBLIC_PINOT_HEALTH_PATH || '/health'
};
```

### Error Handling

The application gracefully handles Pinot connectivity issues:
- Automatic fallback to mock data when Pinot is unavailable
- Connection timeout handling
- Development vs production error logging

## Production Deployment

### Environment Variables for Production

1. **Security**: Generate a strong JWT secret:
```env
JWT_SECRET=$(openssl rand -hex 32)
```

2. **Pinot Connection**: Update to your production Pinot instance:
```env
NEXT_PUBLIC_PINOT_BROKER_URL=https://your-production-pinot-broker:8099
NEXT_PUBLIC_PINOT_CONTROLLER_URL=https://your-production-pinot-controller:9000
```

3. **URLs**: Update application URLs:
```env
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

### Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Deploy on Vercel

The easiest way to deploy is using [Vercel Platform](https://vercel.com/new):

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

For other deployment platforms, check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the realtime-pipeline-kafka-pinot repository. See the main project license for details.
````
