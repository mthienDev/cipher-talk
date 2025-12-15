import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/components/LoginPage';
import { RegisterForm } from './features/auth/components/register-form';
import { ProtectedRoute } from './components/protected-route';
import { Header } from './components/header';
import { useAuthStore } from './stores/auth-store';
import { useThemeStore } from './stores/theme-store';
function HomePage() {
    const { user } = useAuthStore();
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, {}), _jsx("main", { className: "p-8", children: _jsx("div", { className: "mx-auto max-w-4xl", children: _jsxs("div", { className: "rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-2xl font-semibold text-gray-900 dark:text-white", children: "Welcome to CipherTalk" }), _jsx("p", { className: "text-gray-600 dark:text-gray-300", children: "End-to-end encrypted messaging for enterprise teams." }), _jsxs("div", { className: "mt-6 rounded bg-gray-100 dark:bg-gray-700 p-4", children: [_jsxs("p", { className: "text-sm text-gray-700 dark:text-gray-300", children: ["Logged in as: ", _jsx("span", { className: "font-medium", children: user?.displayName || user?.username })] }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: ["Email: ", user?.email] })] })] }) }) })] }));
}
function App() {
    const { initTheme } = useThemeStore();
    useEffect(() => {
        initTheme();
    }, [initTheme]);
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterForm, {}) }), _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(HomePage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
export default App;
//# sourceMappingURL=App.js.map