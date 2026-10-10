'use client';
import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);

export default function ProfilePage() {
  const { data: me, isLoading } = useSWR('/users/me/', fetcher);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', first_name: '', last_name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (me) {
      setForm({
        username: me.username || '',
        first_name: me.first_name || '',
        last_name: me.last_name || '',
        bio: me.bio || '',
      });
    }
  }, [me]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.patch('/users/me/', form);
      mutate('/users/me/');
      setMsg({ text: 'Profile updated.', ok: true });
      setEditing(false);
    } catch (err: any) {
      const data = err.response?.data;
      const detail = data?.username?.[0] || data?.detail || 'Error saving.';
      setMsg({ text: detail, ok: false });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (me) setForm({ username: me.username, first_name: me.first_name || '', last_name: me.last_name || '', bio: me.bio || '' });
    setMsg(null);
    setEditing(false);
  }

  if (isLoading) return <p className="text-gray-500 text-sm">Loading…</p>;
  if (!me) return <p className="text-gray-500 text-sm">Not logged in.</p>;

  const initials = ((me.first_name?.[0] || '') + (me.last_name?.[0] || '') || me.username?.[0] || '?').toUpperCase();
  const displayName = [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 mb-6">
        {me.avatar_url ? (
          <img src={me.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-800 text-white flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
        )}
        <div>
          <p className="font-semibold text-lg">{displayName}</p>
          <p className="text-sm text-gray-500">@{me.username}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            {me.roles?.length > 0
              ? me.roles.map((r: any) => (
                  <span key={r.id} className="text-xs bg-black text-white px-2 py-0.5 rounded">{r.name}</span>
                ))
              : <span className="text-xs text-gray-400">No roles assigned yet — contact an admin</span>
            }
          </div>
        </div>
      </div>

      {/* Profile details (read-only) */}
      <div className="bg-white border rounded-lg p-5 mb-4 space-y-3 text-sm">
        <Row label="Email" value={me.email} note="from Google" />
        <Row label="First name" value={me.first_name || '—'} />
        <Row label="Last name" value={me.last_name || '—'} />
        <Row label="Username" value={`@${me.username}`} />
        {me.bio && <Row label="Bio" value={me.bio} />}
        <div className="pt-2 border-t text-xs text-gray-400 space-y-0.5">
          <p>Member since {new Date(me.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          {me.last_login && <p>Last login {new Date(me.last_login).toLocaleString()}</p>}
        </div>
      </div>

      {msg && (
        <p className={`text-sm mb-3 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      )}

      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="bg-black text-white px-5 py-2 rounded text-sm font-medium hover:bg-gray-800"
        >
          Edit profile
        </button>
      )}

      {/* Edit form — only shown when editing */}
      {editing && (
        <form onSubmit={handleSave} className="bg-white border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Edit profile</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
              rows={3}
              placeholder="Tell readers a bit about yourself…"
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white px-5 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 rounded text-sm font-medium border hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">
        {value}
        {note && <span className="ml-1 text-xs text-gray-400">({note})</span>}
      </span>
    </div>
  );
}
