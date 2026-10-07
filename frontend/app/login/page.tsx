'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { login, loginWithGoogle } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogle(credentialResponse: any) {
    setError('');
    try {
      const { created, has_roles } = await loginWithGoogle(credentialResponse.credential);
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      if (created || !has_roles) {
        // New user or no roles yet — land on home, nav will show no role links until admin assigns
        window.location.href = next;
      } else {
        window.location.href = next;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google login failed.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || '/';
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Aavarana</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError('Google login failed.')}
                width="100%"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
