# Implementation Guidelines

## Overview

This document outlines the coding standards, architectural patterns, and implementation guidelines for the Realtime Fraud Detection Dashboard. Following these guidelines ensures consistency, maintainability, and scalability across the codebase.

## Architectural Principles

### MVVM Pattern Implementation

#### Model Layer (`src/models/`)
**Purpose**: Pure business logic, domain entities, and data access contracts

**Guidelines:**
- **Domain Entities**: Rich objects with business logic and validation
- **Value Objects**: Immutable objects representing domain concepts
- **Domain Services**: Business operations that don't belong to entities
- **Repository Interfaces**: Data access contracts (no implementation details)
- **Domain Validators**: Business rule validation

#### ViewModel Layer (`src/viewmodels/`)
**Purpose**: Bridge between Model and View, handle presentation logic

**Guidelines:**
- **Zustand Stores**: Global state management with actions
- **Custom Hooks**: Reusable ViewModel logic
- **Command Pattern**: Complex multi-step operations
- **Selectors**: Computed/derived state
- **Transformers**: Data transformation between layers

#### View Layer (`src/components/`)
**Purpose**: User interface components following Atomic Design

**Guidelines:**
- **Atomic Design Hierarchy**: Atoms → Molecules → Organisms → Templates → Pages
- **Component Composition**: Prefer composition over inheritance
- **Props Interface**: Strongly typed component props
- **Error Boundaries**: Graceful error handling

## Coding Standards

### TypeScript Guidelines

#### Type Definitions
```typescript
// ✅ Good: Explicit types
interface User {
  readonly id: UserId;
  readonly username: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;
}

// ❌ Bad: Using any
interface User {
  id: any;
  username: any;
  data: any;
}

// ✅ Good: Union types for domain constraints
type UserRole = 'admin' | 'analyst' | 'viewer' | 'api_user';

// ✅ Good: Generic constraints
interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

#### Function Signatures
```typescript
// ✅ Good: Clear parameter types and return types
async function analyzeTransaction(
  transaction: Transaction,
  analyzerId: string
): Promise<FraudAnalysisResult> {
  // implementation
}

// ✅ Good: Optional parameters with defaults
function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'USD',
  locale: string = 'en-US'
): string {
  // implementation
}

// ❌ Bad: Implicit any return
function processData(data) {
  return data.map(item => item.value);
}
```

#### Class Design
```typescript
// ✅ Good: Domain entity with business logic
export class User {
  private constructor(private props: UserProps) {}

  static create(props: CreateUserProps): User {
    // validation and creation logic
    return new User({ ...props, id: generateId() });
  }

  // Business methods
  canLogin(): boolean {
    return this.props.isActive && !this.isLocked();
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.loginAttempts = 0;
  }
}
```

### Component Guidelines

#### Atomic Design Structure
```typescript
// Atoms: Basic building blocks
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }))}
      {...props}
    />
  );
}

// Molecules: Component combinations
interface InputFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function InputField({ label, error, required, children }: InputFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block">
        <Typography variant="span" size="sm" weight="medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Typography>
      </label>
      {children}
      {error && (
        <Typography variant="p" size="sm" color="destructive">
          {error}
        </Typography>
      )}
    </div>
  );
}

// Organisms: Complex components
interface UserManagementProps {
  currentUser: User;
  onUserCreate?: (user: Partial<User>) => Promise<void>;
  onUserUpdate?: (userId: string, updates: Partial<User>) => Promise<void>;
  onUserDelete?: (userId: string) => Promise<void>;
}

export function UserManagement({ currentUser, ...handlers }: UserManagementProps) {
  // Complex state management and business logic
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Implementation
}
```

#### React Best Practices
```typescript
// ✅ Good: Custom hooks for reusable logic
export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await userApi.getUsers();
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, loadUsers };
}

// ✅ Good: Error boundaries
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// ✅ Good: Performance optimization
const UserList = memo(({ users, onUserClick }: UserListProps) => {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id} onClick={() => onUserClick(user)}>
          {user.name}
        </li>
      ))}
    </ul>
  );
});
```

### State Management Guidelines

#### Zustand Store Patterns
```typescript
// ✅ Good: Store with clear separation
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Computed selectors
  isAdmin: boolean;
  isModerator: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Computed values
  get isAdmin() {
    return get().user?.role === 'admin';
  },

  get isModerator() {
    return get().user?.role === 'admin' || get().user?.role === 'moderator';
  },

  // Actions
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.login(credentials);
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false
      });
      throw error;
    }
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null
    });
  },

  clearError: () => set({ error: null }),
}));
```

#### Custom Hook Patterns
```typescript
// ✅ Good: ViewModel hook
export const useFraudDashboard = () => {
  const {
    analyses,
    isLoading,
    loadAnalyses,
    error
  } = useFraudStore();

  // Business logic
  const highRiskAnalyses = useMemo(
    () => analyses.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical'),
    [analyses]
  );

  const stats = useMemo(() => ({
    total: analyses.length,
    fraudulent: analyses.filter(a => a.isFraudulent()).length,
    averageScore: analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length,
  }), [analyses]);

  return {
    analyses,
    highRiskAnalyses,
    stats,
    isLoading,
    error,
    loadAnalyses,
  };
};
```

## API Design Guidelines

### RESTful API Patterns
```typescript
// ✅ Good: Repository interface
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findMany(params: PaginationParams): Promise<PaginatedResult<User>>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: UserId): Promise<void>;
}

