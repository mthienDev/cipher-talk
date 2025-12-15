import { create } from 'zustand';
import { persist } from 'zustand/middleware';
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    else {
        document.documentElement.classList.remove('dark');
    }
}
export const useThemeStore = create()(persist((set, get) => ({
    theme: 'dark',
    setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
    },
    toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
    },
    initTheme: () => {
        const stored = localStorage.getItem('ciphertalk-theme');
        let initialTheme;
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                initialTheme = parsed.state.theme;
            }
            catch (e) {
                // Fallback to system preference if parsing fails
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                initialTheme = prefersDark ? 'dark' : 'light';
            }
        }
        else {
            // No stored preference, check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            initialTheme = prefersDark ? 'dark' : 'light';
        }
        set({ theme: initialTheme });
        applyTheme(initialTheme);
    },
}), { name: 'ciphertalk-theme' }));
//# sourceMappingURL=theme-store.js.map