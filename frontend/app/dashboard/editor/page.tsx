'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function EditorDashboard() {
  const { data: articles, isLoading } = useSWR('/articles/?status=IN_REVIEW', fetcher);
  const [comment, setComment] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');

  async function pickup(id: number) {
    try {
      const { data } = await api.post(`/articles/${id}/pickup/`);
      setMsg(data.detail);
      mutate('/articles/?status=IN_REVIEW');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error.');
    }
  }

  async function publish(id: number) {
    try {
      await api.post(`/articles/${id}/publish/`, { comment: comment[id] || '' });
      setMsg('Published.');
      mutate('/articles/?status=IN_REVIEW');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error.');
    }
  }

  async function sendBack(id: number) {
    if (!comment[id]?.trim()) { setMsg('Comment required to send back.'); return; }
    try {
      await api.post(`/articles/${id}/send-back/`, { comment: comment[id] });
      setMsg('Sent back for revision.');
      mutate('/articles/?status=IN_REVIEW');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error.');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editor Dashboard</h1>
      {msg && <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{msg}</p>}

      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}

      <div className="space-y-4">
        {articles?.results?.map((a: any) => (
          <div key={a.id} className="bg-white border rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-gray-500">by {a.author} · {a.category?.name}</p>
              </div>
              <button
                onClick={() => pickup(a.id)}
                className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-black"
              >
                Pick up
              </button>
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm h-16 mb-2"
              placeholder="Comment (required for send-back)"
              value={comment[a.id] || ''}
              onChange={e => setComment(c => ({ ...c, [a.id]: e.target.value }))}
            />

            <div className="flex gap-2">
              <button
                onClick={() => publish(a.id)}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
              >
                Publish
              </button>
              <button
                onClick={() => sendBack(a.id)}
                className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded hover:bg-yellow-600"
              >
                Send back
              </button>
            </div>
          </div>
        ))}
        {articles?.results?.length === 0 && <p className="text-gray-500 text-sm">No articles in review.</p>}
      </div>
    </div>
  );
}
