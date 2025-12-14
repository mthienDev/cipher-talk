import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/auth-store';
import { authApi } from '../api/auth-api';
import type { User } from '@ciphertalk/shared';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      localStorage.setItem('refreshToken', data.refreshToken);
      // Note: Backend should return user data in auth response
      // For now using placeholder
      const placeholder: User = {
        id: '',
        email: '',
        username: '',
        displayName: '',
        avatarUrl: undefined,
        status: 'online',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAuth(placeholder, data.accessToken);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      localStorage.setItem('refreshToken', data.refreshToken);
      const placeholder: User = {
        id: '',
        email: '',
        username: '',
        displayName: '',
        avatarUrl: undefined,
        status: 'online',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAuth(placeholder, data.accessToken);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: () => {
      logout();
      localStorage.removeItem('refreshToken');
    },
  });
}
