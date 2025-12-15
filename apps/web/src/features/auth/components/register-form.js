import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '../hooks/use-auth';
export function RegisterForm() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();
    const { mutate: register, isPending, error } = useRegister();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        register({ email, username, displayName, password }, {
            onSuccess: () => {
                navigate('/');
            },
        });
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white", children: "Create your account" }), _jsxs("p", { className: "mt-2 text-center text-sm text-gray-600 dark:text-gray-400", children: ["Or", ' ', _jsx(Link, { to: "/login", className: "font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400", children: "sign in to existing account" })] })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [error && (_jsx("div", { className: "rounded-md bg-red-50 dark:bg-red-900/20 p-4", children: _jsx("p", { className: "text-sm text-red-800 dark:text-red-400", children: error instanceof Error ? error.message : 'Registration failed. Please try again.' }) })), _jsxs("div", { className: "rounded-md shadow-sm space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "sr-only", children: "Email address" }), _jsx("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Email address" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "username", className: "sr-only", children: "Username" }), _jsx("input", { id: "username", name: "username", type: "text", autoComplete: "username", required: true, minLength: 3, maxLength: 50, value: username, onChange: (e) => setUsername(e.target.value), className: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Username" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "displayName", className: "sr-only", children: "Display Name" }), _jsx("input", { id: "displayName", name: "displayName", type: "text", autoComplete: "name", required: true, minLength: 3, maxLength: 100, value: displayName, onChange: (e) => setDisplayName(e.target.value), className: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Display Name" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsx("input", { id: "password", name: "password", type: "password", autoComplete: "new-password", required: true, minLength: 8, value: password, onChange: (e) => setPassword(e.target.value), className: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Password (min 8 characters)" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmPassword", className: "sr-only", children: "Confirm Password" }), _jsx("input", { id: "confirmPassword", name: "confirmPassword", type: "password", autoComplete: "new-password", required: true, minLength: 8, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Confirm Password" })] })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isPending, className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed", children: isPending ? 'Creating account...' : 'Create account' }) })] })] }) }));
}
//# sourceMappingURL=register-form.js.map