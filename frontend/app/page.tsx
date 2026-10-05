'use client';
import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const params = new URLSearchParams({ status: 'PUBLISHED' });
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  const { data: articles, isLoading } = useSWR(`/articles/?${params}`, fetcher);
  const { data: categories } = useSWR('/categories/', fetcher);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Articles</h1>

      <div className="flex gap-3 mb-6">
        <input
          className="border rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories?.results?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}

      <div className="space-y-4">
        {articles?.results?.map((a: any) => (
          <div key={a.id} className="bg-white rounded-lg border p-5">
            <Link href={`/articles/${a.id}`} className="text-xl font-semibold hover:underline">
              {a.title}
            </Link>
            <p className="text-sm text-gray-500 mt-1">
              {a.author} · {a.category?.name} · {new Date(a.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {articles?.results?.length === 0 && (
          <p className="text-gray-500">No published articles yet.</p>
        )}
      </div>
    </div>
  );
}
