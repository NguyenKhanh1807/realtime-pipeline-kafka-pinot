# MVVM Pattern Implementation

## Overview

This project implements the **Model-View-ViewModel (MVVM)** pattern as the core architectural pattern. MVVM provides clean separation of concerns between the user interface (View), the data and business logic (Model), and the intermediary that handles the presentation logic (ViewModel).

## MVVM Architecture

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

## Layer Responsibilities

### Model Layer (`src/models/`)
The Model layer contains pure business logic and domain knowledge:

**Responsibilities:**
- Domain entities with business rules
- Business logic validation
- Data access interfaces (repositories)
- Domain services for complex operations
- Type definitions for domain concepts

**Key Components:**
- **Entities**: `User`, `Transaction`, `FraudAnalysis` with encapsulated business logic
- **Value Objects**: `Money`, immutable objects representing domain concepts
- **Repositories**: Interfaces for data access (UserRepository, TransactionRepository)
- **Domain Services**: Business operations (FraudDetectionService)
- **Validators**: Business rule validation

### ViewModel Layer (`src/viewmodels/`)
The ViewModel layer acts as an intermediary between the Model and View:

**Responsibilities:**
- UI state management
- Data transformation for presentation
- Command orchestration
- Form validation and error handling
- Event handling and user interactions

**Key Components:**
- **Stores**: Zustand stores for global state management
- **Commands**: Complex multi-step operations (AuthCommands)
- **Selectors**: Computed/derived state from stores
- **Transformers**: Data transformation between Model and View
- **Validators**: ViewModel-level validation (form validation)

### View Layer (`src/components/`)
The View layer handles presentation and user interaction:

**Responsibilities:**
- Rendering UI based on ViewModel state
- Handling user interactions
- Following Atomic Design hierarchy
- Managing UI state and effects

**Key Components:**
- **Atoms**: Basic UI elements (Button, Input, Typography)
- **Molecules**: Component groups (LoginForm, TransactionForm)
- **Organisms**: Complex UI sections (UserManagement, FraudCharts)
- **Templates**: Page layouts (DashboardLayout, AuthLayout)
- **Pages**: Specific page instances

## Data Flow

### Unidirectional Data Flow
```
User Action → View → ViewModel → Model → External API
External API → Model → ViewModel → View → UI Update
```

### State Management
- **Global State**: Zustand stores in ViewModel layer
- **Local State**: React useState for component-specific state
- **Server State**: React Query/SWR for server data (future enhancement)

## Implementation Examples

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
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (credentials: { username: string; password: string }) => Promise<void>;
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

## Command Pattern

The Command pattern is used for complex multi-step operations:

```typescript
export class AuthCommands {
  static async login(credentials: LoginCredentials) {
    // Step 1: Validate input
    // Step 2: Set loading state
    // Step 3: Execute login
    // Step 4: Handle success
    // Step 5: Clean up
  }
}
```

## Benefits of MVVM Implementation

### Separation of Concerns
- **Model**: Pure business logic, testable independently
- **ViewModel**: Presentation logic, data transformation
- **View**: UI rendering, user interaction handling

### Testability
- **Unit Tests**: Each layer can be tested in isolation
- **Integration Tests**: Layer interactions can be tested
- **UI Tests**: Component behavior without business logic complexity

### Maintainability
- **Single Responsibility**: Each layer has a clear purpose
- **Dependency Injection**: Clean interfaces between layers
- **Modular Architecture**: Easy to modify or replace components

### Scalability
- **Horizontal Growth**: New features can be added following the pattern
- **Team Collaboration**: Different teams can work on different layers
- **Technology Migration**: Layers can be migrated independently

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

## Component Creation Flow

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
