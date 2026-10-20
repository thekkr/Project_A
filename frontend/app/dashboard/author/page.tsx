'use client';
import { useState, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';
import RichTextEditor from '@/components/RichTextEditor';
import ArticlePreviewModal from '@/components/ArticlePreviewModal';
import SourcesEditor, { Source } from '@/components/SourcesEditor';

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

  const [form, setForm] = useState<{ title: string; body: string; categories: string[]; sources: Source[] }>({ title: '', body: '', categories: [], sources: [] });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const [editOpen, setEditOpen] = useState<Record<number, boolean>>({});
  const [editForm, setEditForm] = useState<Record<number, { title: string; body: string; categories: string[]; sources: Source[] }>>({});
  const [history, setHistory] = useState<Record<number, any[]>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [preview, setPreview] = useState<any | null>(null);

  // Cover image picker modal
  const [coverModal, setCoverModal] = useState<{ id: number; current?: string } | null>(null);
  const [coverTab, setCoverTab] = useState<'gallery' | 'upload'>('gallery');
  const [coverGallery, setCoverGallery] = useState<{ id: number; url: string }[]>([]);
  const [coverGalleryLoading, setCoverGalleryLoading] = useState(false);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState('');
  const [coverSaving, setCoverSaving] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  function openCoverModal(a: any) {
    setSelectedCover(a.cover_image || null);
    setCoverTab('gallery');
    setCoverUploadError('');
    setCoverModal({ id: a.id, current: a.cover_image });
    setCoverGalleryLoading(true);
    api.get('/articles/images/').then(r => setCoverGallery(r.data)).catch(() => setCoverGallery([])).finally(() => setCoverGalleryLoading(false));
  }

  async function uploadCoverImage(file: File): Promise<string | null> {
    const form = new FormData();
    form.append('image', file);
    setCoverUploading(true);
    setCoverUploadError('');
    try {
      const { data } = await api.post('/articles/upload-image/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data.url as string;
    } catch (err: any) {
      setCoverUploadError(err?.response?.data?.image?.[0] || 'Upload failed.');
      return null;
    } finally {
      setCoverUploading(false);
    }
  }

  async function saveCover() {
    if (!coverModal) return;
    setCoverSaving(true);
    try {
      await api.patch(`/articles/${coverModal.id}/cover-image/`, { cover_image: selectedCover ?? '' });
      setMsg('Cover image updated.');
      setCoverModal(null);
      mutate(articlesUrl);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error saving cover.');
    } finally {
      setCoverSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg('');
    try {
      await api.post('/articles/', form);
      setForm({ title: '', body: '', categories: [], sources: [] });
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
      setEditForm(f => ({ ...f, [id]: {
        title: detailRes.data.title,
        body: detailRes.data.body ?? '',
        categories: (detailRes.data.categories ?? []).map((c: any) => String(c.id)),
        sources: detailRes.data.sources ?? [],
      } }));
      setHistory(h => ({ ...h, [id]: historyRes.data }));
    } catch {
      setEditForm(f => ({ ...f, [id]: { title: a.title, body: '', categories: [], sources: [] } }));
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

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete draft "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/articles/${id}/`);
      setMsg('Draft deleted.');
      mutate(articlesUrl);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error deleting.');
    }
  }

  async function openPreview(a: any) {
    // Use already-loaded edit body if available, else fetch
    if (editForm[a.id]?.body !== undefined) {
      setPreview({ ...a, body: editForm[a.id].body });
      return;
    }
    try {
      const { data } = await api.get(`/articles/${a.id}/`);
      setPreview({ ...a, body: data.body });
    } catch {
      setMsg('Could not load article for preview.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {preview && <ArticlePreviewModal article={preview} onClose={() => setPreview(null)} />}

      {/* Cover image picker modal */}
      {coverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Cover image</h3>
              <button type="button" onClick={() => setCoverModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selectedCover && (
                <div className="relative rounded-lg overflow-hidden border aspect-video bg-gray-100">
                  <img src={selectedCover} alt="Cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setSelectedCover(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black">×</button>
                </div>
              )}

              <div className="flex gap-1 border-b">
                <button type="button" onClick={() => setCoverTab('gallery')} className={`px-3 py-1.5 text-sm font-medium ${coverTab === 'gallery' ? 'border-b-2 border-black' : 'text-gray-500 hover:text-gray-800'}`}>Gallery</button>
                <button type="button" onClick={() => setCoverTab('upload')} className={`px-3 py-1.5 text-sm font-medium ${coverTab === 'upload' ? 'border-b-2 border-black' : 'text-gray-500 hover:text-gray-800'}`}>Upload New</button>
              </div>

              {coverTab === 'gallery' && (
                coverGalleryLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : coverGallery.length === 0 ? (
                  <p className="text-sm text-gray-400">No images yet. Upload one.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                    {coverGallery.map(img => (
                      <button key={img.id} type="button" onClick={() => setSelectedCover(img.url)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedCover === img.url ? 'border-black' : 'border-transparent hover:border-gray-300'}`}>
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )
              )}

              {coverTab === 'upload' && (
                <div className="space-y-2">
                  {coverUploadError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{coverUploadError}</p>}
                  <input ref={coverFileRef} type="file" accept="image/*" className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadCoverImage(file);
                      if (url) { setSelectedCover(url); setCoverGallery(g => [{ id: Date.now(), url }, ...g]); setCoverTab('gallery'); }
                      e.target.value = '';
                    }}
                  />
                  <button type="button" onClick={() => coverFileRef.current?.click()} disabled={coverUploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50">
                    {coverUploading ? 'Uploading…' : 'Click to choose image'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 border-t flex gap-2 justify-end">
              <button type="button" onClick={() => setCoverModal(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={saveCover} disabled={coverSaving}
                className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50">
                {coverSaving ? 'Saving…' : 'Save cover'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="border rounded px-3 py-2 bg-white">
            <p className="text-xs text-gray-500 mb-2">Categories <span className="text-red-400">*</span></p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {categories?.results?.map((c: any) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm text-gray-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    value={c.id}
                    checked={form.categories.includes(String(c.id))}
                    onChange={e => {
                      const id = String(c.id);
                      setForm(f => ({ ...f, categories: e.target.checked ? [...f.categories, id] : f.categories.filter(x => x !== id) }));
                    }}
                    className="accent-black"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <RichTextEditor
            value={form.body}
            onChange={body => setForm(f => ({ ...f, body }))}
            placeholder="Write your article…"
          />
          <SourcesEditor
            sources={form.sources}
            onChange={sources => setForm(f => ({ ...f, sources }))}
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
                <p className="text-xs text-gray-500 mt-0.5">{a.categories?.map((c: any) => c.name).join(', ')} · {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                {a.status === 'NEEDS_REVISION' && a.revision_round > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                    Round {a.revision_round}
                  </span>
                )}
                <button
                  onClick={() => openPreview(a)}
                  className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                  Preview
                </button>
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
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
                {a.status === 'PUBLISHED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      {editOpen[a.id] ? 'Close' : 'View history'}
                    </button>
                    <button
                      onClick={() => openCoverModal(a)}
                      className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-900"
                    >
                      Cover image
                    </button>
                  </div>
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
                    <div className="border rounded px-3 py-2 bg-white">
                      <p className="text-xs text-gray-500 mb-2">Categories</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {categories?.results?.map((c: any) => (
                          <label key={c.id} className="flex items-center gap-1.5 text-sm text-gray-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              value={c.id}
                              checked={(editForm[a.id]?.categories ?? []).includes(String(c.id))}
                              onChange={e => {
                                const cid = String(c.id);
                                setEditForm(f => ({
                                  ...f,
                                  [a.id]: {
                                    ...f[a.id],
                                    categories: e.target.checked
                                      ? [...(f[a.id]?.categories ?? []), cid]
                                      : (f[a.id]?.categories ?? []).filter(x => x !== cid),
                                  },
                                }));
                              }}
                              className="accent-black"
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <RichTextEditor
                      value={editForm[a.id]?.body ?? ''}
                      onChange={body => setEditForm(f => ({ ...f, [a.id]: { ...f[a.id], body } }))}
                    />
                    <SourcesEditor
                      sources={editForm[a.id]?.sources ?? []}
                      onChange={sources => setEditForm(f => ({ ...f, [a.id]: { ...f[a.id], sources } }))}
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
