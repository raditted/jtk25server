import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(password);
      navigate('/admin', { replace: true });
    } catch {
      setError('Password salah atau tidak dikenali.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Ganti tema">
          Tema
        </Button>
      </div>

      <div className="card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950">
            <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary-token">Admin Login</h1>
          <p className="mt-1 text-sm text-secondary-token">
            Masukkan password untuk mengakses panel admin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoFocus
            autoComplete="current-password"
            className="text-center tracking-wider"
          />

          <Button
            type="submit"
            variant="primary"
            block
            loading={loading}
            disabled={!password}
          >
            Masuk
          </Button>
        </form>

        <a
          href="/"
          className="mt-6 flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-sm text-muted-token transition-colors hover:text-primary-token"
        >
          Kembali ke situs publik
        </a>
      </div>
    </div>
  );
}