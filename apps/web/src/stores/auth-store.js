import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create()(persist((set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    setAuth: (user, accessToken) => set({
        user,
        accessToken,
        isAuthenticated: true,
    }),
    updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
    })),
    logout: () => set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
    }),
}), {
    name: 'ciphertalk-auth',
    partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
    }),
}));
//# sourceMappingURL=auth-store.js.map