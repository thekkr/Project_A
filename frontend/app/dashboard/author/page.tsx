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
  const { data: me } = useSWR('/users/me/', fetcher);
  const [page, setPage] = useState(1);
  const articlesUrl = me ? `/articles/?author=${me.id}&page=${page}` : null;
  const { data: articles, isLoading } = useSWR(articlesUrl, fetcher, { refreshInterval: 8000 });
  const { data: categories } = useSWR('/categories/', fetcher);

  const [form, setForm] = useState({ title: '', body: '', category: '' });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const [editOpen, setEditOpen] = useState<Record<number, boolean>>({});
  const [editForm, setEditForm] = useState<Record<number, { title: string; body: string }>>({});
  const [history, setHistory] = useState<Record<number, any[]>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg('');
    try {
      await api.post('/articles/', form);
      setForm({ title: '', body: '', category: '' });
      setMsg('Article created as Draft.');
      mutate(articlesUrl);
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
      mutate(articlesUrl);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error submitting.');
    }
  }

  async function openEdit(a: any) {
    const id = a.id;
    if (editOpen[id]) {
      setEditOpen(o => ({ ...o, [id]: false }));
      return;
    }
    try {
      const [detailRes, historyRes] = await Promise.all([
        api.get(`/articles/${id}/`),
        history[id] ? Promise.resolve({ data: history[id] }) : api.get(`/articles/${id}/history/`),
      ]);
      setEditForm(f => ({ ...f, [id]: { title: detailRes.data.title, body: detailRes.data.body ?? '' } }));
      setHistory(h => ({ ...h, [id]: historyRes.data }));
    } catch {
      setEditForm(f => ({ ...f, [id]: { title: a.title, body: '' } }));
      setHistory(h => ({ ...h, [id]: [] }));
    }
    setEditOpen(o => ({ ...o, [id]: true }));
  }

  async function saveEdit(id: number) {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await api.patch(`/articles/${id}/`, editForm[id]);
      setMsg('Article updated.');
      setEditOpen(o => ({ ...o, [id]: false }));
      mutate(articlesUrl);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error saving.');
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Author Dashboard</h1>

      <div className="bg-white border rounded-lg p-5 mb-8">
        <h2 className="font-semibold mb-4">New Article</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2 text-sm text-gray-900 bg-white"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <select
            className="w-full border rounded px-3 py-2 text-sm text-gray-900 bg-white"
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
            className="w-full border rounded px-3 py-2 text-sm h-32 text-gray-900 bg-white"
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

      <h2 className="font-semibold mb-3">My Articles</h2>
      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}
      <div className="space-y-3">
        {articles?.results?.map((a: any) => (
          <div key={a.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.category?.name} · {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                {a.status === 'IN_REVIEW' && (
                  <span className="text-xs text-gray-500">
                    {a.reviewer ? `reviewer: ${a.reviewer}` : 'awaiting pickup'}
                  </span>
                )}
                {a.status === 'NEEDS_REVISION' && (
                  <button
                    onClick={() => openEdit(a)}
                    className="text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    {editOpen[a.id] ? 'Close' : 'View feedback & edit'}
                  </button>
                )}
                {a.status === 'DRAFT' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                    >
                      {editOpen[a.id] ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleSubmit(a.id)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Submit
                    </button>
                  </div>
                )}
                {a.status === 'PUBLISHED' && (
                  <button
                    onClick={() => openEdit(a)}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    {editOpen[a.id] ? 'Close' : 'View history'}
                  </button>
                )}
              </div>
            </div>

            {editOpen[a.id] && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {/* Review feedback */}
                {history[a.id]?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Editor feedback</p>
                    {history[a.id].map((h: any, i: number) => (
                      <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                        <p className="text-xs text-gray-500 mb-1">
                          {h.editor} · {new Date(h.created_at).toLocaleString()} · <span className="font-medium">{h.decision}</span>
                        </p>
                        <p className="text-gray-800">{h.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit form — not shown for published articles */}
                {a.status !== 'PUBLISHED' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Edit article</p>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm text-gray-900 bg-white"
                      value={editForm[a.id]?.title ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, [a.id]: { ...f[a.id], title: e.target.value } }))}
                      placeholder="Title"
                    />
                    <textarea
                      className="w-full border rounded px-3 py-2 text-sm h-40 text-gray-900 bg-white"
                      value={editForm[a.id]?.body ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, [a.id]: { ...f[a.id], body: e.target.value } }))}
                      placeholder="Body"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(a.id)}
                        disabled={saving[a.id]}
                        className="text-xs bg-black text-white px-4 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
                      >
                        {saving[a.id] ? 'Saving…' : 'Save'}
                      </button>
                      {a.status === 'NEEDS_REVISION' && (
                        <button
                          onClick={async () => {
                            setSaving(s => ({ ...s, [a.id]: true }));
                            try {
                              await api.post(`/articles/${a.id}/save-and-submit/`, editForm[a.id]);
                              setMsg('Saved and resubmitted.');
                              setEditOpen(o => ({ ...o, [a.id]: false }));
                              mutate(articlesUrl);
                            } catch (err: any) {
                              setMsg(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error.');
                            } finally {
                              setSaving(s => ({ ...s, [a.id]: false }));
                            }
                          }}
                          disabled={saving[a.id]}
                          className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save & resubmit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {articles?.results?.length === 0 && <p className="text-gray-500 text-sm">No articles yet.</p>}
      </div>

      {(articles?.previous || articles?.next) && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={!articles?.previous}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
          >
            Previous
          </button>
          <span className="text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!articles?.next}
            className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
