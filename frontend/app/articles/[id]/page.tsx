'use client';
import { use } from 'react';
import useSWR from 'swr';
import DOMPurify from 'isomorphic-dompurify';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function ArticleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: article, isLoading } = useSWR(`/articles/${id}/`, fetcher);

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (!article) return <p className="text-red-500">Article not found.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {article.cover_image && (
        <div className="rounded-xl overflow-hidden mb-6 aspect-video bg-gray-100">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display, Georgia, serif)', lineHeight: 1.15, textWrap: 'balance' } as React.CSSProperties}>{article.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {article.author} · {article.category?.name} · {new Date(article.created_at).toLocaleDateString()}
        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{article.status}</span>
      </p>

      <div
        className="prose max-w-none mb-10 article-body"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.body, {
          ADD_TAGS: ['iframe'],
          ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', 'src'],
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp|tel):|[^a-z]|[a-z+\-.]+(?:[^a-z+\-.]|$))/i,
        }) }}
      />

      {article.sources?.length > 0 && (
        <div className="mb-10 border-t pt-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Sources</h2>
          <ol className="space-y-1.5">
            {article.sources.map((s: any, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-gray-400 shrink-0 w-5 text-right">{i + 1}.</span>
                <div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 hover:underline font-medium"
                  >
                    {s.title}
                  </a>
                  {s.publisher && <span className="text-gray-500"> — {s.publisher}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

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
