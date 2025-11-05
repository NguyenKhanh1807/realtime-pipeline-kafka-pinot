# Realtime Pinot - MVVM Architecture with Atomic Design

## Overview

This project implements a **Fraud Detection Dashboard** using **MVVM (Model-View-ViewModel)** architecture with **Atomic Design** principles. It integrates with **Apache Pinot** for real-time analytics to analyze credit card transactions and detect fraudulent activity.

## Key Features

### 🔍 Fraud Detection System
- **Real-time Transaction Analysis**: Input credit card transaction details for instant fraud scoring
- **Apache Pinot Integration**: Connects to Pinot instance at `http://93.115.172.151:8099/` for advanced analytics
- **Risk Assessment**: Multi-factor fraud scoring with confidence levels based on real transaction patterns
- **Interactive Dashboard**: Monitor fraud metrics, risk factors, and transaction trends
- **Advanced Visualizations**: Charts and graphs for fraud analytics using Recharts
- **Real-time Features**: WebSocket connections for live transaction feeds and fraud alerts
- **Authentication**: Secure login/register system for internal fraud analysis team

### 🎨 Modern Tech Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS + ShadcnUI + RadixUI + Custom Theme System
- **State Management**: Zustand
- **Data Visualization**: Recharts for interactive charts and graphs
- **Real-time Communication**: WebSocket client for live updates
- **Design System**: Atomic Design (Atoms, Molecules, Organisms, Templates, Pages)
- **Theme**: Blue & White color scheme with dark mode support

### 📊 Advanced Visualizations
- **Fraud Trends Chart**: Real-time transaction volume and fraud patterns over time
- **Risk Factors Chart**: Pie chart showing distribution of fraud detection triggers
- **Fraud Metrics Overview**: KPI cards with trend indicators and area charts
- **Interactive Dashboards**: Hover tooltips, responsive design, real-time data updates