// ✅ Good: Service layer
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(userData: CreateUserData): Promise<User> {
    // Business logic validation
    await this.validateUserData(userData);

    // Check for existing user
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create and save user
    const user = User.create(userData);
    return this.userRepository.create(user);
  }
}
```

### Error Handling
```typescript
// ✅ Good: Domain errors
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(public readonly field: string, message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

// ✅ Good: Error handling in components
function UserForm() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: UserFormData) => {
    try {
      setError(null);
      await userService.createUser(data);
      // Success handling
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(`Validation failed: ${error.message}`);
      } else if (error instanceof NotFoundError) {
        setError('Resource not found');
      } else {
        setError('An unexpected error occurred');
        console.error('User creation failed:', error);
      }
    }
  };
}
```

## Testing Guidelines

### Unit Tests
```typescript
// ✅ Good: Domain entity tests
describe('User', () => {
  describe('create', () => {
    it('should create a valid user', () => {
      const user = User.create({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'analyst'
      });

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('analyst');
      expect(user.isActive()).toBe(true);
    });

    it('should throw error for invalid email', () => {
      expect(() => User.create({
        username: 'test',
        email: 'invalid-email',
        passwordHash: 'hash',
        role: 'user'
      })).toThrow('Invalid email format');
    });
  });

  describe('canLogin', () => {
    it('should return true for active user', () => {
      const user = User.create({
        username: 'test',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'user'
      });

      expect(user.canLogin()).toBe(true);
    });
  });
});

