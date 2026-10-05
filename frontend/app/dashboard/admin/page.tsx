'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(r => r.data);
const ALL_ROLES = ['AUTHOR', 'EDITOR', 'ADMIN'];

export default function AdminDashboard() {
  const { data: users, isLoading } = useSWR('/users/', fetcher);
  const [msg, setMsg] = useState('');

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {msg && <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{msg}</p>}

      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}

      <div className="space-y-3">
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
    </div>
  );
}
