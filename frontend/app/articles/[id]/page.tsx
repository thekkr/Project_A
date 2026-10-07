'use client';
import { use } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function ArticleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: article, isLoading } = useSWR(`/articles/${id}/`, fetcher);

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (!article) return <p className="text-red-500">Article not found.</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {article.author} · {article.category?.name} · {new Date(article.created_at).toLocaleDateString()}
        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{article.status}</span>
      </p>

      <div
        className="prose max-w-none mb-10 article-body"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />

      {article.review_history?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Review History</h2>
          <div className="space-y-3">
            {article.review_history.map((r: any) => (
              <div key={r.id} className={`border rounded p-3 text-sm ${r.decision === 'PUBLISHED' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                <p className="font-medium">{r.decision} by {r.editor}</p>
                {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}
                <p className="text-gray-400 text-xs mt-1">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
