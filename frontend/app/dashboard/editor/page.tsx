'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

const DECISION_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  NEEDS_REVISION: 'bg-yellow-100 text-yellow-700',
};

export default function EditorDashboard() {
  const [page, setPage] = useState(1);
  const { data: articles, isLoading } = useSWR(`/articles/?status=IN_REVIEW&page=${page}`, fetcher);
  const { data: me } = useSWR('/users/me/', fetcher);
  const { data: myDecisions } = useSWR('/reviews/my-decisions/', fetcher);
  const [comment, setComment] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [detail, setDetail] = useState<Record<number, any>>({});
  const [msg, setMsg] = useState('');

  async function loadDetail(id: number) {
    if (detail[id]) {
      setExpanded(e => ({ ...e, [id]: !e[id] }));
      return;
    }
    try {
      const { data } = await api.get(`/articles/${id}/`);
      setDetail(d => ({ ...d, [id]: data }));
      setExpanded(e => ({ ...e, [id]: true }));
    } catch {
      setMsg('Could not load article body.');
    }
  }

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

  const myUsername = me?.username;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editor Dashboard</h1>
      {msg && (
        <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
          {msg}
        </p>
      )}

      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}

      <div className="space-y-4">
        {articles?.results?.map((a: any) => {
          const isOwnArticle = myUsername && a.author === myUsername;
          return (
            <div key={a.id} className="bg-white border rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-gray-500">
                    by {a.author} · {a.category?.name}
                    {isOwnArticle && (
                      <span className="ml-2 text-amber-600 font-medium">(your article)</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => loadDetail(a.id)}
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    {expanded[a.id] ? 'Hide' : 'View'}
                  </button>
                  {isOwnArticle && (
                    <span className="text-xs text-gray-400 px-2">
                      Cannot self-review
                      {a.reviewer && ` · picked up by ${a.reviewer}`}
                    </span>
                  )}
                  {!isOwnArticle && a.reviewer && a.reviewer === myUsername && (
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">Assigned to you</span>
                  )}
                  {!isOwnArticle && a.reviewer && a.reviewer !== myUsername && (
                    <span className="text-xs text-gray-500 px-2">Assigned to {a.reviewer}</span>
                  )}
                  {!isOwnArticle && !a.reviewer && (
                    <button
                      onClick={() => pickup(a.id)}
                      className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-black"
                    >
                      Pick up
                    </button>
                  )}
                </div>
              </div>

              {expanded[a.id] && detail[a.id] && (
                <div className="mb-3 p-3 bg-gray-50 border rounded text-sm text-gray-800 max-h-64 overflow-y-auto">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: detail[a.id].body }}
                  />
                </div>
              )}

              {!isOwnArticle && (
                <>
                  <textarea
                    className="w-full border rounded px-3 py-2 text-sm h-16 mb-2 text-gray-900 bg-white"
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
                </>
              )}
            </div>
          );
        })}
        {articles?.results?.length === 0 && (
          <p className="text-gray-500 text-sm">No articles in review.</p>
        )}
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

      {/* My past decisions */}
      <h2 className="text-xl font-bold mt-10 mb-4">My Decisions</h2>
      <div className="space-y-3">
        {myDecisions?.length === 0 && (
          <p className="text-gray-500 text-sm">No decisions yet.</p>
        )}
        {myDecisions?.map((d: any) => (
          <div key={d.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{d.article_title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  by {d.article_author} · {new Date(d.created_at).toLocaleString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${DECISION_COLORS[d.decision] ?? ''}`}>
                {d.decision}
              </span>
            </div>
            {d.comment && (
              <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded p-2">{d.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
