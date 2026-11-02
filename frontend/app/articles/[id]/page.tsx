'use client';
import { use, useState } from 'react';
import useSWR, { mutate } from 'swr';
import DOMPurify from 'isomorphic-dompurify';
import api from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

const fetcher = (url: string) => api.get(url).then(r => r.data);
const MAX_COMMENT = 2000;

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type Comment = {
  id: number;
  user: string;
  body: string;
  is_deleted: boolean;
  created_at: string;
  replies: Comment[];
};

function CommentItem({
  comment, articleId, currentUser, onDelete,
}: {
  comment: Comment; articleId: string; currentUser: string | null; onDelete: (id: number) => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = currentUser && !comment.is_deleted && comment.user === currentUser;

  async function submitReply() {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/articles/${articleId}/comments/`, { body: replyBody.trim(), parent: comment.id });
      mutate(`/articles/${articleId}/comments/`);
      setReplyBody('');
      setReplyOpen(false);
    } catch {
      setError('Failed to post reply. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          {comment.is_deleted ? '?' : comment.user?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          {comment.is_deleted ? (
            <p className="text-sm text-gray-400 italic">Comment deleted</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold">{comment.user}</span>
                <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
              <div className="flex gap-3 mt-1">
                {currentUser && (
                  <button onClick={() => setReplyOpen(o => !o)} className="text-xs text-gray-400 hover:text-gray-700">
                    Reply
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deleting}
                    className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 pl-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {comment.replies.map(reply => {
            const canDeleteReply = currentUser && !reply.is_deleted && reply.user === currentUser;
            return (
              <div key={reply.id} className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  {reply.is_deleted ? '?' : reply.user?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  {reply.is_deleted ? (
                    <p className="text-sm text-gray-400 italic">Comment deleted</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{reply.user}</span>
                        <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                      {canDeleteReply && (
                        <button onClick={() => onDelete(reply.id)} className="text-xs text-gray-400 hover:text-red-600 mt-1">
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply box */}
      {replyOpen && (
        <div className="ml-11 mt-2">
          <textarea
            rows={2}
            value={replyBody}
            onChange={e => setReplyBody(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="Write a reply…"
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black"
          />
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${replyBody.length > MAX_COMMENT * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
              {replyBody.length}/{MAX_COMMENT}
            </span>
            <div className="flex gap-2">
              {error && <span className="text-xs text-red-500">{error}</span>}
              <button
                onClick={submitReply}
                disabled={submitting || !replyBody.trim()}
                className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                {submitting ? 'Posting…' : 'Post reply'}
              </button>
              <button onClick={() => { setReplyOpen(false); setReplyBody(''); setError(''); }} className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArticleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const loggedIn = isLoggedIn();
  const { data: article, isLoading, mutate: mutateArticle } = useSWR(`/articles/${id}/`, fetcher);
  const { data: comments, isLoading: commentsLoading } = useSWR(
    article ? `/articles/${id}/comments/` : null, fetcher
  );
  const { data: me } = useSWR(loggedIn ? '/users/me/' : null, fetcher);
  const currentUser: string | null = me?.username ?? null;

  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState('');

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="rounded-xl aspect-video bg-gray-200 mb-6" />
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-6" />
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-8" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${85 + (i % 3) * 5}%` }} />
        ))}
      </div>
    </div>
  );
  if (!article) return <p className="text-red-500 px-4 py-8">Article not found.</p>;

  async function handleLike() {
    if (!loggedIn || liking) return;
    setLiking(true);
    setLikeError('');
    try {
      const { data } = await api.post(`/articles/${id}/like/`);
      mutateArticle({ ...article, is_liked: data.liked, like_count: data.count }, false);
    } catch {
      setLikeError('Could not update like. Try again.');
    } finally {
      setLiking(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || posting) return;
    setPosting(true);
    setCommentError('');
    try {
      await api.post(`/articles/${id}/comments/`, { body: commentBody.trim() });
      mutate(`/articles/${id}/comments/`);
      mutateArticle({ ...article, comment_count: (article.comment_count ?? 0) + 1 }, false);
      setCommentBody('');
    } catch (err: any) {
      setCommentError(err.response?.data?.body?.[0] || err.response?.data?.detail || 'Failed to post comment.');
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(commentId: number) {
    await api.delete(`/comments/${commentId}/`);
    mutate(`/articles/${id}/comments/`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {article.cover_image && (
        <div className="rounded-xl overflow-hidden mb-6 aspect-video bg-gray-100">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display, Georgia, serif)', lineHeight: 1.15, textWrap: 'balance' } as React.CSSProperties}>{article.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {article.author} · {article.categories?.map((c: any) => c.name).join(', ')} · {new Date(article.created_at).toLocaleDateString()}
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

      {/* Like + comment counts */}
      <div className="flex items-center gap-4 py-4 border-t border-b mb-8">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleLike}
            disabled={!loggedIn || liking}
            title={loggedIn ? (article.is_liked ? 'Unlike' : 'Like') : 'Log in to like'}
            className={`flex items-center gap-1.5 text-sm font-medium transition-opacity ${!loggedIn ? 'opacity-50 cursor-default' : 'hover:opacity-75'} ${article.is_liked ? 'text-red-500' : 'text-gray-500'}`}
          >
            <HeartIcon filled={!!article.is_liked} />
            <span>{article.like_count ?? 0}</span>
          </button>
          {likeError && <span className="text-xs text-red-500">{likeError}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CommentIcon />
          <span>{article.comment_count ?? 0}</span>
        </div>
      </div>

      {article.sources?.length > 0 && (
        <div className="mb-10 border-t pt-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Sources</h2>
          <ol className="space-y-1.5">
            {article.sources.map((s: any, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-gray-400 shrink-0 w-5 text-right">{i + 1}.</span>
                <div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-medium">{s.title}</a>
                  {s.publisher && <span className="text-gray-500"> — {s.publisher}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {article.review_history?.length > 0 && (
        <div className="mb-10 border-t pt-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Review History</h2>
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

      {/* Comments section */}
      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold mb-6">Comments</h2>

        {loggedIn ? (
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              rows={3}
              value={commentBody}
              onChange={e => setCommentBody(e.target.value.slice(0, MAX_COMMENT))}
              placeholder="Write a comment…"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black"
            />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${commentBody.length > MAX_COMMENT * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                {commentBody.length}/{MAX_COMMENT}
              </span>
              <div className="flex items-center gap-3">
                {commentError && <span className="text-xs text-red-500">{commentError}</span>}
                <button
                  type="submit"
                  disabled={posting || !commentBody.trim()}
                  className="text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  {posting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500 mb-8">
            <a href="/login" className="underline font-medium">Log in</a> to leave a comment.
          </p>
        )}

        {commentsLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments?.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-6">
            {comments?.map((c: Comment) => (
              <CommentItem
                key={c.id}
                comment={c}
                articleId={id}
                currentUser={currentUser}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
