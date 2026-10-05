'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  NEEDS_REVISION: 'bg-yellow-100 text-yellow-700',
  PUBLISHED: 'bg-green-100 text-green-700',
};

export default function AuthorDashboard() {
  const { data: articles, isLoading } = useSWR('/articles/', fetcher);
  const { data: categories } = useSWR('/categories/', fetcher);

  const [form, setForm] = useState({ title: '', body: '', category: '' });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg('');
    try {
      await api.post('/articles/', form);
      setForm({ title: '', body: '', category: '' });
      setMsg('Article created as Draft.');
      mutate('/articles/');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error creating article.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmit(id: number) {
    try {
      await api.post(`/articles/${id}/submit/`);
      setMsg('Submitted for review.');
      mutate('/articles/');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error submitting.');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Author Dashboard</h1>

      {/* Create article */}
      <div className="bg-white border rounded-lg p-5 mb-8">
        <h2 className="font-semibold mb-4">New Article</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            required
          >
            <option value="">Select category</option>
            {categories?.results?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm h-32"
            placeholder="Body (HTML supported)"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Draft'}
          </button>
          {msg && <p className="text-sm text-gray-600">{msg}</p>}
        </form>
      </div>

      {/* My articles */}
      <h2 className="font-semibold mb-3">My Articles</h2>
      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}
      <div className="space-y-3">
        {articles?.results?.map((a: any) => (
          <div key={a.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.category?.name} · {new Date(a.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
              {(a.status === 'DRAFT' || a.status === 'NEEDS_REVISION') && (
                <button
                  onClick={() => handleSubmit(a.id)}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        ))}
        {articles?.results?.length === 0 && <p className="text-gray-500 text-sm">No articles yet.</p>}
      </div>
    </div>
  );
}
