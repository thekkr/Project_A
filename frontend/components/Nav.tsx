'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { logout, isLoggedIn } from '@/lib/auth';
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

// ── Icons ──────────────────────────────────────────────────
function IcoArticles({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}
function IcoMyArticles({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}
function IcoReviewQueue({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}
function IcoAdmin({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IcoProfile({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IcoWrite() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IcoChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Avatar chip ────────────────────────────────────────────
function Avatar({ me, size = 28 }: { me: any; size?: number }) {
  const initials = ((me.first_name?.[0] || '') + (me.last_name?.[0] || '') || me.username?.[0] || '?').toUpperCase();
  if (me.avatar_url) {
    return <img src={me.avatar_url} alt="" width={size} height={size}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{ width: size, height: size, background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function Nav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRefDesktop = useRef<HTMLDivElement>(null);
  const dropRefMobile  = useRef<HTMLDivElement>(null);

  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);
  const { data: me } = useSWR(loggedIn ? '/users/me/' : null, fetcher);

  const isAuthor = !!me?.roles?.some((r: any) => r.name === 'AUTHOR');
  const isEditor = !!me?.roles?.some((r: any) => r.name === 'EDITOR');
  const isAdmin  = !!me?.roles?.some((r: any) => r.name === 'ADMIN');

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      const inDesktop = dropRefDesktop.current?.contains(t);
      const inMobile  = dropRefMobile.current?.contains(t);
      if (!inDesktop && !inMobile) setDropOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleLogout() { logout(); window.location.href = '/login'; }

  const navLinkStyle = { color: 'var(--nav-link)' };
  const activeLinkStyle = { color: 'var(--nav-fg)' };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/articles')
    : pathname.startsWith(href);

  // Mobile bottom tab items
  const tabs = [
    { href: '/', label: 'Articles', Icon: IcoArticles },
    ...(isAuthor ? [{ href: '/dashboard/author',  label: 'My Articles',   Icon: IcoMyArticles   }] : []),
    ...(isEditor ? [{ href: '/dashboard/editor',  label: 'Review Queue',  Icon: IcoReviewQueue  }] : []),
    ...(isAdmin  ? [{ href: '/dashboard/admin',   label: 'Admin',         Icon: IcoAdmin        }] : []),
    ...(loggedIn && me ? [{ href: '/profile', label: 'Profile', Icon: IcoProfile }] : []),
  ];

  return (
    <>
      {/* ══════════ DESKTOP NAV (md+) ══════════════════════ */}
      <nav
        className="hidden md:flex items-center px-6 py-0 h-12"
        style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)' }}
      >
        <Link href="/" className="font-bold text-base tracking-tight mr-6"
          style={{ color: 'var(--nav-fg)', fontFamily: 'var(--font-display, Georgia, serif)' }}>
          Aavarana
        </Link>

        <div className="flex items-center gap-1 mr-auto text-sm">
          <Link href="/" className="px-3 py-1 rounded transition-colors hover:bg-white/10"
            style={isActive('/') ? activeLinkStyle : navLinkStyle}>
            Articles
          </Link>
          {isAuthor && (
            <Link href="/dashboard/author" className="px-3 py-1 rounded transition-colors hover:bg-white/10"
              style={isActive('/dashboard/author') ? activeLinkStyle : navLinkStyle}>
              My Articles
            </Link>
          )}
          {isEditor && (
            <Link href="/dashboard/editor" className="px-3 py-1 rounded transition-colors hover:bg-white/10"
              style={isActive('/dashboard/editor') ? activeLinkStyle : navLinkStyle}>
              Review Queue
            </Link>
          )}
          {isAdmin && (
            <Link href="/dashboard/admin" className="px-3 py-1 rounded transition-colors hover:bg-white/10"
              style={isActive('/dashboard/admin') ? activeLinkStyle : navLinkStyle}>
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthor && (
            <Link href="/dashboard/author"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-opacity hover:opacity-85"
              style={{ border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
              <IcoWrite />
              Write
            </Link>
          )}

          {loggedIn && me && (
            <div className="relative" ref={dropRefDesktop}>
              <button onClick={() => setDropOpen(o => !o)}
                className="flex items-center gap-1.5 hover:opacity-80 focus:outline-none">
                <Avatar me={me} size={28} />
                <span className="text-xs hidden lg:block" style={navLinkStyle}>{me.username}</span>
                <span style={{ color: 'var(--nav-link)', opacity: 0.7 }}><IcoChevron /></span>
              </button>
              {dropOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-1 z-50 text-gray-800">
                  <Link href="/profile" onClick={() => setDropOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {loggedIn && !me && (
            <button onClick={handleLogout} className="text-sm hover:underline" style={navLinkStyle}>Logout</button>
          )}

          {!loggedIn && (
            <Link href="/login"
              className="text-sm font-semibold px-3 py-1.5 rounded transition-opacity hover:opacity-85"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* ══════════ MOBILE TOP BAR (< md) ══════════════════ */}
      <div className="flex md:hidden items-center px-4 h-12"
        style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)' }}>
        <Link href="/" className="font-bold text-base tracking-tight mr-auto"
          style={{ color: 'var(--nav-fg)', fontFamily: 'var(--font-display, Georgia, serif)' }}>
          Aavarana
        </Link>

        {loggedIn && me ? (
          <div className="relative" ref={dropRefMobile}>
            <button onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-2 hover:opacity-80 focus:outline-none">
              <Avatar me={me} size={30} />
            </button>
            {dropOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg py-1 z-50 text-gray-800">
                <Link href="/profile" onClick={() => setDropOpen(false)}
                  className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
                <hr className="my-1 border-gray-100" />
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : !loggedIn ? (
          <Link href="/login"
            className="text-sm font-semibold px-3 py-1.5 rounded"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            Login
          </Link>
        ) : null}
      </div>

      {/* ══════════ MOBILE BOTTOM TAB BAR ══════════════════ */}
      {loggedIn && me && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          style={{ background: 'var(--nav-bg)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-around h-14 relative">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              // Leave space in center for Write FAB
              if (isAuthor && tabs.indexOf(tab) === Math.floor(tabs.length / 2)) {
                return (
                  <div key="fab-spacer" className="w-14 flex-shrink-0" />
                );
              }
              return (
                <Link key={tab.href} href={tab.href}
                  className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-[48px]"
                  style={{ color: active ? 'var(--nav-fg)' : 'var(--nav-link)' }}>
                  <tab.Icon active={active} />
                  <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
                  {active && (
                    <div className="w-1 h-1 rounded-full"
                      style={{ background: 'var(--accent)' }} />
                  )}
                </Link>
              );
            })}

            {/* Write FAB */}
            {isAuthor && (
              <Link href="/dashboard/author"
                className="absolute left-1/2 -translate-x-1/2 -top-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)', boxShadow: '0 4px 14px rgba(245,158,11,0.5)' }}>
                <IcoWrite />
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Bottom spacer so content isn't hidden behind tab bar */}
      {loggedIn && me && <div className="h-14 md:hidden" />}
    </>
  );
}
