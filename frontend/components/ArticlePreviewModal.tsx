'use client';
import { useEffect } from 'react';

interface Props {
  article: {
    title: string;
    body: string;
    author?: string;
    category?: { name: string };
    created_at?: string;
    status?: string;
  };
  onClose: () => void;
}

export default function ArticlePreviewModal({ article, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Article Preview</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Article content */}
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{article.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-8 pb-4 border-b">
            {article.author && <span>by <span className="font-medium text-gray-700">{article.author}</span></span>}
            {article.category?.name && <span>· {article.category.name}</span>}
            {article.created_at && <span>· {new Date(article.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
            {article.status && (
              <span className="ml-auto px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{article.status}</span>
            )}
          </div>
          <div
            className="prose prose-base max-w-none article-body"
            dangerouslySetInnerHTML={{ __html: article.body || '<p class="text-gray-400">(No content)</p>' }}
          />
        </div>
      </div>
    </div>
  );
}
