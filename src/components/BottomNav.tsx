import {
  CalendarDays,
  Home,
  QrCode,
  ScanLine,
  ShoppingBag,
  UserRound,
} from 'lucide-react';

import type { User } from '../lib/auth';

export type NavigationPage =
  | 'home'
  | 'events'
  | 'qr'
  | 'scanner'
  | 'shop'
  | 'profile'
  | 'products-admin'
  | 'login' // kell, mert a login page is létező oldal, fuck yea
  | 'register'; // kell, mert a register page is létező oldal, fuck yea

interface BottomNavProps {
  active: NavigationPage;
  user: User;
  onNavigate: (page: NavigationPage) => void;
}

const navItems = [
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
    label: 'Saját QR',
    icon: QrCode,
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

export function BottomNav({
  active,
  user,
  onNavigate,
}: BottomNavProps) {
  const isStaff = user.role === 'admin';
  const isScanner = active === 'scanner';

  return (
    <nav
      className="bottom-nav"
      aria-label="Fő navigáció"
    >
      {navItems.map(
        ({ id, label, icon: DefaultIcon }) => {
          const isQrItem = id === 'qr';

          const isActive = isQrItem
            ? active === 'qr' ||
              active === 'scanner'
            : active === id;

          const Icon =
            isQrItem &&
            isStaff &&
            !isScanner
              ? ScanLine
              : DefaultIcon;

          const displayedLabel =
            isQrItem &&
            isStaff &&
            !isScanner
              ? 'Scanner'
              : label;

          function handleClick() {
          if (isQrItem && isStaff) {
            onNavigate(
              isScanner
                ? 'qr'
                : 'scanner',
            );

            return;
          }

          onNavigate(id);
        }

          return (
            <button
              className={`nav-item ${
                isActive ? 'active' : ''
              }`}
              key={id}
              type="button"
              onClick={handleClick}
            >
              <Icon
                size={23}
                strokeWidth={1.8}
              />

              <span>
                {displayedLabel}
              </span>
            </button>
          );
        },
      )}
    </nav>
  );
}