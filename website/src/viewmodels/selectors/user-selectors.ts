import { useAppStore } from '@/src/viewmodels/stores';
import { UserViewModel } from '@/src/viewmodels/types';
import { formatUserName } from '@/src/utils/formatters';
import { getInitials } from '@/src/utils/helpers';

/**
 * User-related selectors that transform raw store data into view models
 */

export const useUserViewModel = (): UserViewModel | null => {
  const user = useAppStore((state) => state.user);

  if (!user) return null;

  return {
    id: user.id,
    displayName: formatUserName(user.name?.first, user.name?.last, user.email),
    email: user.email,
    avatarUrl: user.avatar,
    role: user.role,
    isOnline: true, // This could come from real-time data
    lastActive: new Date(), // This could come from user data
    permissions: getPermissionsForRole(user.role),
  };
};

export const useUserDisplayName = (): string => {
  const userViewModel = useUserViewModel();
  return userViewModel?.displayName || 'Anonymous User';
};

export const useUserInitials = (): string => {
  const userViewModel = useUserViewModel();
  if (!userViewModel) return 'AU'; // Anonymous User
  return getInitials(userViewModel.displayName);
};

export const useUserPermissions = (): string[] => {
  const userViewModel = useUserViewModel();
  return userViewModel?.permissions || [];
};

export const useIsAdmin = (): boolean => {
  const userViewModel = useUserViewModel();
  return userViewModel?.role === 'admin';
};

export const useIsModerator = (): boolean => {
  const userViewModel = useUserViewModel();
  return userViewModel?.role === 'moderator' || userViewModel?.role === 'admin';
};

export const useCanAccessAdmin = (): boolean => {
  const userViewModel = useUserViewModel();
  return userViewModel?.role === 'admin';
};

export const useCanModerateUsers = (): boolean => {
  const userViewModel = useUserViewModel();
  return ['admin', 'moderator'].includes(userViewModel?.role || '');
};

/**
 * Helper function to get permissions based on user role
 */
function getPermissionsForRole(role: string): string[] {
  const basePermissions = ['read:profile'];

  switch (role) {
    case 'admin':
      return [
        ...basePermissions,
        'write:users',
        'delete:users',
        'manage:system',
        'view:analytics',
        'manage:billing',
      ];
    case 'moderator':
      return [
        ...basePermissions,
        'moderate:users',
        'view:reports',
        'manage:content',
      ];
    case 'user':
    default:
      return basePermissions;
  }
}
