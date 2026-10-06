'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { logout, isLoggedIn } from '@/lib/auth';
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function Nav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);
  const { data: me } = useSWR(loggedIn ? '/users/me/' : null, fetcher);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg tracking-tight">Aavarana</Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/" className="hover:underline">Articles</Link>
        {me?.roles?.some((r: any) => r.name === 'AUTHOR') && (
          <Link href="/dashboard/author" className="hover:underline">Author</Link>
        )}
        {me?.roles?.some((r: any) => r.name === 'EDITOR') && (
          <Link href="/dashboard/editor" className="hover:underline">Editor</Link>
        )}
        {me?.roles?.some((r: any) => r.name === 'ADMIN') && (
          <Link href="/dashboard/admin" className="hover:underline">Admin</Link>
        )}
        {loggedIn ? (
          <>
            {me && (
              <span className="text-gray-400 text-xs">
                {me.username}
                {me.roles?.length > 0 && (
                  <span className="ml-1 text-gray-500">
                    ({me.roles.map((r: any) => r.name.toLowerCase()).join(', ')})
                  </span>
                )}
              </span>
            )}
            <button onClick={handleLogout} className="hover:underline">Logout</button>
          </>
        ) : (
          <Link href="/login" className="hover:underline">Login</Link>
        )}
      </div>
    </nav>
  );
}
