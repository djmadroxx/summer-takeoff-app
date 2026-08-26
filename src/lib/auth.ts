import type { Role } from '@summer-takeoff/shared';

export interface User {
    id: string;
    email: string;
    username: string;
    name: string;
    memberId: string;
    qrToken: string;
    token: number;
    role: Role;
    isActive: boolean;
    createdAt: string;
}


const STORAGE_KEY = 'summer-takeoff-user';

export function getStoredUser(): User | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    return null;
  }
}

export async function refreshUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data.user as User;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(user),
    );

    return user;
  } catch {
    return null;
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? 'Sikertelen bejelentkezés.');
  }

  const user = data.user as User;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return user;
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY);
}