'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout, isLoggedIn } from '@/lib/auth';

export default function Nav() {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg tracking-tight">Aavarana</Link>
      <div className="flex gap-4 text-sm">
        <Link href="/" className="hover:underline">Articles</Link>
        <Link href="/dashboard/author" className="hover:underline">Author</Link>
        <Link href="/dashboard/editor" className="hover:underline">Editor</Link>
        <Link href="/dashboard/admin" className="hover:underline">Admin</Link>
        {isLoggedIn()
          ? <button onClick={handleLogout} className="hover:underline">Logout</button>
          : <Link href="/login" className="hover:underline">Login</Link>
        }
      </div>
    </nav>
  );
}
