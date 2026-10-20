'use client';
import { useState } from 'react';

export interface Source {
  url: string;
  title: string;
  publisher?: string;
}

interface Props {
  sources: Source[];
  onChange: (sources: Source[]) => void;
}

export default function SourcesEditor({ sources, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Source>({ url: '', title: '', publisher: '' });
  const [error, setError] = useState('');

  function addSource() {
    if (!draft.url.trim() || !draft.title.trim()) {
      setError('URL and title are required.');
      return;
    }
    try { new URL(draft.url.trim()); } catch {
      setError('Enter a valid URL (include https://).');
      return;
    }
    onChange([...sources, { url: draft.url.trim(), title: draft.title.trim(), publisher: draft.publisher?.trim() || undefined }]);
    setDraft({ url: '', title: '', publisher: '' });
    setError('');
    setAdding(false);
  }

  function removeSource(i: number) {
    onChange(sources.filter((_, idx) => idx !== i));
  }

  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <p className="text-sm font-semibold text-gray-700">Sources</p>

      {sources.length > 0 && (
        <ol className="space-y-2">
          {sources.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-gray-400 shrink-0 w-5 text-right">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-900 hover:underline break-words"
                >
                  {s.title}
                </a>
                {s.publisher && (
                  <span className="text-gray-500"> — {s.publisher}</span>
                )}
                <span className="text-gray-400 text-xs block truncate">{s.url}</span>
              </div>
              <button
                type="button"
                onClick={() => removeSource(i)}
                className="text-gray-400 hover:text-red-500 shrink-0 text-base leading-none"
                title="Remove source"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {adding ? (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <input
            type="url"
            placeholder="URL (https://...)"
            value={draft.url}
            onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            autoFocus
          />
          <input
            type="text"
            placeholder="Title (required)"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSource(); } }}
          />
          <input
            type="text"
            placeholder="Publisher (optional)"
            value={draft.publisher}
            onChange={e => setDraft(d => ({ ...d, publisher: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSource(); } }}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={addSource} className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800">Add</button>
            <button type="button" onClick={() => { setAdding(false); setError(''); setDraft({ url: '', title: '', publisher: '' }); }} className="text-xs border px-3 py-1.5 rounded hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-gray-600 hover:text-black border border-dashed border-gray-300 hover:border-gray-500 rounded px-3 py-1.5 w-full transition-colors"
        >
          + Add source
        </button>
      )}
    </div>
  );
}
