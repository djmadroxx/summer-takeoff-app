import {
  CalendarDays,
  Home,
  QrCode,
  ScanLine,
  ShoppingBag,
  UserRound,
} from 'lucide-react';

import type { User } from '../lib/auth';

interface BottomNavProps {
  active:
    | 'home'
    | 'events'
    | 'qr'
    | 'scanner'
    | 'shop'
    | 'profile';
  user: User;
  onScanner: () => void;
}

export function BottomNav({
  active,
  user,
  onScanner,
}: BottomNavProps) {
  const isAdmin = user.role === 'admin';
  const isScanner = active === 'scanner';

  const items = [
    {
      id: 'home',
      label: 'Kezdőlap',
      icon: Home,
    },
    {
      id: 'events',
      label: 'Események',
      icon: CalendarDays,
    },
    {
      id: 'qr',
      label:
        isAdmin && !isScanner
          ? 'Scanner'
          : 'Belépő',
      icon:
        isAdmin && !isScanner
          ? ScanLine
          : QrCode,
    },
    {
      id: 'shop',
      label: 'Shop',
      icon: ShoppingBag,
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: UserRound,
    },
  ] as const;

  return (
    <nav
      className="bottom-nav"
      aria-label="Fő navigáció"
    >
      {items.map(
        ({ id, label, icon: Icon }) => {
          const isActive =
            id === 'qr'
              ? active === 'qr' ||
                active === 'scanner'
              : active === id;

          return (
            <button
              className={`nav-item ${
                isActive ? 'active' : ''
              }`}
              key={id}
              type="button"
              onClick={
                id === 'qr' && isAdmin
                  ? onScanner
                  : undefined
              }
            >
              <Icon
                size={23}
                strokeWidth={1.8}
              />
              <span>{label}</span>
            </button>
          );
        },
      )}
    </nav>
  );
}