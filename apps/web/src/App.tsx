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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
              Welcome to CipherTalk
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              End-to-end encrypted messaging for enterprise teams.
            </p>

            <div className="mt-6 rounded bg-gray-100 dark:bg-gray-700 p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Logged in as: <span className="font-medium">{user?.displayName || user?.username}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Email: {user?.email}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
