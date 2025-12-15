import { jsx as _jsx } from "react/jsx-runtime";
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../stores/theme-store';
export function ThemeToggle() {
    const { theme, toggleTheme } = useThemeStore();
    return (_jsx("button", { onClick: toggleTheme, "aria-label": `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`, className: "p-2.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2", title: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`, children: theme === 'light' ? (_jsx(Moon, { size: 20, className: "text-gray-700 dark:text-gray-300 transition-transform" })) : (_jsx(Sun, { size: 20, className: "text-gray-700 dark:text-gray-300 transition-transform" })) }));
}
//# sourceMappingURL=theme-toggle.js.map