/**
 * User Management Store
 * Manages user list state and operations
 * Uses UserManagementCommands for operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UserManagementCommands, type UserFilters, type CreateUserData, type UpdateUserData } from '@/src/view-models/commands/user-management-commands';
import type { User as UserType } from '@/src/types';

export interface UserManagementState {
  users: UserType[];
  isLoading: boolean;
  error: string | null;
  filters: UserFilters;
}

export interface UserManagementActions {
  loadUsers: (filters?: UserFilters) => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<void>;
  updateUserPassword: (userId: string, updateData: UpdateUserData) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  setFilters: (filters: UserFilters) => void;
  clearError: () => void;
}

export type UserManagementStore = UserManagementState & UserManagementActions;

const initialState: UserManagementState = {
  users: [],
  isLoading: false,
  error: null,
  filters: {},
};

export const useUserManagementStore = create<UserManagementStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      loadUsers: async (filters?: UserFilters) => {
        set({ isLoading: true, error: null });
        try {
          const users = await UserManagementCommands.loadUsers(filters || get().filters);
          set({ users, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createUser: async (userData: CreateUserData) => {
        set({ isLoading: true, error: null });
        try {
          const newUser = await UserManagementCommands.createUser(userData);
          set(state => ({
            users: [...state.users, newUser],
            isLoading: false,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateUserPassword: async (userId: string, updateData: UpdateUserData) => {
        set({ isLoading: true, error: null });
        try {
          await UserManagementCommands.updateUserPassword(userId, updateData);
          // Reload users to get updated data
          await get().loadUsers();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deleteUser: async (username: string) => {
        set({ isLoading: true, error: null });
        try {
          await UserManagementCommands.deleteUser(username);
          set(state => ({
            users: state.users.filter(u => u.username !== username),
            isLoading: false,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      setFilters: (filters: UserFilters) => {
        set({ filters });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'UserManagementStore' }
  )
);

