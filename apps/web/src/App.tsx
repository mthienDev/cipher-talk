import { useAuthStore } from '@/stores/auth-store';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 p-4">
        <h1 className="text-xl font-bold">CipherTalk</h1>
      </header>

      <main className="p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-slate-800 p-6">
            <h2 className="mb-4 text-2xl font-semibold">
              Secure Enterprise Chat
            </h2>
            <p className="text-slate-300">
              End-to-end encrypted messaging for enterprise teams.
            </p>

            <div className="mt-6 rounded bg-slate-700 p-4">
              <p className="text-sm text-slate-400">
                Status:{' '}
                {isAuthenticated ? (
                  <span className="text-green-400">
                    Authenticated as {user?.username}
                  </span>
                ) : (
                  <span className="text-yellow-400">Not authenticated</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
