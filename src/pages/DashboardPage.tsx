import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Coins,
  History,
  ScanLine,
  ShoppingBag,
  TrendingUp,
  UserRound,
} from 'lucide-react';

import type { User } from '../lib/auth';
import { getRoleLabel } from '@summer-takeoff/shared';

interface DashboardPageProps {
  user: User;
  onNavigate: (page: 'qr' | 'events' | 'scanner' | 'shop' | 'profile' | 'products-admin') => void;
}

interface ActivityResponse {
  transactions: Array<{
    id: string;
    type: 'add' | 'remove' | 'purchase';
    amount: number;
    description: string | null;
    createdAt: string;
    orderId: string | null;
  }>;
  purchases: Array<{
    orderId: string;
    totalToken: number;
    status: string;
    createdAt: string;
    productName: string;
    quantity: number;
    unitTokenPrice: number;
  }>;
}

interface StatsResponse {
  activeUsers: number;
  todayOrders: number;
  todaySales: number;
  activeProducts: number;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function transactionLabel(type: ActivityResponse['transactions'][number]['type']) {
  if (type === 'add') return 'Token jóváírás';
  if (type === 'remove') return 'Token levonás';
  return 'Vásárlás';
}

export function DashboardPage({ user, onNavigate }: DashboardPageProps) {
  const isStaff = user.role === 'admin' || user.role === 'pultos';
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const activityResponse = await fetch('/api/activity/history', {
          credentials: 'include',
        });

        if (activityResponse.ok) {
          const data = (await activityResponse.json()) as ActivityResponse;
          if (!cancelled) setActivity(data);
        }

        if (isStaff) {
          const statsResponse = await fetch('/api/activity/stats', {
            credentials: 'include',
          });

          if (statsResponse.ok) {
            const data = (await statsResponse.json()) as StatsResponse;
            if (!cancelled) setStats(data);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  const recentTransactions = activity?.transactions.slice(0, 5) ?? [];
  const recentPurchases = activity?.purchases.slice(0, 5) ?? [];

  return (
    <main className="app-shell">
      <div className="app-container page-enter">
        <header className="topbar dashboard-topbar">
          <div>
            <span className="muted-label">SUMMER TAKEOFF</span>
            <h1>Kezdőlap</h1>
          </div>
          <div className="avatar">
            <UserRound size={22} />
          </div>
        </header>

        <section className="dashboard-welcome glass-card">
          <div>
            <span className="dashboard-eyebrow">
              {getRoleLabel(user.role).toUpperCase()}
            </span>
            <h2>Szia, {user.name}!</h2>
            <p>Összefoglaló a fiókodról és a mai aktivitásról.</p>
          </div>
          <div className="dashboard-token-balance">
            <Coins size={22} />
            <strong>{user.token}</strong>
            <span>token</span>
          </div>
        </section>

        {isStaff && (
          <>
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="muted-label">MA</span>
                  <h2>Gyors áttekintés</h2>
                </div>
                <BarChart3 size={22} />
              </div>

              <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon"><Coins size={19} /></div>
                  <span>Mai forgalom</span>
                  <strong>{stats?.todaySales ?? (loading ? '—' : 0)} token</strong>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon"><ShoppingBag size={19} /></div>
                  <span>Mai vásárlások</span>
                  <strong>{stats?.todayOrders ?? (loading ? '—' : 0)}</strong>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon"><UserRound size={19} /></div>
                  <span>Aktív vendégek</span>
                  <strong>{stats?.activeUsers ?? (loading ? '—' : 0)}</strong>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-icon"><Boxes size={19} /></div>
                  <span>Aktív termékek</span>
                  <strong>{stats?.activeProducts ?? (loading ? '—' : 0)}</strong>
                </div>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="muted-label">MŰVELETEK</span>
                  <h2>Gyorsgombok</h2>
                </div>
              </div>

              <div className="dashboard-actions">
                <button type="button" className="dashboard-action-card" onClick={() => onNavigate('scanner')}>
                  <ScanLine size={23} />
                  <span>
                    <strong>Scanner</strong>
                    <small>Vendég azonosítása és tokenkezelés</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
                <button type="button" className="dashboard-action-card" onClick={() => onNavigate('shop')}>
                  <ShoppingBag size={23} />
                  <span>
                    <strong>Shop</strong>
                    <small>Termékek és vásárlások kezelése</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
                {user.role === 'admin' && (
                  <button type="button" className="dashboard-action-card" onClick={() => onNavigate('products-admin')}>
                    <Boxes size={23} />
                    <span>
                      <strong>Termékek</strong>
                      <small>Kategóriák, árak és képek kezelése</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {!isStaff && (
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <span className="muted-label">FIÓKOD</span>
                <h2>Gyors elérés</h2>
              </div>
            </div>

            <div className="dashboard-actions">
              <button type="button" className="dashboard-action-card" onClick={() => onNavigate('qr')}>
                <Coins size={23} />
                <span>
                  <strong>Saját QR-kód</strong>
                  <small>Mutasd a belépőkódodat és tokenegyenlegedet</small>
                </span>
                <ArrowRight size={18} />
              </button>
              <button type="button" className="dashboard-action-card" onClick={() => onNavigate('events')}>
                <CalendarDays size={23} />
                <span>
                  <strong>Események</strong>
                  <small>Nézd meg a Summer Takeoff programját</small>
                </span>
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <span className="muted-label">ELŐZMÉNYEK</span>
              <h2>Legutóbbi aktivitás</h2>
            </div>
            <History size={22} />
          </div>

          <div className="activity-list glass-card">
            {loading && <div className="activity-empty">Adatok betöltése...</div>}

            {!loading && recentTransactions.length === 0 && recentPurchases.length === 0 && (
              <div className="activity-empty">
                Még nincs megjeleníthető aktivitás.
              </div>
            )}

            {recentTransactions.map((item) => (
              <div className="activity-row" key={`transaction-${item.id}`}>
                <div className={`activity-icon ${item.amount >= 0 ? 'positive' : 'negative'}`}>
                  <TrendingUp size={17} />
                </div>
                <div className="activity-main">
                  <strong>{transactionLabel(item.type)}</strong>
                  <span>{item.description || 'Token tranzakció'}</span>
                </div>
                <div className={`activity-amount ${item.amount >= 0 ? 'positive' : 'negative'}`}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </div>
                <time>{formatDate(item.createdAt)}</time>
              </div>
            ))}

            {recentPurchases.map((item) => (
              <div className="activity-row" key={`purchase-${item.orderId}-${item.productName}`}>
                <div className="activity-icon purchase">
                  <ShoppingBag size={17} />
                </div>
                <div className="activity-main">
                  <strong>{item.productName}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</strong>
                  <span>Vásárlás · {item.status === 'completed' ? 'Teljesítve' : item.status}</span>
                </div>
                <div className="activity-amount negative">−{item.unitTokenPrice * item.quantity}</div>
                <time>{formatDate(item.createdAt)}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
