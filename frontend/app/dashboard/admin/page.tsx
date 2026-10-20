'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(r => r.data);
const ALL_ROLES = ['AUTHOR', 'EDITOR', 'ADMIN'];

export default function AdminDashboard() {
  const { data: users, isLoading } = useSWR('/users/', fetcher);
  const { data: categories } = useSWR('/categories/', fetcher);
  const [msg, setMsg] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [articleStatus, setArticleStatus] = useState('');
  const [articlePage, setArticlePage] = useState(1);
  const articlesKey = `/articles/?page=${articlePage}${articleStatus ? `&status=${articleStatus}` : ''}`;
  const { data: articles, isLoading: articlesLoading } = useSWR(articlesKey, fetcher);

  async function handleDeleteArticle(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/articles/${id}/`);
      setMsg(`Article "${title}" deleted.`);
      mutate(articlesKey);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error deleting article.');
    }
  }

  async function toggleRole(userId: number, currentRoles: string[], role: string) {
    const has = currentRoles.includes(role);
    const newRoles = has ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
    try {
      await api.post(`/users/${userId}/assign-roles/`, { roles: newRoles });
      setMsg(`Roles updated for user #${userId}.`);
      mutate('/users/');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error.');
    }
  }

  async function toggleActive(userId: number, isActive: boolean) {
    const action = isActive ? 'deactivate' : 'activate';
    try {
      const { data } = await api.post(`/users/${userId}/${action}/`);
      setMsg(data.detail);
      mutate('/users/');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error.');
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setAddingCat(true);
    try {
      await api.post('/categories/', { name: newCategory.trim() });
      setNewCategory('');
      setMsg('Category added.');
      mutate('/categories/');
    } catch (err: any) {
      setMsg(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Error adding category.');
    } finally {
      setAddingCat(false);
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? Articles in this category will lose their category.`)) return;
    try {
      await api.delete(`/categories/${id}/`);
      setMsg(`Category "${name}" deleted.`);
      mutate('/categories/');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error deleting category.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {msg && <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{msg}</p>}

      {/* Users */}
      <h2 className="font-semibold text-lg mb-3">Users</h2>
      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}
      <div className="space-y-3 mb-10">
        {users?.map((u: any) => (
          <div key={u.id} className={`bg-white border rounded-lg p-4 ${!u.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">{u.username}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <button
                onClick={() => toggleActive(u.id, u.is_active)}
                className={`text-xs px-3 py-1 rounded ${u.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ALL_ROLES.map(role => {
                const has = u.roles.some((r: any) => r.name === role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(u.id, u.roles.map((r: any) => r.name), role)}
                    className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${has ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:border-black'}`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Articles */}
      <h2 className="font-semibold text-lg mb-3">Articles</h2>
      <div className="mb-3 flex gap-2 flex-wrap">
        {['', 'DRAFT', 'IN_REVIEW', 'NEEDS_REVISION', 'PUBLISHED'].map(s => (
          <button
            key={s}
            onClick={() => { setArticleStatus(s); setArticlePage(1); }}
            className={`text-xs px-3 py-1 rounded border font-medium transition-colors ${articleStatus === s ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:border-black'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="space-y-2 mb-4">
        {articlesLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {articles?.results?.length === 0 && <p className="text-sm text-gray-500">No articles.</p>}
        {articles?.results?.map((a: any) => (
          <div key={a.id} className="bg-white border rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                by {a.author} · {a.categories?.map((c: any) => c.name).join(', ')}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                  a.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                  a.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700' :
                  a.status === 'NEEDS_REVISION' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{a.status}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/articles/${a.id}`} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">View</Link>
              <button
                onClick={() => handleDeleteArticle(a.id, a.title)}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {(articles?.previous || articles?.next) && (
          <div className="flex items-center gap-3 pt-2 text-sm">
            <button onClick={() => setArticlePage(p => p - 1)} disabled={!articles?.previous} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Previous</button>
            <span className="text-gray-500">Page {articlePage}</span>
            <button onClick={() => setArticlePage(p => p + 1)} disabled={!articles?.next} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
          </div>
        )}
      </div>

      {/* Categories */}
      <h2 className="font-semibold text-lg mb-3">Categories</h2>
      <div className="bg-white border rounded-lg p-5 mb-4">
        <div className="space-y-2 mb-4">
          {categories?.results?.length === 0 && (
            <p className="text-sm text-gray-500">No categories yet.</p>
          )}
          {categories?.results?.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">{c.slug}</span>
              </div>
              <button
                onClick={() => handleDeleteCategory(c.id, c.name)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-0.5"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="New category name…"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
          />
          <button
            type="submit"
            disabled={addingCat || !newCategory.trim()}
            className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {addingCat ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  );
}
