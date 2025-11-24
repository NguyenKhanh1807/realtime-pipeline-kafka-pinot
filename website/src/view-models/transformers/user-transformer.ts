import { User, UserViewModel } from '@/src/view-models';
import { formatUserName, getInitials } from '@/src/utils/';

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
      // Use display name as username
      payload.username = viewModel.displayName;
      payload.id = viewModel.displayName; // Keep id in sync
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
    // Use username as primary display name
    if (user.username) {
      return user.username;
    }
    // Fallback to email or id
    return user.email || user.id || 'Unknown User';
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
