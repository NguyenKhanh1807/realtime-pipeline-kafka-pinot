# Technology Stack

## Core Framework

### Next.js 16
- **App Router**: File-based routing with layouts and nested routes
- **Server Components**: Server-side rendering and streaming
- **API Routes**: Built-in API endpoints
- **Image Optimization**: Automatic image optimization
- **Font Optimization**: Automatic font loading and optimization

### React 19
- **Concurrent Features**: Improved performance with concurrent rendering
- **Server Components**: Zero-bundle-size components
- **Suspense**: Better loading states and error boundaries
- **Hooks**: Modern state management and side effects

### TypeScript 5
- **Strict Type Checking**: Comprehensive type safety
- **Advanced Types**: Utility types, conditional types, template literals
- **Path Mapping**: Clean imports with `@/` aliases
- **Declaration Files**: Type definitions for third-party libraries

## State Management

### Zustand 5.0.8
- **Lightweight**: Minimal API, no boilerplate
- **TypeScript**: Full TypeScript support out of the box
- **Middleware**: Built-in devtools, persistence, and logging
- **Performance**: Optimized re-renders with selectors

```typescript
interface AppState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AppActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const useAppStore = create<AppStore>((set, get) => ({
  // State and actions
}));
```

## UI & Styling

### TailwindCSS 4
- **Utility-First**: Rapid UI development with utility classes
- **Custom Design System**: Extended with custom colors and components
- **Responsive Design**: Mobile-first responsive utilities
- **Dark Mode**: Built-in dark mode support

### ShadcnUI + RadixUI
- **Accessible Components**: WCAG compliant UI primitives
- **Headless UI**: Unstyled, accessible components
- **Radix Primitives**: Low-level UI primitives for custom components
- **Consistent Design**: Unified design system across the app

```typescript
// ShadcnUI Button Component
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Data Layer

### Apache Pinot
- **Real-time Analytics**: Sub-second query latency
- **OLAP Database**: Optimized for analytical queries
- **Streaming Ingestion**: Real-time data ingestion from Kafka
- **SQL Interface**: Standard SQL queries for analytics

### WebSocket Client
- **Real-time Updates**: Live transaction feeds and fraud alerts
- **Connection Management**: Auto-reconnection and error handling
- **Event-driven**: Reactive updates based on server events

## Development Tools

### ESLint
- **Code Quality**: Static code analysis and linting
- **TypeScript**: Type-aware linting rules
- **Next.js**: Framework-specific rules
- **Prettier**: Code formatting integration

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Build & Deployment

### Next.js Build System
- **Static Generation**: SEO-friendly pre-rendered pages
- **Server-side Rendering**: Dynamic content with SSR
- **API Routes**: Serverless functions
- **Edge Runtime**: Global CDN deployment

### Environment Configuration
```env
# Application URLs
NEXT_PUBLIC_APP_URL=http://93.115.172.151:9000
NEXT_PUBLIC_API_URL=http://93.115.172.151:9000

# External Services
NEXT_PUBLIC_PINOT_URL=http://93.115.172.151:8099

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME_FEATURES=true

# Security
JWT_SECRET=your-secret-key
```

## Typography System

### Literata Font
- **Google Fonts**: Optimized loading with `next/font`
- **Multiple Weights**: 200-900 for design flexibility
- **Vietnamese Support**: Extended character set
- **Performance**: Automatic font optimization

### Font Scale
```css
.text-xs   { font-size: 0.75rem; }  /* 12px */
.text-sm   { font-size: 0.875rem; } /* 14px */
.text-base { font-size: 1rem; }     /* 16px */
.text-lg   { font-size: 1.125rem; } /* 18px */
.text-xl   { font-size: 1.25rem; }  /* 20px */
.text-2xl  { font-size: 1.5rem; }   /* 24px */
.text-3xl  { font-size: 1.875rem; } /* 30px */
.text-4xl  { font-size: 2.25rem; }  /* 36px */
.text-5xl  { font-size: 3rem; }     /* 48px */
.text-6xl  { font-size: 3.75rem; }  /* 60px */
```

## Theme System

### CSS Variables
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 217 91% 60%;
  --primary-foreground: 210 40% 98%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 222.2 84% 4.9%;
}
```

