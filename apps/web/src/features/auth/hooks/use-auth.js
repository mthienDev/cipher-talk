import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/auth-store';
import { authApi } from '../api/auth-api';
export function useLogin() {
    const setAuth = useAuthStore((s) => s.setAuth);
    return useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            localStorage.setItem('refreshToken', data.refreshToken);
            setAuth(data.user, data.accessToken);
        },
    });
}
export function useRegister() {
    const setAuth = useAuthStore((s) => s.setAuth);
    return useMutation({
        mutationFn: authApi.register,
        onSuccess: (data) => {
            localStorage.setItem('refreshToken', data.refreshToken);
            setAuth(data.user, data.accessToken);
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
//# sourceMappingURL=use-auth.js.map