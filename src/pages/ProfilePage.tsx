import { useState } from 'react';
import { ArrowLeft, UserRound } from 'lucide-react';

import type { User } from '../lib/auth';
import { notify } from '../lib/notifications';

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
            className="icon-button"
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
                className="primary-button"
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
        </section>
      </div>
    </main>
  );
}
