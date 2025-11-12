# Atomic Design System

## Overview

This project implements **Atomic Design** as the component design system. Atomic Design is a methodology for creating design systems by breaking down interfaces into fundamental building blocks that can be recombined to create more complex patterns.

## Atomic Design Hierarchy

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

## Component Levels

### Atoms (`src/components/atoms/`)
**Purpose**: Basic building blocks that cannot be broken down further without losing functionality.

**Examples:**
- Button, Input, Icon, Typography
- Links, Images, Labels

**Characteristics:**
- Reusable across the entire application
- No business logic
- Pure presentation components
- Highly configurable through props

**Implementation:**
```typescript
// Button Atom
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      {...props}
    />
  );
}
```

### Molecules (`src/components/molecules/`)
**Purpose**: Groups of atoms that form simple UI patterns and have a specific function.

**Examples:**
- InputField (Input + Label + Error)
- LoginForm (multiple inputs + button)
- CardHeader (title + actions)
- TransactionForm
- FraudAlertsPanel
- ThemeSwitcher

**Characteristics:**
- Combine multiple atoms
- Have specific functionality
- Reusable across different contexts
- May contain some simple logic

**Implementation:**
```typescript
// InputField Molecule
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
```

### Organisms (`src/components/organisms/`)
**Purpose**: Complex UI sections that combine multiple molecules and atoms.

**Examples:**
- UserManagement (table + forms + filters)
- FraudMap (map + legends + tooltips)
- FraudTrendsChart (chart + controls + data)
- AuditLogViewer
- DataTable

**Characteristics:**
- Complex interactions
- May contain business logic
- Often page-specific but reusable
- Manage their own state

**Implementation:**
```typescript
// UserManagement Organism
interface UserManagementProps {
  currentUser: UserType;
  onUserCreate?: (user: Partial<UserType>) => Promise<void>;
  onUserUpdate?: (userId: string, updates: Partial<UserType>) => Promise<void>;
  onUserDelete?: (userId: string) => Promise<void>;
}

export function UserManagement({ currentUser, ...handlers }: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Complex state management and business logic
  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        {/* Stat cards */}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        {/* Filter controls */}
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

### Templates (`src/components/templates/`)
**Purpose**: Page-level layouts that define the structure without specific content.

**Examples:**
- DashboardLayout (sidebar + header + content area)
- AuthLayout (centered form container)

**Characteristics:**
- Define page structure
- No business data
- Reusable layouts
- Accept children components

**Implementation:**
```typescript
// DashboardLayout Template
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Pages (`app/` directory)
**Purpose**: Specific instances of templates with real content and data.

**Examples:**
- Dashboard page
- Login page
- Transaction analysis page

**Characteristics:**
- Concrete implementations
- Contain business data
- Route-specific
- Orchestrate multiple organisms

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

## Code Organization Rules

### File Naming Conventions
- **Files**: kebab-case (`user-profile.tsx`, `data-table.tsx`, `theme-context.tsx`)
- **Components**: PascalCase in code (`UserProfile`, `DataTable`)
- **Hooks**: camelCase with 'use' prefix (`useUserData`)
- **Services**: PascalCase with 'Service' suffix (`UserService`)
- **Stores**: PascalCase with 'Store' suffix (`UserStore`)
- **Types**: PascalCase (`User`, `ApiResponse`)

### Directory Structure
```
components/
├── atoms/           # Basic elements
│   ├── index.ts    # Barrel exports
│   ├── button.tsx
│   └── input.tsx
├── molecules/       # Component groups
│   ├── index.ts
│   ├── login-form.tsx
│   └── transaction-form.tsx
├── organisms/       # Complex components
│   ├── index.ts
│   ├── user-management.tsx
│   └── fraud-map.tsx
└── index.ts        # Main component exports
```

### Import Patterns
```typescript
// Barrel exports for clean imports
export { Button } from './atoms/button';
export { Input } from './atoms/input';
export { LoginForm } from './molecules/login-form';
export { UserManagement } from './organisms/user-management';
```

## Best Practices

### Component Design
1. **Single Responsibility**: Each component should do one thing well
2. **Props Interface**: Define clear prop interfaces with TypeScript
3. **Default Props**: Provide sensible defaults for optional props
4. **Accessibility**: Include ARIA attributes and keyboard navigation
5. **Error Boundaries**: Implement error boundaries for complex components

### State Management
1. **Local State**: Use React state for component-specific state
2. **Global State**: Use Zustand stores for shared state
3. **Derived State**: Use selectors for computed values
4. **Effects**: Handle side effects in useEffect hooks

### Styling Guidelines
1. **TailwindCSS**: Use utility classes for styling
2. **Design Tokens**: Consistent spacing, colors, and typography
3. **Responsive Design**: Mobile-first approach
4. **Dark Mode**: Support for light and dark themes

### Performance Considerations
1. **Memoization**: Use React.memo for expensive components
2. **Code Splitting**: Lazy load components when possible
3. **Bundle Analysis**: Monitor bundle size and optimize
4. **Virtual Scrolling**: For large lists and tables

## Component Testing Strategy

### Unit Tests
- **Atoms**: Test props, styling, accessibility
- **Molecules**: Test interactions, validation, state changes
- **Organisms**: Test integration, data flow, user workflows

### Integration Tests
- **Templates**: Test layout responsiveness, navigation
- **Pages**: Test complete user flows, data loading

### Visual Regression Tests
- **Components**: Screenshot comparison for UI consistency
- **Responsive Design**: Test across different screen sizes

## Maintenance and Evolution

### Component Lifecycle
1. **Creation**: Follow the atomic design hierarchy
2. **Review**: Code review for consistency and best practices
3. **Documentation**: Update component documentation
4. **Testing**: Add comprehensive tests
5. **Deprecation**: Mark old components as deprecated before removal

### Design System Updates
1. **Design Tokens**: Update colors, spacing, typography centrally
2. **Component Variants**: Add new variants without breaking changes
3. **Migration Guide**: Provide clear migration paths for breaking changes
4. **Versioning**: Semantic versioning for component libraries
