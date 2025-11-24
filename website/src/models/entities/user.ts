/**
 * User Domain Entity
 * Represents a user in the fraud detection system
 */

import type {
  UserId,
  Email,
  Username,
  PasswordHash,
  Timestamp,
  EntityStatus,
} from '@/src/models/types';
import type { UserRole } from '@/src/models/types/auth';

export interface UserProps {
  id: UserId;
  username: Username;
  email: Email;
  passwordHash: PasswordHash;
  role: UserRole;
  status: EntityStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  loginAttempts: number;
  lockoutUntil?: Timestamp;
  metadata?: Record<string, unknown>;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  // Getters
  get id(): UserId { return this.props.id; }
  get username(): Username { return this.props.username; }
  get email(): Email { return this.props.email; }
  get role(): UserRole { return this.props.role; }
  get status(): EntityStatus { return this.props.status; }
  get createdAt(): Timestamp { return this.props.createdAt; }
  get updatedAt(): Timestamp { return this.props.updatedAt; }
  get lastLoginAt(): Timestamp | undefined { return this.props.lastLoginAt; }
  get loginAttempts(): number { return this.props.loginAttempts; }
  get lockoutUntil(): Timestamp | undefined { return this.props.lockoutUntil; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }

  // Business logic methods
  isActive(): boolean {
    return this.props.status === 'active';
  }

  isLocked(): boolean {
    return this.props.lockoutUntil ? this.props.lockoutUntil > new Date() : false;
  }

  canLogin(): boolean {
    return this.isActive() && !this.isLocked();
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.loginAttempts = 0;
    this.props.updatedAt = new Date();
  }

  recordFailedLogin(): void {
    this.props.loginAttempts += 1;
    this.props.updatedAt = new Date();

    // Lock account after 5 failed attempts
    if (this.props.loginAttempts >= 5) {
      this.props.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  updateProfile(updates: Partial<Pick<UserProps, 'email' | 'metadata'>>): void {
    if (updates.email) {
      this.validateEmail(updates.email);
      this.props.email = updates.email;
    }

    if (updates.metadata) {
      this.props.metadata = { ...this.props.metadata, ...updates.metadata };
    }

    this.props.updatedAt = new Date();
  }

  changePassword(newPasswordHash: PasswordHash): void {
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  changeRole(newRole: UserRole): void {
    this.props.role = newRole;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  // Validation
  private validateProps(props: UserProps): void {
    if (!props.id) throw new Error('User ID is required');
    if (!props.username) throw new Error('Username is required');
    if (!props.email) throw new Error('Email is required');
    if (!props.passwordHash) throw new Error('Password hash is required');

    this.validateEmail(props.email);
    this.validateUsername(props.username);
  }

  private validateEmail(email: Email): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validateUsername(username: Username): void {
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (username.length > 50) {
      throw new Error('Username must be less than 50 characters long');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }

  // Factory methods
  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt' | 'loginAttempts'>): User {
    const now = new Date();
    return new User({
      ...props,
      id: crypto.randomUUID(), // In real app, use proper ID generation
      createdAt: now,
      updatedAt: now,
      loginAttempts: 0,
    });
  }

  /**
   * Create User entity from API user data
   * Transforms API response to domain entity
   */
  static fromApiUser(apiUser: {
    username: string;
    password?: string; // This is the hashed password from API (may be missing for security)
    component?: string;
    role: string;
    tables?: string[];
    permissions?: string[]; // API may return this, but we don't use it (role-based access only)
    usernameWithComponent?: string;
  }): User {
    const now = new Date();

    // Normalize role: API returns uppercase (ADMIN, USER), convert to domain type
    const normalizedRole = apiUser.role.toLowerCase();
    const userRole: UserRole = (normalizedRole === 'admin' ? 'admin' : 'user');

    // Use username as email if email not provided (API compatibility)
    const email: Email = apiUser.username.includes('@') 
      ? apiUser.username as Email 
      : `${apiUser.username}@system.local` as Email;

    // Password hash: API may not return password for security reasons
    // If missing, use a placeholder that will fail validation if used for auth
    // This allows user entities to be created from API responses that don't include passwords
    const passwordHash: PasswordHash = apiUser.password 
      ? (apiUser.password as PasswordHash)
      : ('$2a$10$PLACEHOLDER_NO_PASSWORD_RETURNED' as PasswordHash);

    return new User({
      id: apiUser.username, // Use username as ID
      username: apiUser.username as Username,
      email: email,
      passwordHash: passwordHash,
      role: userRole,
      status: 'active' as EntityStatus,
      createdAt: now,
      updatedAt: now,
      loginAttempts: 0,
      metadata: {
        component: apiUser.component,
        tables: apiUser.tables || [],
        usernameWithComponent: apiUser.usernameWithComponent,
      },
    });
  }

  // Serialization for external use (API, storage, etc.)
  toJSON(): UserProps {
    return { ...this.props };
  }

  // For display purposes (ViewModel layer)
  toDisplay(): {
    id: UserId;
    username: Username;
    email: Email;
    role: UserRole;
    status: EntityStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastLoginAt?: Timestamp;
    isActive: boolean;
    isLocked: boolean;
  } {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      isActive: this.isActive(),
      isLocked: this.isLocked(),
    };
  }
}
