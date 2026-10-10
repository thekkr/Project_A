'use client';
import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import Link from 'next/link';
import BannerCarousel from '@/components/ui/BannerCarousel';

const fetcher = (url: string) => api.get(url).then(r => r.data);

// Distinct gradient backgrounds for featured cards (no article images yet)
const GRADIENTS = [
  'linear-gradient(135deg, #0E1B2E 0%, #1E3A5F 100%)',
  'linear-gradient(135deg, #1A1A2E 0%, #2D1B4E 100%)',
  'linear-gradient(135deg, #0E2A1B 0%, #1A4A2E 100%)',
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const params = new URLSearchParams({ status: 'PUBLISHED' });
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  const { data: articles, isLoading } = useSWR(`/articles/?${params}`, fetcher);
  const { data: allPublished } = useSWR('/articles/?status=PUBLISHED', fetcher);
  const { data: categories } = useSWR('/categories/', fetcher);

  const featured: any[] = allPublished?.results?.slice(0, 3) ?? [];
  const isFiltered = !!(search || category);

  return (
    <div>
      <BannerCarousel />

      <div className="max-w-5xl mx-auto px-6">

        {/* ── Featured section (hidden when filtering) ── */}
        {featured.length > 0 && (
          <section className="pt-10 pb-8">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'var(--accent)' }}
              >
                Featured
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <div className={featured.length > 1 ? 'featured-grid' : 'grid gap-4'}>
              {/* Hero card */}
              {featured[0] && (
                <Link
                  href={`/articles/${featured[0].id}`}
                  className="featured-hero-card group"
                  style={{ background: GRADIENTS[0] }}
                >
                  <div className="featured-hero-body">
                    {featured[0].category?.name && (
                      <span className="featured-category-pill">
                        {featured[0].category.name}
                      </span>
                    )}
                    <h2 className="featured-hero-title">
                      {featured[0].title}
                    </h2>
                    <p className="featured-meta">
                      {featured[0].author} · {new Date(featured[0].created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              )}

              {/* Side stack */}
              {featured.length > 1 && (
                <div className="flex flex-col gap-4">
                  {featured.slice(1, 3).map((a: any, i: number) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.id}`}
                      className="featured-side-card group"
                      style={{ background: GRADIENTS[i + 1], flex: 1 }}
                    >
                      <div className="featured-side-body">
                        {a.category?.name && (
                          <span className="featured-category-pill">
                            {a.category.name}
                          </span>
                        )}
                        <h3 className="featured-side-title">{a.title}</h3>
                        <p className="featured-meta">
                          {a.author} · {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Latest + filters ── */}
        <section className="pb-12">
          {/* Section header row */}
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {!isFiltered && (
                <div className="flex items-center gap-3 mr-2">
                  <span
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--accent)' }}
                  >
                    Latest
                  </span>
                  <div className="w-px h-4" style={{ background: 'var(--border)' }} />
                </div>
              )}
              {/* Category pills */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setCategory('')}
                  className={`category-pill${!category ? ' category-pill-active' : ''}`}
                >
                  All
                </button>
                {categories?.results?.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(String(c.id))}
                    className={`category-pill${category === String(c.id) ? ' category-pill-active' : ''}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="search-input-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-icon">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="search-input"
                placeholder="Search articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Article grid */}
          {isLoading && (
            <div className="article-grid">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="article-skeleton" />
              ))}
            </div>
          )}

          {!isLoading && articles?.results?.length === 0 && (
            <div className="empty-state">
              <p style={{ color: 'var(--muted)' }}>
                {isFiltered ? 'No articles match your filter.' : 'No published articles yet.'}
              </p>
              {isFiltered && (
                <button
                  onClick={() => { setSearch(''); setCategory(''); }}
                  className="empty-reset-btn"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!isLoading && articles?.results?.length > 0 && (
            <div className="article-grid">
              {articles.results.map((a: any) => (
                <Link key={a.id} href={`/articles/${a.id}`} className="article-card group">
                  <div className="article-card-accent" />
                  <div className="article-card-body">
                    {a.category?.name && (
                      <span className="article-card-category">{a.category.name}</span>
                    )}
                    <h3 className="article-card-title">{a.title}</h3>
                    <p className="article-card-meta">
                      {a.author} · {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