### 🔄 Real-time Features
- **WebSocket Integration**: Live connection for instant updates
- **Transaction Feed**: Real-time stream of processed transactions with risk levels
- **Fraud Alerts Panel**: Push notifications for high-risk transactions
- **Live Analytics**: Continuously updating fraud metrics and statistics
- **Connection Management**: Auto-reconnection and offline handling

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd realtime-pinot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Environment Setup
See the [Environment Configuration](#environment-configuration) section below for detailed setup instructions.

## Architecture Principles

### MVVM Pattern

```mermaid
graph TD
    A[Model Layer] --> B[ViewModel Layer]
    B --> C[View Layer]

    A1[Business Logic] --> A
    A2[Data Access] --> A
    A3[Services] --> A
    A4[Validators] --> A

    B1[Zustand Stores] --> B
    B2[Custom Hooks] --> B
    B3[State Logic] --> B
    B4[Data Binding] --> B

    C1[UI Components] --> C
    C2[Atomic Design] --> C
    C3[Event Handlers] --> C
    C4[Next.js Pages] --> C

    A -.->|Data Flow| B
    B -.->|State Updates| C
    C -.->|User Actions| B
```

### Data Flow Architecture

```mermaid
flowchart LR
    subgraph "User Interaction"
        U[User]
    end

    subgraph "View Layer"
        V[Components]
        V1[Atoms]
        V2[Molecules]
        V3[Organisms]
        V4[Templates]
        V5[Pages]
    end

    subgraph "ViewModel Layer"
        VM[Custom Hooks]
        VM1[Zustand Stores]
        VM2[Commands]
        VM3[Selectors]
        VM4[Validators]
        VM5[Transformers]
        VM6[Types]
    end

    subgraph "Model Layer"
        M[Services]
        M1[API Client]
        M2[Repositories]
        M3[Validators]
        M4[Types]
    end

    subgraph "External"
        DB[(Database)]
        API[Third-party APIs]
    end

    U --> V
    V --> VM
    VM --> VM1
    VM --> VM2
    VM --> VM3
    VM --> VM4
    VM --> VM5
    VM --> VM6
    VM1 --> VM3
    VM2 --> VM1
    VM5 --> VM1
    VM4 --> VM2
    VM --> M
    M --> DB
    M --> API
    M --> VM
    VM --> V
```

#### Model Layer
- **Location**: `src/models/`
- **Purpose**: Business logic, data access, API services
- **Responsibilities**:
  - Data validation and transformation
  - API communication
  - Business rules and calculations
  - Repository pattern for data access

#### ViewModel Layer
- **Location**: `src/viewmodels/` + `src/hooks/`
- **Purpose**: Bridge between Model and View, manage state and logic
- **Responsibilities**:
  - UI state management with Zustand stores
  - Business logic orchestration through commands
  - Data transformation via transformers
  - Form validation with business rules
  - Computed state through selectors
  - Data binding for components
  - Event handling and user interactions

**Subdirectories:**
- **`stores/`**: Zustand stores for global state management
- **`commands/`**: Complex multi-step operation orchestration
- **`selectors/`**: Computed/derived state from stores
- **`validators/`**: Business logic validation rules
- **`transformers/`**: Data transformation between models and view models
- **`types/`**: ViewModel-specific type definitions

#### View Layer
- **Location**: `src/components/` + `app/` (pages)
- **Purpose**: User interface components
- **Responsibilities**:
  - Render UI based on ViewModel state
  - Handle user interactions
  - Follow Atomic Design structure

### Atomic Design System

```mermaid
graph TD
    P[Pages<br/>Specific page instances<br/>app/dashboard/page.tsx] --> T[Templates<br/>Page layouts without content<br/>src/components/templates/]
    T --> O[Organisms<br/>Complex UI sections<br/>src/components/organisms/]
    O --> M[Molecules<br/>Simple component groups<br/>src/components/molecules/]
    M --> A[Atoms<br/>Basic UI elements<br/>src/components/atoms/]

    P1[dashboard-page.tsx] --> P
    P2[profile-page.tsx] --> P
    P3[login-page.tsx] --> P

    T1[dashboard-layout.tsx] --> T
    T2[auth-layout.tsx] --> T

    O1[navigation-bar.tsx] --> O
    O2[data-table.tsx] --> O
    O3[form-section.tsx] --> O

    M1[input-field.tsx] --> M
    M2[card-header.tsx] --> M

    A1[button.tsx] --> A
    A2[input.tsx] --> A
    A3[typography.tsx] --> A

    classDef atoms fill:#e1f5fe
    classDef molecules fill:#b3e5fc
    classDef organisms fill:#81d4fa
    classDef templates fill:#4fc3f7
    classDef pages fill:#29b6f6

    class A,A1,A2,A3 atoms
    class M,M1,M2 molecules
    class O,O1,O2,O3 organisms
    class T,T1,T2 templates
    class P,P1,P2,P3 pages
```

#### Atoms
- **Location**: `src/components/atoms/`
- **Purpose**: Basic building blocks
- **Examples**: Button, Input, Icon, Typography

#### Molecules
- **Location**: `src/components/molecules/`
- **Purpose**: Groups of atoms forming simple UI patterns
- **Examples**: input-field.tsx (Input + Label + Error), card-header.tsx

#### Organisms
- **Location**: `src/components/organisms/`
- **Purpose**: Complex UI sections composed of molecules and atoms
- **Examples**: navigation-bar.tsx, data-table.tsx, form-section.tsx

#### Templates
- **Location**: `src/components/templates/`
- **Purpose**: Page-level layouts without content
- **Examples**: dashboard-layout.tsx, auth-layout.tsx, content-layout.tsx

#### Pages
- **Location**: `app/` (Next.js App Router)
- **Purpose**: Specific instances of templates with real content
- **Examples**: dashboard-page.tsx, profile-page.tsx

## Project Structure

```mermaid
graph TD
    subgraph "Next.js App Router"
        APP[app/]
        APP1[layout.tsx<br/>Root layout]
        APP2[page.tsx<br/>Home page]
        APP3["(auth)/<br/>Route groups"]
        APP4[dashboard/<br/>Protected routes]
        APP5[api/<br/>API routes]
    end

    subgraph "Source Code (src/)"
        SRC[src/]
    end

    subgraph "View Layer"
        COMP[components/]
        COMP1[atoms/<br/>Basic UI elements]
        COMP2[molecules/<br/>Component groups]
        COMP3[organisms/<br/>Complex UI sections]
        COMP4[templates/<br/>Page layouts]
    end

    subgraph "ViewModel Layer"
        VM[viewmodels/]
        VM1[stores/<br/>Zustand stores]
        VM2[commands/<br/>Operation orchestration]
        VM3[selectors/<br/>Computed state]
        VM4[validators/<br/>Business validation]
        VM5[transformers/<br/>Data transformation]
        VM6[types/<br/>ViewModel types]
        HOOKS[hooks/<br/>Custom React hooks]
    end

    subgraph "Model Layer"
        MODEL[models/]
        MODEL1[types/<br/>TypeScript definitions]
        MODEL2[services/<br/>API services]
        MODEL3[repositories/<br/>Data access]
        MODEL4[validators/<br/>Data validation]
    end

    subgraph "Infrastructure"
        LAYOUTS[layouts/<br/>Layout components]
        CONTEXTS[contexts/<br/>React Context providers]
        UTILS[utils/<br/>Utility functions]
        LIB[lib/<br/>Third-party integrations]
    end

    APP --> APP1
    APP --> APP2
    APP --> APP3
    APP --> APP4
    APP --> APP5

    SRC --> COMP
    SRC --> VM
    SRC --> MODEL
    SRC --> LAYOUTS
    SRC --> CONTEXTS
    SRC --> UTILS
    SRC --> LIB

    COMP --> COMP1
    COMP --> COMP2
    COMP --> COMP3
    COMP --> COMP4

    VM --> VM1
    VM --> VM2
    VM --> VM3
    VM --> VM4
    VM --> VM5
    VM --> VM6
    SRC --> HOOKS

    MODEL --> MODEL1
    MODEL --> MODEL2
    MODEL --> MODEL3
    MODEL --> MODEL4

    classDef app fill:#e8f5e8,stroke:#2e7d32
    classDef view fill:#fff3e0,stroke:#ef6c00
    classDef viewmodel fill:#fce4ec,stroke:#c2185b
    classDef model fill:#e3f2fd,stroke:#1565c0
    classDef infra fill:#f3e5f5,stroke:#6a1b9a

    class APP,APP1,APP2,APP3,APP4,APP5 app
    class COMP,COMP1,COMP2,COMP3,COMP4 view
    class VM,VM1,VM2,VM3,VM4,VM5,VM6,HOOKS viewmodel
    class MODEL,MODEL1,MODEL2,MODEL3,MODEL4 model
    class LAYOUTS,CONTEXTS,UTILS,LIB infra
```

### Directory Structure Details

```
src/
├── components/           # View Layer - UI Components
│   ├── atoms/           # Basic UI elements (Button, Input, Icon, Typography)
│   ├── molecules/       # Simple component groups (login-form.tsx, transaction-form.tsx, fraud-check-dialog.tsx, realtime-transaction-feed.tsx, fraud-alerts-panel.tsx, theme-switcher.tsx)
│   ├── organisms/       # Complex UI sections (navigation-bar.tsx, data-table.tsx)
│   ├── templates/       # Page layouts (dashboard-layout.tsx, auth-layout.tsx)
│   └── charts/          # Data visualization components (fraud-trends-chart.tsx, risk-factors-chart.tsx, fraud-metrics-overview.tsx)
├── models/              # Model Layer - Business Logic
│   ├── types/          # TypeScript type definitions
│   ├── services/       # API and external services (pinot-client.ts, websocket-client.ts)
│   ├── repositories/   # Data access layer
│   └── validators/     # Data validation
├── viewmodels/          # ViewModel Layer - State & Logic
│   ├── stores/         # Zustand stores (State management)
│   ├── commands/       # Complex operation orchestration
│   ├── selectors/      # Computed/derived state
│   ├── validators/     # Business validation rules
│   ├── transformers/   # Data transformation logic
│   └── types/          # ViewModel type definitions
├── hooks/              # Custom React hooks (useAuth, useRealtimeData, useWebSocket)
├── contexts/           # React Context providers
│   ├── theme-context.tsx
│   ├── auth-context.tsx
│   └── app-context.tsx
├── layouts/            # Layout components
│   ├── dashboard-layout.tsx
│   └── auth-layout.tsx
├── utils/              # Utility functions
│   ├── constants.ts
│   ├── helpers.ts
│   └── formatters.ts
└── lib/                # Third-party integrations
    ├── zustand.ts
    └── shadcn-ui.ts

app/                    # Next.js App Router
├── layout.tsx          # Root layout with providers
├── page.tsx           # Home page
├── (auth)/            # Route groups
│   ├── login/         # Login page
│   └── register/      # Registration page
├── dashboard/         # Protected routes
└── api/               # API routes
```

## Technology Stack Details

### TypeScript Configuration
- Strict type checking enabled
- Path mapping for clean imports
- Utility types for common patterns
- Generic constraints for reusable components

### ShadcnUI + RadixUI Integration
- **ShadcnUI**: Pre-built accessible components
- **RadixUI**: Low-level primitives for custom components
- Custom theme configuration in `tailwind.config.ts`
- Component variants using TailwindCSS

### Theme System
- **Light Theme**: Clean blue & white design with pure white backgrounds
- **Dark Theme**: Deep blue backgrounds with white text and accents
- **Primary Color**: Vibrant blue (`hsl(217, 91%, 60%)`) as main brand color
- **System Preference**: Automatic theme switching based on OS settings
- **CSS Variables**: Consistent theming using HSL color space
- **Theme Persistence**: User theme choice saved in localStorage
- **Smooth Transitions**: Seamless theme switching with CSS transitions
- **Custom Gradients**: Blue gradient backgrounds for enhanced visual appeal

## Typography Guide

### Font Family

The project uses Literata as the primary font family. It's automatically loaded and configured as the default font.

### Font Weights

Literata is available in the following weights:

- Thin: 200 (`font-extralight`)
- Light: 300 (`font-light`)
- Regular: 400 (`font-normal`)
- Medium: 500 (`font-medium`)
- Semibold: 600 (`font-semibold`)
- Bold: 700 (`font-bold`)
- Extrabold: 800 (`font-extrabold`)
- Black: 900 (`font-black`)

### Font Sizes

Default text sizes with their pixel equivalents:

```
xs: 12px    (text-xs)
sm: 14px    (text-sm)
base: 16px  (text-base)
lg: 18px    (text-lg)
xl: 20px    (text-xl)
2xl: 24px   (text-2xl)
3xl: 30px   (text-3xl)
4xl: 36px   (text-4xl)
5xl: 48px   (text-5xl)
6xl: 60px   (text-6xl)
7xl: 72px   (text-7xl)
8xl: 96px   (text-8xl)
9xl: 128px  (text-9xl)
```

### Usage Examples

```tsx
// Heading with medium weight
<h1 className="text-4xl font-medium">Large Title</h1>

// Body text with normal weight
<p className="text-base">Regular paragraph text</p>

// Small text with light weight
<span className="text-sm font-light">Caption text</span>

// Bold large text
<div className="text-2xl font-bold">Important message</div>
```

### Best Practices

1. Use semantic HTML elements (`h1`, `h2`, `p`, etc.) for proper document structure
2. Stick to the defined font sizes for consistency
3. Use appropriate font weights:
   - 400 (normal) for body text
   - 500-600 (medium-semibold) for subheadings
   - 700 (bold) for important text or headings
   - 200-300 (thin-light) for subtle or secondary text
4. Maintain a consistent hierarchy:
   - Main headings: text-4xl to text-6xl
   - Subheadings: text-2xl to text-3xl
   - Body text: text-base to text-lg
   - Small text/captions: text-sm to text-xs

### Zustand State Management

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Loading : Action Dispatched
    Loading --> Success : API Success
    Loading --> Error : API Failure
    Error --> Idle : Clear Error
    Success --> Idle : State Updated

    note right of Idle
        Initial State
        user: null
        isLoading: false
        error: null
    end note

    note right of Loading
        API Call in Progress
        isLoading: true
    end note

    note right of Success
        Data Updated
        user: User object
        isLoading: false
        error: null
    end note

    note right of Error
        Error Occurred
        error: "Error message"
        isLoading: false
    end note
```

```typescript
// Example store structure
interface AppState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AppActions {
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

type AppStore = AppState & AppActions;

// Implementation in ViewModel layer
const useAppStore = create<AppStore>((set, get) => ({
  // State
  user: null,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  // Async actions (business logic)
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(credentials);
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, error: null });
  },
}));
```

### Custom Hooks Pattern
```typescript
// ViewModel hook pattern
export const useUserViewModel = () => {
  const { user, isLoading, error } = useAppStore();
  const userService = useUserService();

  const login = async (credentials: LoginCredentials) => {
    // Business logic here
  };

  const logout = () => {
    // Cleanup logic here
  };

  return {
    user,
    isLoading,
    error,
    login,
    logout,
  };
};
```

## Implementation Guidelines

### Component Development
1. **Always use TypeScript** with proper type definitions
2. **Follow Atomic Design** hierarchy
3. **Separate concerns**: UI (View) vs Logic (ViewModel) vs Data (Model)
4. **Use custom hooks** for reusable logic
5. **Implement proper error boundaries**

### State Management
1. **Use Zustand stores** for global state
2. **Keep stores focused** on specific domains
3. **Use selectors** to prevent unnecessary re-renders
4. **Persist state** when needed using Zustand middleware

### API Integration
1. **Centralize API calls** in service layer
2. **Use repositories** for data access patterns
3. **Implement proper error handling** and loading states
4. **Add request/response interceptors** for common logic

### Styling Guidelines
1. **Use TailwindCSS** for utility classes
2. **Leverage ShadcnUI** components for consistency
3. **Create design tokens** for colors, spacing, typography
4. **Support dark mode** using CSS variables

## Development Workflow

```mermaid
flowchart TD
    START([New Feature Request]) --> IDENTIFY{Identify Domain}
    IDENTIFY --> TYPES[1. Create/Update Types<br/>src/models/types/]
    TYPES --> SERVICES[2. Implement Services<br/>src/models/services/]
    SERVICES --> STORE[3. Create Zustand Store<br/>src/viewmodels/stores/]
    STORE --> HOOK[4. Build Custom Hook<br/>src/hooks/]
    HOOK --> COMPONENTS{Component Type?}

    COMPONENTS -->|Atom| ATOM[5a. Create Atom<br/>src/components/atoms/]
    COMPONENTS -->|Molecule| MOLECULE[5b. Create Molecule<br/>src/components/molecules/]
    COMPONENTS -->|Organism| ORGANISM[5c. Create Organism<br/>src/components/organisms/]
    COMPONENTS -->|Template| TEMPLATE[5d. Create Template<br/>src/components/templates/]

    ATOM --> PAGE
    MOLECULE --> PAGE
    ORGANISM --> PAGE
    TEMPLATE --> PAGE

    PAGE[6. Update/Create Page<br/>app/domain/page.tsx]
    PAGE --> DEPLOY[7. Deploy & Monitor]

    classDef step1 fill:#e8f5e8,stroke:#2e7d32
    classDef step2 fill:#f3e5f5,stroke:#6a1b9a
    classDef step3 fill:#e3f2fd,stroke:#1565c0
    classDef step4 fill:#fce4ec,stroke:#c2185b
    classDef step5 fill:#fff3e0,stroke:#ef6c00
    classDef step6 fill:#e8f5e8,stroke:#2e7d32

    class TYPES step1
    class SERVICES step1
    class STORE step2
    class HOOK step2
    class ATOM,MOLECULE,ORGANISM,TEMPLATE step3
    class PAGE step4
