'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { logout, isLoggedIn } from '@/lib/auth';
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function Nav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);
  const { data: me } = useSWR(loggedIn ? '/users/me/' : null, fetcher);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    window.location.href = '/login';
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
        {loggedIn && me && (
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-1.5 hover:opacity-80 focus:outline-none"
            >
              {me.avatar_url ? (
                <img src={me.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                  {((me.first_name?.[0] || '') + (me.last_name?.[0] || '') || me.username?.[0] || '?').toUpperCase()}
                </div>
              )}
              <span className="text-gray-300 text-xs">{me.username}</span>
              <svg className="w-3 h-3 text-gray-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-1 z-50 text-gray-800">
                <Link
                  href="/profile"
                  onClick={() => setDropOpen(false)}
                  className="block px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Profile
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
        {loggedIn && !me && (
          <button onClick={handleLogout} className="hover:underline text-sm">Logout</button>
        )}
        {!loggedIn && (
          <Link href="/login" className="hover:underline">Login</Link>
        )}
      </div>
    </nav>
  );
}
