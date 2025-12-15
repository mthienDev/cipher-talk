import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, Mail } from 'lucide-react';
import { useLogin } from '../hooks/use-auth';
import { cn } from '../../../lib/utils';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(
      { email, password },
      {
        onSuccess: () => {
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          navigate('/');
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-white dark:bg-bg-primary">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[440px]">
        {/* Hero Section */}
        <div className="text-center mb-8">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-text-primary font-sans">
              CipherTalk
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-sm text-gray-600 dark:text-text-secondary font-sans">
            Secure enterprise chat with end-to-end encryption
          </p>

          {/* Security Trust Signal */}
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-success-bg">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-success font-sans">
              End-to-End Encrypted
            </span>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="card-elevated">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div
                className="rounded-lg p-4 border-l-4 bg-error-bg border-error"
                role="alert"
              >
                <p className="text-sm text-error font-sans">
                  {error instanceof Error ? error.message : 'Login failed. Please check your credentials.'}
                </p>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 dark:text-text-primary font-sans"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-500 dark:text-text-secondary" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11 font-sans"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900 dark:text-text-primary font-sans"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-500 dark:text-text-secondary" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-11 pr-12 font-sans"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={cn(
                    "w-4 h-4 rounded border transition-colors cursor-pointer",
                    rememberMe
                      ? "bg-primary-500 border-primary-500"
                      : "bg-white dark:bg-bg-tertiary border-gray-300 dark:border-border-default"
                  )}
                />
                <span className="text-sm select-none text-gray-600 dark:text-text-secondary font-sans">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors font-sans"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isPending}
              className={cn("btn btn-primary w-full font-sans")}
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-border-default" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-bg-secondary text-gray-600 dark:text-text-secondary font-sans">
                  New to CipherTalk?
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link
                to="/register"
                className="btn btn-secondary w-full font-sans"
              >
                Create an account
              </Link>
            </div>
          </form>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs mt-6 text-gray-600 dark:text-text-secondary font-sans">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