// ✅ Good: Component tests
describe('Button', () => {
  it('should render with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests
```typescript
// ✅ Good: Service integration tests
describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let mockTransactionRepo: jest.Mocked<TransactionRepository>;
  let mockFraudRepo: jest.Mocked<FraudAnalysisRepository>;

  beforeEach(() => {
    mockTransactionRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
    };

    mockFraudRepo = {
      create: jest.fn(),
      findById: jest.fn(),
    };

    service = new FraudDetectionService(
      mockTransactionRepo,
      mockFraudRepo
    );
  });

  describe('analyzeTransaction', () => {
    it('should analyze transaction and create fraud analysis', async () => {
      const transaction = Transaction.create({
        amount: Money.create(1000, 'USD'),
        merchant: 'Test Merchant',
        type: 'credit_card',
        location: {
          country: 'US',
          countryCode: 'US',
        },
        timestamp: new Date(),
      });

      const result = await service.analyzeTransaction(transaction, 'system');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);

      expect(mockFraudRepo.create).toHaveBeenCalledWith(
        expect.any(FraudAnalysis)
      );
    });
  });
});
```

## File Organization

### Naming Conventions
```typescript
// Files: kebab-case
// user-profile.tsx
// fraud-detection-service.ts
// auth-validators.ts

// Components: PascalCase
// UserProfile, FraudDetectionService

// Hooks: camelCase with 'use' prefix
// useUserData, useFraudAnalysis

// Types: PascalCase
// User, Transaction, ApiResponse

// Constants: SCREAMING_SNAKE_CASE
// MAX_FILE_SIZE, API_TIMEOUT

// Functions: camelCase
// createUser, validateEmail, formatCurrency
```

### Directory Structure
```
src/
├── components/
│   ├── atoms/           # index.ts exports
│   ├── molecules/       # index.ts exports
│   ├── organisms/       # index.ts exports
│   └── index.ts         # Main component exports
├── models/
│   ├── entities/        # Domain entities
│   ├── services/        # Domain services
│   ├── repositories/    # Repository interfaces
│   ├── types/           # Domain types
│   ├── validators/      # Domain validators
│   └── index.ts         # Model exports
├── viewmodels/
│   ├── stores/          # Zustand stores
│   ├── commands/        # Command pattern
│   ├── selectors/       # Computed state
│   ├── transformers/    # Data transformation
│   ├── types/           # ViewModel types
│   └── index.ts         # ViewModel exports
└── utils/
    ├── constants.ts     # App constants
    ├── formatters.ts    # Data formatters
    ├── helpers.ts       # Utility functions
    └── index.ts         # Utility exports
```

### Import Organization
```typescript
// ✅ Good: Grouped imports
import React, { useState, useEffect } from 'react';

// External libraries
import { Button } from '@/components/atoms';
import { useAuth } from '@/hooks';

// Internal modules
import { User } from '@/models/entities/user';
import { FraudDetectionService } from '@/models/services';

// Types
import type { UserId, Transaction } from '@/models/types';

// Utils
import { formatCurrency } from '@/utils/formatters';

// ❌ Bad: Ungrouped imports
import React from 'react';
import { useAuth } from '@/hooks';
import { Button } from '@/components/atoms';
import { User } from '@/models/entities/user';
import type { UserId } from '@/models/types';
import { formatCurrency } from '@/utils/formatters';
import { useState } from 'react';
```

## Performance Guidelines

### React Performance
```typescript
// ✅ Good: Memoization
const UserCard = memo(({ user, onClick }: UserCardProps) => {
  return (
    <div onClick={() => onClick(user)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

// ✅ Good: useMemo for expensive calculations
const processedUsers = useMemo(() => {
  return users.map(user => ({
    ...user,
    displayName: `${user.firstName} ${user.lastName}`,
    isActive: user.status === 'active',
  }));
}, [users]);

// ✅ Good: useCallback for event handlers
const handleUserClick = useCallback((user: User) => {
  navigate(`/users/${user.id}`);
}, [navigate]);
```

### Bundle Optimization
```typescript
// ✅ Good: Dynamic imports
const FraudAnalysisChart = dynamic(
  () => import('@/components/organisms/fraud-analysis-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Client-side only
  }
);

// ✅ Good: Tree shaking
export { Button } from './button';
export { Input } from './input';
// Avoid: export * from './all-components';
```

## Security Guidelines

### Input Validation
```typescript
// ✅ Good: Domain validation
export function validateEmail(email: Email): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    if (email.length > 254) {
      errors.push('Email is too long');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ✅ Good: Sanitization
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
  });
}
```

### Authentication & Authorization
```typescript
// ✅ Good: Permission checks
export function requirePermission(permission: Permission) {
  return function(Component: React.ComponentType<any>) {
    return function WrappedComponent(props: any) {
      const { user, hasPermission } = useAuth();

      if (!user) {
        return <Navigate to="/login" />;
      }

      if (!hasPermission(permission)) {
        return <AccessDenied />;
      }

      return <Component {...props} />;
    };
  };
}

// Usage
const AdminDashboard = requirePermission('dashboard:view')(DashboardComponent);
```

## Documentation Standards

### Code Comments
```typescript
// ✅ Good: JSDoc for public APIs
/**
 * Creates a new fraud analysis for the given transaction
 * @param transaction - The transaction to analyze
 * @param analyzerId - ID of the analyzer performing the analysis
 * @returns Promise resolving to fraud analysis result
 * @throws {ValidationError} If transaction data is invalid
 * @throws {NotFoundError} If transaction is not found
 */
async function analyzeTransaction(
  transaction: Transaction,
  analyzerId: string
): Promise<FraudAnalysisResult> {
  // Implementation
}

// ✅ Good: Inline comments for complex logic
export function calculateFraudScore(factors: FraudFactor[]): number {
  // Weight factors by severity and confidence
  const weightedScore = factors.reduce((score, factor) => {
    return score + (factor.weight * factor.severity * factor.confidence);
  }, 0);

  // Normalize to 0-100 scale
  const normalizedScore = Math.min(100, Math.max(0, weightedScore * 100));

  return Math.round(normalizedScore);
}
```

### README and Documentation
- **README.md**: Project overview, setup instructions, API docs
- **docs/**: Detailed guides, architecture docs, development workflow
- **Code Examples**: Comprehensive examples in documentation
- **API Documentation**: OpenAPI/Swagger specs
- **Changelogs**: Version history and breaking changes

## Code Review Checklist

### Architecture
- [ ] **MVVM Pattern**: Clear separation between Model, ViewModel, View
- [ ] **Atomic Design**: Components follow proper hierarchy
- [ ] **Domain-Driven**: Business logic in domain layer
- [ ] **SOLID Principles**: Single responsibility, open/closed, etc.

### Code Quality
- [ ] **TypeScript**: Proper typing, no `any` types
- [ ] **ESLint**: No linting errors or warnings
- [ ] **Naming**: Consistent naming conventions
- [ ] **DRY**: No code duplication
- [ ] **Readability**: Clear, self-documenting code

### Testing
- [ ] **Unit Tests**: Domain logic and utilities tested
- [ ] **Integration Tests**: Component and service integration tested
- [ ] **Edge Cases**: Error conditions and boundary cases covered
- [ ] **Test Coverage**: Minimum 80% coverage maintained

### Performance & Security
- [ ] **Performance**: No unnecessary re-renders or expensive operations
- [ ] **Security**: Input validation, XSS prevention, secure practices
- [ ] **Accessibility**: WCAG compliance, keyboard navigation
- [ ] **Bundle Size**: Optimized imports and lazy loading

### Documentation
- [ ] **Code Comments**: Complex logic documented
- [ ] **API Documentation**: Public APIs documented
- [ ] **README Updates**: Documentation kept current
- [ ] **Breaking Changes**: Migration guides provided

Following these guidelines ensures high-quality, maintainable, and scalable code that adheres to the project's architectural principles.
