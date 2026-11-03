'use client';
import { use } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(r => r.data);

const ROLE_COLORS: Record<string, string> = {
  AUTHOR: 'bg-blue-100 text-blue-700',
  EDITOR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};

function Avatar({ user }: { user: any }) {
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase()
    || user.username?.[0]?.toUpperCase() || '?';

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.username}
        className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md"
      />
    );
  }
  return (
    <div
      className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white ring-4 ring-white shadow-md"
      style={{ background: 'var(--accent)' }}
    >
      {initials}
    </div>
  );
}

export default function AuthorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: profile, error: profileError } = useSWR(`/users/profile/${username}/`, fetcher);
  const { data: articles, isLoading: articlesLoading } = useSWR(
    profile ? `/articles/?author=${profile.id}&status=PUBLISHED` : null,
    fetcher,
  );

  if (profileError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">404</p>
        <p className="text-gray-500 mb-6">Author <strong>@{username}</strong> not found.</p>
        <Link href="/" className="text-sm underline text-gray-600 hover:text-gray-900">Back to home</Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gray-200" />
            <div className="space-y-3 flex-1">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username;
  const joinYear = new Date(profile.date_joined).getFullYear();
  const articleCount = articles?.count ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 pb-10 border-b" style={{ borderColor: 'var(--border)' }}>
        <Avatar user={profile} />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight mb-1" style={{ color: 'var(--fg)' }}>
            {displayName}
          </h1>
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>@{profile.username}</p>

          {profile.roles?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {profile.roles.map((r: any) => (
                <span key={r.id} className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[r.name] ?? 'bg-gray-100 text-gray-700'}`}>
                  {r.name.charAt(0) + r.name.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
          )}

          {profile.bio && (
            <p className="text-sm leading-relaxed mb-3 max-w-xl" style={{ color: 'var(--fg-muted, var(--muted))' }}>
              {profile.bio}
            </p>
          )}

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Member since {joinYear} · {articleCount} article{articleCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Articles section */}
      <div>
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--fg)' }}>
          Published Articles
        </h2>

        {articlesLoading && (
          <div className="article-grid">
            {[1, 2, 3].map(i => <div key={i} className="article-skeleton" />)}
          </div>
        )}

        {!articlesLoading && articleCount === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No published articles yet.</p>
        )}

        {!articlesLoading && articleCount > 0 && (
          <div className="article-grid">
            {articles.results.map((a: any) => (
              <Link key={a.id} href={`/articles/${a.id}`} className="article-card group">
                <div className="article-card-accent" />
                <div className="article-card-body">
                  {a.categories?.length > 0 && (
                    <span className="article-card-category">{a.categories.map((c: any) => c.name).join(', ')}</span>
                  )}
                  <h3 className="article-card-title">{a.title}</h3>
                  <p className="article-card-meta">
                    {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {a.like_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {a.comment_count ?? 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
