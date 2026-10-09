'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { logout, isLoggedIn } from '@/lib/auth';
import useSWR from 'swr';
import api from '@/lib/api';
import { LimelightNav, NavItem } from '@/components/ui/limelight-nav';

const fetcher = (url: string) => api.get(url).then(r => r.data);

// ── Shared icon set (no active prop — LimelightNav handles opacity) ──────────
const IcoArticles = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);
const IcoMyArticles = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);
const IcoReviewQueue = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);
const IcoAdmin = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IcoProfile = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IcoWrite = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
function IcoChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Avatar chip ────────────────────────────────────────────
function Avatar({ me, size = 28 }: { me: any; size?: number }) {
  const initials = ((me.first_name?.[0] || '') + (me.last_name?.[0] || '') || me.username?.[0] || '?').toUpperCase();
  if (me.avatar_url) {
    return <img src={me.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{ width: size, height: size, background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────
type TabDef = NavItem & { href: string };

function buildLinks(opts: {
  isAuthor: boolean; isEditor: boolean; isAdmin: boolean; loggedIn: boolean; me: any;
  router: ReturnType<typeof useRouter>;
}): TabDef[] {
  const { isAuthor, isEditor, isAdmin, loggedIn, me, router } = opts;
  const mk = (href: string, label: string, icon: React.ReactElement): TabDef => ({
    id: href, href, label, icon, onClick: () => router.push(href),
  });
  return [
    mk('/', 'Articles', IcoArticles),
    ...(isAuthor ? [mk('/dashboard/author', 'My Articles', IcoMyArticles)] : []),
    ...(isEditor ? [mk('/dashboard/editor', 'Review Queue', IcoReviewQueue)] : []),
    ...(isAdmin  ? [mk('/dashboard/admin',  'Admin',        IcoAdmin)]       : []),
    ...(loggedIn && me ? [mk('/profile', 'Profile', IcoProfile)] : []),
  ];
}

function activeIdx(tabs: TabDef[], pathname: string): number {
  // find last matching prefix (most specific wins)
  let best = 0;
  tabs.forEach((tab, i) => {
    if (tab.href === '/') {
      if (pathname === '/' || pathname.startsWith('/articles')) best = i;
    } else if (pathname.startsWith(tab.href)) {
      best = i;
    }
  });
  return best;
}

// ── Main component ─────────────────────────────────────────
export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();
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
      if (!dropRefDesktop.current?.contains(t) && !dropRefMobile.current?.contains(t))
        setDropOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleLogout() { logout(); window.location.href = '/login'; }

  const tabs = buildLinks({ isAuthor, isEditor, isAdmin, loggedIn, me, router });
  const currentIdx = activeIdx(tabs, pathname);

  const dropMenu = (onClose: () => void) => (
    <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-1 z-50 text-gray-800">
      <Link href="/profile" onClick={onClose} className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
      <hr className="my-1 border-gray-100" />
      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
        Logout
      </button>
    </div>
  );

  return (
    <>
      {/* ══════════ DESKTOP NAV (md+) ══════════════════════ */}
      <nav className="hidden md:flex items-center px-6 h-12"
        style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)' }}>

        <Link href="/" className="font-bold text-base tracking-tight mr-4 flex-shrink-0"
          style={{ color: 'var(--nav-fg)', fontFamily: 'var(--font-display, Georgia, serif)' }}>
          Aavarana
        </Link>

        {/* LimelightNav for links */}
        <div className="mr-auto" style={{ color: 'var(--nav-fg)' }}>
          <LimelightNav
            items={tabs}
            activeIndex={currentIdx}
            variant="icon-text"
            className="h-12 rounded-lg bg-transparent"
            limelightColor="var(--accent)"
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isAuthor && (
            <Link href="/dashboard/author"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-opacity hover:opacity-85"
              style={{ border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
              {IcoWrite}
              Write
            </Link>
          )}

          {loggedIn && me && (
            <div className="relative" ref={dropRefDesktop}>
              <button onClick={() => setDropOpen(o => !o)}
                className="flex items-center gap-1.5 hover:opacity-80 focus:outline-none">
                <Avatar me={me} size={28} />
                <span className="text-xs hidden lg:block" style={{ color: 'var(--nav-link)' }}>{me.username}</span>
                <span style={{ color: 'var(--nav-link)', opacity: 0.7 }}><IcoChevron /></span>
              </button>
              {dropOpen && dropMenu(() => setDropOpen(false))}
            </div>
          )}

          {loggedIn && !me && (
            <button onClick={handleLogout} className="text-sm hover:underline" style={{ color: 'var(--nav-link)' }}>Logout</button>
          )}

          {!loggedIn && (
            <Link href="/login" className="text-sm font-semibold px-3 py-1.5 rounded transition-opacity hover:opacity-85"
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
            <button onClick={() => setDropOpen(o => !o)} className="flex items-center hover:opacity-80 focus:outline-none">
              <Avatar me={me} size={30} />
            </button>
            {dropOpen && dropMenu(() => setDropOpen(false))}
          </div>
        ) : !loggedIn ? (
          <Link href="/login" className="text-sm font-semibold px-3 py-1.5 rounded"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            Login
          </Link>
        ) : null}
      </div>

      {/* ══════════ MOBILE BOTTOM TAB BAR ══════════════════ */}
      {loggedIn && me && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          style={{ background: 'var(--nav-bg)', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'var(--nav-fg)' }}>
          {/* Inner wrapper is relative so FAB can position absolute above bar */}
          <div className="relative">
            <LimelightNav
              items={tabs}
              activeIndex={currentIdx}
              variant="icon-label"
              className="w-full rounded-none h-14"
              limelightColor="var(--accent)"
            />

            {/* Write FAB floats above center of the bar */}
            {isAuthor && (
              <Link href="/dashboard/author"
                className="absolute left-1/2 -translate-x-1/2 -top-5 w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.55)',
                }}>
                {IcoWrite}
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Bottom spacer */}
      {loggedIn && me && <div className="h-14 md:hidden" />}
    </>
  );
}