```

### Component Creation Flow

```mermaid
flowchart TD
    A[Start with Atom] --> B{Is it reusable?}
    B -->|No| C[Keep as local component]
    B -->|Yes| D[Create Atom]

    D --> E{Need combination?}
    E -->|No| F[Use Atom directly]
    E -->|Yes| G[Create Molecule]

    G --> H{Complex interaction?}
    H -->|No| I[Use Molecule in Organism]
    H -->|Yes| J[Create Organism]

    J --> K{Page layout?}
    K -->|No| L[Use Organism in Template]
    K -->|Yes| M[Create Template]

    M --> N[Use Template in Page]
    N --> O[Page renders in App Router]

    classDef atom fill:#e1f5fe
    classDef molecule fill:#b3e5fc
    classDef organism fill:#81d4fa
    classDef template fill:#4fc3f7
    classDef page fill:#29b6f6

    class A,D atom
    class G molecule
    class J organism
    class M template
    class N,O page
```

### Code Organization Rules
- **One responsibility per file**
- **Export default for main component/function**
- **Use named exports for utilities**
- **Group related files in directories**
- **Use index.ts** for clean imports

### Naming Conventions
- **Files**: kebab-case (user-profile.tsx, data-table.tsx, theme-context.tsx)
- **Components**: PascalCase in code (UserProfile, DataTable)
- **Hooks**: camelCase with 'use' prefix (useUserData)
- **Services**: PascalCase with 'Service' suffix (UserService)
- **Stores**: PascalCase with 'Store' suffix (UserStore)
- **Types**: PascalCase (User, ApiResponse)

## Performance Considerations

### Optimization Techniques
- **Code splitting** with Next.js dynamic imports
- **Memoization** using React.memo and useMemo
- **Virtual scrolling** for large lists
- **Image optimization** with Next.js Image component
- **Bundle analysis** to identify large dependencies

### State Management Optimization
- **Use selectors** in Zustand stores
- **Debounce/throttle** API calls
- **Implement optimistic updates** where appropriate
- **Clean up subscriptions** on component unmount

## Deployment & CI/CD

### Build Optimization
- **Static generation** for marketing pages
- **Server-side rendering** for dynamic content
- **API routes** for serverless functions
- **Edge runtime** for global performance

### Environment Configuration
- **Environment variables** for different stages (see `.env.example`)
- **Build-time configuration** with Next.js
- **Runtime configuration** for client-side features

#### Environment Variables Setup
The application uses environment variables for configuration. A `.env.example` file is provided as a template.

**Setup Instructions:**
1. Copy `.env.example` to `.env.local`
2. Fill in your actual values in `.env.local`
3. `.env.local` is ignored by Git for security

**Key Environment Variables:**
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NEXT_PUBLIC_API_URL` - External API base URL
- `JWT_SECRET` - Authentication token secret
- `NEXT_PUBLIC_ENABLE_REAL_TIME_FEATURES` - Feature flag for real-time functionality

**Security Note:** Never commit `.env.local` or any file containing actual secrets to version control.

#### Git Configuration
The `.gitignore` file is configured to:
- Track `.env.example` (template file)
- Ignore `.env*` files (actual environment files)
- Include exception `!.env.example` to allow the template

This ensures developers can access the configuration template while keeping secrets secure.

---

