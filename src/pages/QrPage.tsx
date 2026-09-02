import {
  useEffect,
  useState,
} from 'react';

import {
  LogOut,
  ShieldCheck,
  UserRound,
  Coins,
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';

import { AnimatedBackground } from '../components/AnimatedBackground';
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
              <strong>SAJÁT QR-KÓD</strong>
            </div>

            <span className="status-pill-online">
              <span />
              AKTÍV
            </span>
          </div>

          <div className="ticket-title">
            <h2>Belépőkód</h2>
            <p>Mutasd fel a pultnál a beolvasáshoz.</p>
          </div>

          <div className="qr-stage qr-stage-large">
            <div className="qr-glow" />
            <div className="qr-frame qr-frame-large">
              {qrValue ? (
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#050505"
                  includeMargin
                  level="M"
                  size={190}
                  value={qrValue}
                />
              ) : (
                <div className="qr-loading">
                  QR betöltése...
                </div>
              )}
              <div className="scan-line" />
            </div>
          </div>

          <div className="qr-validity">
            <span>ÉRVÉNYES MÉG</span>
            <strong>{formattedTime}</strong>
          </div>

          {qrError && (
            <div className="qr-error" role="alert">
              <span>{qrError}</span>
            </div>
          )}

          <div className="ticket-divider" />

          <div className="qr-token-balance">
            <div>
              <Coins size={19} />
              <span>Tokenegyenleg</span>
            </div>
            <strong>{user.token} db</strong>
          </div>
        </section>

      </div>

    </main>
  );
}