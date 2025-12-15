import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { useLogout } from '../features/auth/hooks/use-auth';
import { ThemeToggle } from './theme-toggle';
export function Header() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const { mutate: logout, isPending } = useLogout();
    const handleLogout = () => {
        logout(undefined, {
            onSuccess: () => {
                navigate('/login');
            },
        });
    };
    if (!isAuthenticated) {
        return null;
    }
    return (_jsx("header", { className: "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between items-center h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx("h1", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "CipherTalk" }) }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: user?.displayName || user?.username }), _jsx(ThemeToggle, {}), _jsx("button", { onClick: handleLogout, disabled: isPending, className: "px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed", children: isPending ? 'Logging out...' : 'Logout' })] })] }) }) }));
}
//# sourceMappingURL=header.js.map