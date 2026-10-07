import Cookies from 'js-cookie';
import api from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  roles: { id: number; name: string }[];
}

export async function login(username: string, password: string): Promise<void> {
  const { data } = await api.post('/auth/token/', { username, password });
  Cookies.set('access', data.access, { expires: 1 });
  Cookies.set('refresh', data.refresh, { expires: 7 });
}

export async function loginWithGoogle(credential: string): Promise<{ created: boolean; has_roles: boolean }> {
  const { data } = await api.post('/users/auth/google/', { credential });
  Cookies.set('access', data.access, { expires: 1 });
  Cookies.set('refresh', data.refresh, { expires: 7 });
  return { created: data.created, has_roles: data.has_roles };
}

export function logout(): void {
  Cookies.remove('access');
  Cookies.remove('refresh');
}

export function isLoggedIn(): boolean {
  return !!Cookies.get('access');
}

export function hasRole(user: User | null, role: string): boolean {
  return !!user?.roles.some((r) => r.name === role);
}
