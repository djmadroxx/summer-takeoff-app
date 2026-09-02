import { useEffect, useState } from 'react';
import { ArrowLeft, Coins, History, ShoppingBag, UserRound } from 'lucide-react';

import type { User } from '../lib/auth';
import { notify } from '../lib/notifications';


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

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString('hu-HU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

interface ProfilePageProps {
  user: User;
  onBack: () => void;
  onUserUpdated: (user: User) => void;
}

export function ProfilePage({
  user,
  onBack,
  onUserUpdated,
}: ProfilePageProps) {
  const [username, setUsername] = useState(
    user.username,
  );

  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        const response = await fetch('/api/activity/history', {
          credentials: 'include',
        });
        if (!response.ok) return;
        const data = (await response.json()) as ActivityResponse;
        if (!cancelled) setActivity(data);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }

    void loadActivity();
    return () => { cancelled = true; };
  }, []);

  async function handleUsernameSave() {
    const normalizedUsername =
      username.trim().toLowerCase();

    if (!normalizedUsername) {
      notify(
        'error',
        'A felhasználónév nem lehet üres.',
      );
      return;
    }

    if (normalizedUsername.length < 3) {
      notify(
        'error',
        'A felhasználónév legalább 3 karakteres legyen.',
      );
      return;
    }

    if (
      normalizedUsername ===
      user.username
    ) {
      notify(
        'info',
        'Nem változtattad meg a felhasználónevet.',
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        '/api/auth/username',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username:
              normalizedUsername,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A felhasználónév módosítása sikertelen.',
        );
      }

      const updatedUser: User = {
        ...user,
        username:
          data.username,
      };

      onUserUpdated(updatedUser);

      setUsername(
        data.username,
      );

      notify(
        'success',
        'A felhasználóneved sikeresen módosítva.',
      );
    } catch (error) {
      notify(
        'error',
        error instanceof Error
          ? error.message
          : 'A felhasználónév módosítása sikertelen.',
      );
    } finally {
      setSaving(false);
    }
  }

  const registeredAt =
    new Date(
      user.createdAt,
    ).toLocaleDateString(
      'hu-HU',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

  return (
    <main className="app-shell">
      <div className="app-container page-enter">
        <header className="topbar profile-topbar">
          <button
            className="button button-icon"
            type="button"
            onClick={onBack}
            aria-label="Vissza"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="profile-topbar-title">
            <span className="muted-label">
              SUMMER TAKEOFF
            </span>

            <h1>Profil</h1>
          </div>

          <div className="avatar profile-avatar">
            <UserRound size={22} />
          </div>
        </header>

        <section className="profile-page">
          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <div>
                <span className="muted-label">
                  FIÓK
                </span>

                <h2>Profil adatok</h2>
              </div>
            </div>

            <div className="profile-info">
              <div className="profile-info-row">
                <span>Felhasználónév</span>

                <strong>
                  @{user.username}
                </strong>
              </div>

              <div className="profile-info-row">
                <span>E-mail cím</span>

                <strong>
                  {user.email}
                </strong>
              </div>

              <div className="profile-info-row">
                <span>Regisztráció</span>

                <strong>
                  {registeredAt}
                </strong>
              </div>
            </div>
          </div>

          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <div>
                <span className="muted-label">
                  SZERKESZTÉS
                </span>

                <h2>Felhasználónév</h2>
              </div>
            </div>

            <div className="profile-form">
              <label
                className="field-label"
                htmlFor="profile-username"
              >
                Új felhasználónév
              </label>

              <div className="input-wrap">
                <span className="profile-input-prefix">
                  @
                </span>

                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  maxLength={50}
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>

              <button
                className="button button-primary"
                type="button"
                onClick={
                  handleUsernameSave
                }
                disabled={saving}
              >
                {saving
                  ? 'Mentés...'
                  : 'Mentés'}
              </button>
            </div>
          </div>

          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <div>
                <span className="muted-label">ELŐZMÉNYEK</span>
                <h2>Tokenmozgások</h2>
              </div>
              <History size={22} />
            </div>

            <div className="profile-activity-list">
              {activityLoading && (
                <div className="activity-empty">Előzmények betöltése...</div>
              )}

              {!activityLoading && !activity?.transactions.length && (
                <div className="activity-empty">Még nincs tokenmozgás.</div>
              )}

              {activity?.transactions.slice(0, 15).map((item) => (
                <div className="profile-activity-row" key={item.id}>
                  <div className="profile-activity-icon">
                    <Coins size={16} />
                  </div>
                  <div>
                    <strong>{item.description || 'Token tranzakció'}</strong>
                    <span>{formatActivityDate(item.createdAt)}</span>
                  </div>
                  <b className={item.amount >= 0 ? 'positive' : 'negative'}>
                    {item.amount > 0 ? '+' : ''}{item.amount}
                  </b>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <div>
                <span className="muted-label">SHOP</span>
                <h2>Vásárlási előzmények</h2>
              </div>
              <ShoppingBag size={22} />
            </div>

            <div className="profile-activity-list">
              {!activityLoading && !activity?.purchases.length && (
                <div className="activity-empty">Még nincs vásárlási előzmény.</div>
              )}

              {activity?.purchases.slice(0, 15).map((item) => (
                <div className="profile-activity-row" key={`${item.orderId}-${item.productName}`}>
                  <div className="profile-activity-icon">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <strong>{item.productName}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</strong>
                    <span>{formatActivityDate(item.createdAt)}</span>
                  </div>
                  <b className="negative">−{item.unitTokenPrice * item.quantity}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
