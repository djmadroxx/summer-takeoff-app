import {
  useEffect,
  useState,
} from 'react';

import {
  Copy,
  LogOut,
  ShieldCheck,
  UserRound,
  Coins,
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';

import {
  getRoleLabel,
} from '@summer-takeoff/shared';

import { AnimatedBackground } from '../components/AnimatedBackground';
import { BottomNav } from '../components/BottomNav';
import { Logo } from '../components/Logo';

import type { User } from '../lib/auth';

interface QrPageProps {
  user: User;
  onLogout: () => void;
  onOpenScanner?: () => void;
}

interface DynamicQrResponse {
  qr: string;
  expiresAt: number;
}

export function QrPage({
  user,
  onLogout,
}: QrPageProps) {
  const [qrValue, setQrValue] =
    useState('');

  const [expiresAt, setExpiresAt] =
    useState<number | null>(null);

  const [secondsLeft, setSecondsLeft] =
    useState(0);

  const [qrError, setQrError] =
    useState('');

  /*
   * ========================================================
   * DINAMIKUS QR LEKÉRÉSE
   * ========================================================
   */

  async function loadQr() {
    try {
      setQrError('');

      const response =
        await fetch(
          '/api/scanner/qr',
          {
            method: 'GET',
            credentials: 'include',
          },
        );

      const data =
        (await response.json()) as
          | DynamicQrResponse
          | { message?: string };

      if (!response.ok) {
        throw new Error(
          'message' in data &&
          data.message
            ? data.message
            : 'Nem sikerült betölteni a QR-kódot.',
        );
      }

      const qrData =
        data as DynamicQrResponse;

      setQrValue(qrData.qr);
      setExpiresAt(
        qrData.expiresAt,
      );

      setSecondsLeft(
        Math.max(
          0,
          qrData.expiresAt -
            Math.floor(
              Date.now() / 1000,
            ),
        ),
      );
    } catch (error) {
      setQrError(
        error instanceof Error
          ? error.message
          : 'Nem sikerült betölteni a QR-kódot.',
      );
    }
  }

  /*
   * ========================================================
   * ELSŐ QR
   * ========================================================
   */

  useEffect(() => {
    void loadQr();
  }, []);

  /*
   * ========================================================
   * VISSZASZÁMLÁLÁS
   * ========================================================
   */

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const updateCountdown =
      () => {
        const remaining =
          Math.max(
            0,
            expiresAt -
              Math.floor(
                Date.now() /
                  1000,
              ),
          );

        setSecondsLeft(
          remaining,
        );

        if (remaining <= 0) {
          void loadQr();
        }
      };

    updateCountdown();

    const interval =
      window.setInterval(
        updateCountdown,
        1000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [expiresAt]);

  /*
   * ========================================================
   * QR FRISSÍTÉSE BIZTONSÁGI TARTALÉKKAL
   * ========================================================
   *
   * Ha valamiért a timer pontosan lejár,
   * az új QR automatikusan lekérésre kerül.
   */

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const refreshTimer =
      window.setTimeout(
        () => {
          void loadQr();
        },
        Math.max(
          1000,
          expiresAt * 1000 -
            Date.now() +
            250,
        ),
      );

    return () => {
      window.clearTimeout(
        refreshTimer,
      );
    };
  }, [expiresAt]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(
        user.memberId,
      );
    } catch {
      // Clipboard access can be blocked by the browser.
    }
  }

  const formattedTime =
    `00:${String(
      Math.max(
        0,
        secondsLeft,
      ),
    ).padStart(2, '0')}`;

  return (
    <main className="app-shell">
      <AnimatedBackground />

      <div className="app-container page-enter">
        <header className="topbar">
          <Logo />

          <button
            className="button button-icon button-icon-square"
            onClick={onLogout}
            type="button"
            aria-label="Kijelentkezés"
          >
            <LogOut size={18} />
          </button>
        </header>

        <section className="welcome-row">
          <div>
            <p className="muted-label">
              SUMMER TAKEOFF
            </p>

            <h1>
              Szia, {user.name}.
            </h1>
          </div>

          <div className="avatar">
            <UserRound size={22} />
          </div>
        </section>

        <section className="ticket-card">
          <div className="ticket-topline">
            <div className="ticket-brand">
              <ShieldCheck size={17} />

              <strong>
                {user.memberId}
              </strong>

              <Copy
                size={17}
                aria-label="Tag azonosító másolása"
                onClick={copyId}
              />
            </div>

            <span className="status-pill">
              <span />
              AKTÍV
            </span>
          </div>

          <div className="ticket-title">
            <h2>
              {getRoleLabel(
                user.role,
              )}
            </h2>
          </div>

          <div className="qr-stage">
            <div className="qr-glow" />

            <div className="qr-frame">
              {qrValue ? (
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#050505"
                  includeMargin
                  level="M"
                  size={128}
                  value={qrValue}
                />
              ) : (
                <div
                  style={{
                    width: 128,
                    height: 128,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    background:
                      '#ffffff',
                    color: '#050505',
                    fontSize: 12,
                    textAlign:
                      'center',
                    padding: 12,
                  }}
                >
                  QR betöltése...
                </div>
              )}

              <div className="scan-line" />
            </div>
          </div>

          <div className="qr-caption">
            <ShieldCheck size={17} />

            <span>
              A QR-kód biztonsági okokból
              rendszeresen megújul.
            </span>
          </div>

          <div
            className="qr-caption"
            style={{
              justifyContent:
                'center',
              marginTop: 10,
            }}
          >
            <span>
              ÉRVÉNYES MÉG{' '}
              <strong>
                {formattedTime}
              </strong>
            </span>
          </div>

          {qrError && (
            <div
              className="qr-caption"
              style={{
                justifyContent:
                  'center',
                marginTop: 10,
              }}
            >
              <span>
                {qrError}
              </span>
            </div>
          )}

          <div className="ticket-divider" />

          <div className="qr-caption">
            <Coins size={17} />

            <span>
              TOKENEID: {user.token} db
            </span>
          </div>

          <div className="member-row">
            <div>
              <span>
                FELHASZNÁLÓNÉV
              </span>

              <strong>
                @{user.username}
              </strong>
            </div>
          </div>
        </section>

        <p className="footer-note">
          A QR-kódod 60 másodpercenként
          automatikusan megújul. Ne oszd meg
          másokkal.
        </p>
      </div>

      <BottomNav
        active="qr"
        user={user}
        onNavigate={() => {}}
      />
    </main>
  );
}