### Theme Provider
- **System Preference**: Automatic dark/light mode detection
- **LocalStorage**: User preference persistence
- **Runtime Updates**: Dynamic theme switching
- **CSS-in-JS**: Styled components with theme variables

## Data Visualization

### Recharts
- **React Charts**: Declarative chart components
- **Responsive**: Mobile-friendly responsive charts
- **Customizable**: Extensive styling and configuration options
- **Performance**: Optimized rendering for large datasets

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="hour" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="transactions" stroke="#8884d8" />
    <Line type="monotone" dataKey="frauds" stroke="#82ca9d" />
  </LineChart>
</ResponsiveContainer>
```

## API Architecture

### RESTful APIs
- **Website API**: `http://93.115.172.151:9000`
  - User authentication and management
  - Session management
  - User data operations

- **Pinot API**: `http://93.115.172.151:8099`
  - Real-time analytics queries
  - Fraud detection data
  - Transaction analysis

### API Client Architecture
```typescript
class WebsiteApiClient {
  async getUsers(): Promise<ApiResponse<{ users: Record<string, ApiUser> }>>
  async login(credentials: LoginRequest): Promise<LoginResponse>
  async healthCheck(): Promise<boolean>
}

class PinotClient {
  async query(request: PinotQueryRequest): Promise<PinotQueryResponse>
  async analyzeTransaction(data: TransactionData): Promise<FraudResult>
  async getFraudAnalytics(timeRange?: string): Promise<FraudAnalytics>
}
```

## Security Features

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: Bcrypt password hashing
- **Session Management**: Secure session handling
- **Role-Based Access**: Granular permission system

### Authorization
- **RBAC**: Role-based access control
- **Permission Checks**: Component-level permission validation
- **API Security**: Request/response validation
- **Audit Logging**: Comprehensive activity tracking

## Performance Optimizations

### Next.js Optimizations
- **Static Generation**: Pre-rendered pages for SEO
- **Image Optimization**: Automatic image compression and WebP
- **Font Optimization**: Self-hosted fonts with preloading
- **Bundle Splitting**: Automatic code splitting

### React Optimizations
- **Concurrent Rendering**: Improved performance with React 19
- **Suspense**: Better loading states
- **Memoization**: React.memo and useMemo for performance
- **Lazy Loading**: Component lazy loading

### State Management
- **Selective Updates**: Zustand selectors prevent unnecessary re-renders
- **Middleware**: Devtools and persistence middleware
- **Immutability**: Immutable state updates

## Development Workflow

### Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "tsc --noEmit"
  }
}
```

### Code Quality
- **ESLint**: Airbnb config with TypeScript support
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit checks
- **Commitlint**: Conventional commit messages

## Testing Strategy

### Unit Tests
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **Mock Service Worker**: API mocking for tests

### Integration Tests
- **Playwright**: End-to-end testing
- **Visual Regression**: Screenshot comparison testing

## Deployment Pipeline

### Build Process
1. **Type Checking**: TypeScript compilation check
2. **Linting**: ESLint code quality check
3. **Testing**: Unit and integration tests
4. **Build**: Next.js production build
5. **Optimization**: Bundle analysis and optimization

### Deployment Targets
- **Vercel**: Recommended for Next.js applications
- **Docker**: Containerized deployment
- **Static Hosting**: CDN deployment for static assets

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Sentry for error monitoring
- **Performance Monitoring**: Web vitals tracking
- **User Analytics**: Plausible or Google Analytics

### Business Analytics
- **Fraud Metrics**: Real-time fraud detection analytics
- **User Behavior**: Usage patterns and feature adoption
- **Performance KPIs**: System performance and reliability metrics

## Future Enhancements

### Planned Technologies
- **React Query**: Advanced server state management
- **Next.js 15**: Latest framework features
- **TailwindCSS 4**: Improved styling system
- **WebAssembly**: Performance-critical computations

### Architecture Evolution
- **Microservices**: API decomposition
- **GraphQL**: Flexible API layer
- **Edge Computing**: Global performance optimization
- **Machine Learning**: Advanced fraud detection algorithms
