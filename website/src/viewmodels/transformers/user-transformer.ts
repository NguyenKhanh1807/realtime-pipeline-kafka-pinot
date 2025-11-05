import { User } from '@/src/viewmodels/stores/app-store';
import { UserViewModel } from '@/src/viewmodels/types';
import { formatUserName } from '@/src/utils/formatters';
import { getInitials } from '@/src/utils/helpers';

/**
 * User data transformers - convert domain models to view models
 * Handles all data transformation logic for user-related data
 */

export class UserTransformer {
  /**
   * Transform domain User to UserViewModel
   */
  static toViewModel(user: User): UserViewModel {
    return {
      id: user.id,
      displayName: this.getDisplayName(user),
      email: user.email,
      avatarUrl: user.avatar,
      role: user.role,
      isOnline: this.isUserOnline(user),
      lastActive: this.getLastActive(user),
      permissions: this.getPermissions(user.role),
    };
  }

  /**
   * Transform array of domain Users to UserViewModels
   */
  static toViewModels(users: User[]): UserViewModel[] {
    return users.map(user => this.toViewModel(user));
  }

  /**
   * Transform UserViewModel to API payload for updates
   */
  static toUpdatePayload(viewModel: Partial<UserViewModel>): Partial<User> {
    const payload: Partial<User> = {};

    if (viewModel.displayName !== undefined) {
      // Parse display name back to first/last name if needed
      const names = viewModel.displayName.split(' ');
      if (names.length >= 2) {
        payload.name = {
          first: names[0],
          last: names.slice(1).join(' '),
        };
      }
    }

    if (viewModel.email !== undefined) {
      payload.email = viewModel.email;
    }

    if (viewModel.avatarUrl !== undefined) {
      payload.avatar = viewModel.avatarUrl;
    }

    return payload;
  }

  /**
   * Get user display name with fallback logic
   */
  private static getDisplayName(user: User): string {
    if (user.name?.first || user.name?.last) {
      return formatUserName(user.name.first, user.name.last, user.email);
    }
    return user.email.split('@')[0]; // Fallback to email username
  }

  /**
   * Determine if user is online (mock implementation)
   */
  private static isUserOnline(user: User): boolean {
    // In a real app, this would check:
    // - WebSocket connections
    // - Last activity timestamp
    // - Real-time presence data
    const lastActive = this.getLastActive(user);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActive > fiveMinutesAgo;
  }

  /**
   * Get user's last active timestamp
   */
  private static getLastActive(user: User): Date {
    // In a real app, this would come from user.lastActivity or similar
    // For now, return a recent timestamp
    return new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Random within last 24h
  }

  /**
   * Get permissions based on user role
   */
  private static getPermissions(role: string): string[] {
    const basePermissions = [
      'read:profile',
      'write:profile',
      'read:own-data',
    ];

    switch (role) {
      case 'admin':
        return [
          ...basePermissions,
          'write:users',
          'delete:users',
          'manage:system',
          'view:analytics',
          'manage:billing',
          'moderate:content',
          'view:all-data',
        ];
      case 'moderator':
        return [
          ...basePermissions,
          'moderate:users',
          'view:reports',
          'manage:content',
          'moderate:comments',
        ];
      case 'user':
      default:
        return basePermissions;
    }
  }

  /**
   * Transform for compact user display (e.g., in lists)
   */
  static toCompactViewModel(user: User): Pick<UserViewModel, 'id' | 'displayName' | 'email' | 'avatarUrl' | 'isOnline'> {
    return {
      id: user.id,
      displayName: this.getDisplayName(user),
      email: user.email,
      avatarUrl: user.avatar,
      isOnline: this.isUserOnline(user),
    };
  }

  /**
   * Transform for user mention/search results
   */
  static toMentionViewModel(user: User): { id: string; displayName: string; avatarUrl?: string; initials: string } {
    const displayName = this.getDisplayName(user);
    return {
      id: user.id,
      displayName,
      avatarUrl: user.avatar,
      initials: getInitials(displayName),
    };
  }

  /**
   * Sanitize user data for public display
   */
  static toPublicViewModel(user: User): Omit<UserViewModel, 'email'> {
    const viewModel = this.toViewModel(user);
    // Remove sensitive data for public display
    const { email, ...publicData } = viewModel;
    return publicData;
  }
}
