import { useAppStore, UserViewModel} from '@/src/view-models';
import { formatUserName, getInitials } from '@/src/utils';

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
