import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Minus,
  Plus,
  ScanLine
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { Html5Qrcode } from 'html5-qrcode';

import { AnimatedBackground } from '../components/AnimatedBackground';
import { BottomNav } from '../components/BottomNav';
import { Logo } from '../components/Logo';

import type { User } from '../lib/auth';
import { notify } from '../lib/notifications';

import {
  ROLES,
  getRoleLabel,
  type Role,
} from '@summer-takeoff/shared';

interface ScannerPageProps {
  user: User;
  onBack: () => void;
}

interface ScannedUser {
  id: string;
  email: string;
  username: string;
  name: string;
  memberId: string;
  role: 'user' | 'staff' | 'admin';
  isActive: boolean;
  token: number;
}

export function ScannerPage({
  user,
  onBack,
}: ScannerPageProps) {
    const scannerRef =
        useRef<Html5Qrcode | null>(null);

    const processingRef =
        useRef(false);

    const lastFailedQrRef =
        useRef('');

    const lastFailedAtRef =
        useRef(0);

    const startedRef =
        useRef(false);

    const stoppingRef =
        useRef(false);

    
    const [scannedUser, setScannedUser] =
        useState<ScannedUser | null>(null);

    const [serverError, setServerError] =
        useState('');

    const [cameraError, setCameraError] =
        useState('');

    const [scanning, setScanning] =
        useState(false);

     const [tokenAmount, setTokenAmount] =
        useState('');

    const [tokenLoading, setTokenLoading] =
        useState(false);


    const [scannerSession, setScannerSession] =
        useState(0);

    const [roleLoading, setRoleLoading] =
      useState(false);

  useEffect(() => {
    if (user.role !== 'admin') {
      return;
    }

    let cancelled = false;

    const scanner =
      new Html5Qrcode('qr-reader');

    scannerRef.current = scanner;

    async function stopScanner() {
      if (
        !startedRef.current ||
        stoppingRef.current
      ) {
        return;
      }

      stoppingRef.current = true;

      try {
        await scanner.stop();
      } catch {
        // A scanner már leállhatott.
      } finally {
        startedRef.current = false;
        stoppingRef.current = false;

        if (!cancelled) {
          setScanning(false);
        }
      }
    }

    async function startScanner() {
      try {
        setCameraError('');
        setServerError('');
        setScannedUser(null);

        await scanner.start(
          {
            facingMode: 'environment',
          },
          {
            fps: 10,
            qrbox: {
                width: 250,
                height: 250,
            },
            aspectRatio: 1
        },
          async (decodedText) => {
            if (
              processingRef.current ||
              cancelled
            ) {
              return;
            }

            const now = Date.now();

            if (
              decodedText ===
                lastFailedQrRef.current &&
              now -
                lastFailedAtRef.current <
                2500
            ) {
              return;
            }

            processingRef.current = true;

            setServerError('');

            try {
              const response =
                await fetch(
                  '/api/scanner/lookup',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type':
                        'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      qrToken:
                        decodedText,
                    }),
                  },
                );

              let data: {
                message?: string;
                user?: ScannedUser;
              } = {};

              try {
                data =
                  await response.json();
              } catch {
                throw new Error(
                  'A szerver nem adott érvényes választ.',
                );
              }

              if (!response.ok) {
                throw new Error(
                  data.message ??
                    'A QR-kód feldolgozása sikertelen.',
                );
              }

              if (!data.user) {
                throw new Error(
                  'A QR-kódhoz nem található felhasználó.',
                );
              }

              lastFailedQrRef.current = '';
              lastFailedAtRef.current = 0;

              await stopScanner();

              if (!cancelled) {
                setTokenAmount('');
                setScannedUser(
                  data.user,
                );
              }
            } catch (error) {
              if (!cancelled) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Hiba történt a QR-kód feldolgozásakor.';

                lastFailedQrRef.current =
                  decodedText;

                lastFailedAtRef.current =
                  Date.now();

                setServerError(message);

                window.setTimeout(() => {
                  if (!cancelled) {
                    setServerError('');
                  }
                }, 2500);
              }
            } finally {
              processingRef.current =
                false;
            }
          },
          () => {
            // Normál scanning callback.
          },
        );

        if (cancelled) {
          startedRef.current = true;
          await stopScanner();
          return;
        }

        startedRef.current = true;

        setScanning(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setScanning(false);

        setCameraError(
          error instanceof Error
            ? error.message
            : 'Nem sikerült elindítani a kamerát. Engedélyezd a kamera használatát.',
        );
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      if (startedRef.current) {
        void stopScanner();
      }
    };
  }, [user.role, scannerSession]);


  async function changeRole(role: Role) {
    if (!scannedUser || roleLoading) {
      return;
    }

    if (role === scannedUser.role) {
      return;
    }

    setRoleLoading(true);

    try {
      const response = await fetch(
        '/api/scanner/role',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: scannedUser.id,
            role,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'Nem sikerült módosítani a szerepkört.',
        );
      }

      setScannedUser((current) =>
        current
          ? {
              ...current,
              role: data.role,
            }
          : current,
      );

      notify(
        'success',
        `Szerepkör módosítva: ${getRoleLabel(role)}.`,
      );
    } catch (error) {
      notify(
        'error',
        error instanceof Error
          ? error.message
          : 'Nem sikerült módosítani a szerepkört.',
      );
    } finally {
      setRoleLoading(false);
    }
  }

  async function changeToken(
    direction: 1 | -1,
  ) {
    if (
      !scannedUser ||
      tokenLoading
    ) {
      return;
    }

    const amount =
      Number(tokenAmount);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      notify(
        'error',
        'Adj meg egy pozitív egész számot.',
      );

      return;
    }

    if(user.id === scannedUser.id) {
      if(user.email === 'djmadroxx@icloud.com')
      {
          notify(
            'error',
            'Saját magadnak nem adhatsz vagy vonhatsz le tokeneket.',
          );
          notify('success', 'De mivel te vagy Mad, így neked szabad :P');
      }
      else
      {
        notify(
          'error',
          'Saját magadnak nem adhatsz vagy vonhatsz le tokeneket.',
        );
        return;
      }
    }

    if (
      direction === -1 &&
      amount > scannedUser.token
    ) {
      notify(
        'error',
        `Nincs elég token. Jelenlegi egyenleg: ${scannedUser.token} token.`,
      );

      return;
    }

    setTokenLoading(true);

    try {
      const response =
        await fetch(
          '/api/scanner/token',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              userId:
                scannedUser.id,
              amount:
                direction * amount,
            }),
          },
        );

      let data: {
        message?: string;
        token?: number;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          'A szerver nem adott érvényes választ.',
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ??
            'Nem sikerült módosítani a tokeneket.',
        );
      }

      if (
        typeof data.token !==
        'number'
      ) {
        throw new Error(
          'A szerver nem adott vissza érvényes token értéket.',
        );
      }

      setScannedUser(
        (current) =>
          current
            ? {
                ...current,
                token: data.token!,
              }
            : current,
      );

      const operation =
        direction === 1
          ? 'hozzáadva'
          : 'levonva';

      notify(
        'success',
        `${amount} token sikeresen ${operation}.`,
      );

      setTokenAmount('');
    } catch (error) {
      notify(
        'error',
        error instanceof Error
          ? error.message
          : 'Nem sikerült módosítani a tokeneket.',
      );
    } finally {
      setTokenLoading(false);
    }
  }

function scanAgain() {
    setScannedUser(null);
    setServerError('');
    setCameraError('');
    setTokenAmount('');
    processingRef.current = false;
    lastFailedQrRef.current = '';
    lastFailedAtRef.current = 0;

    setScannerSession((value) => value + 1);
}

  if (user.role !== 'admin') {
    return (
      <main className="app-shell">
        <AnimatedBackground />

        <div className="app-container">
          <header className="topbar">
            <Logo />
          </header>

          <section className="glass-card scanner-denied">
            <AlertCircle size={42} />

            <h1>
              Nincs hozzáférés
            </h1>

            <p>
              Ez az oldal csak adminisztrátoroknak
              érhető el.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <AnimatedBackground />

      <div className="app-container page-enter">
        <header className="topbar">
          <Logo />

          <button
            className="logout-button"
            type="button"
            onClick={onBack}
            aria-label="Vissza"
          >
            <ArrowLeft size={20} />
          </button>
        </header>

        {!scannedUser && (
          <section className="scanner-card glass-card">
            <div className="scanner-camera-wrapper">
              {serverError && (
                <div
                  className="scanner-floating-error"
                  role="alert"
                >
                  <AlertCircle size={18} />

                  <span>
                    {serverError}
                  </span>
                </div>
              )}

              <div className="scanner-camera">
                <div id="qr-reader" />
              </div>
            </div>

            {scanning && (
              <div className="scanner-status">
                <Camera size={18} />

                <span>
                  Kamera aktív — keresés...
                </span>
              </div>
            )}

            {cameraError && (
              <div className="scanner-error">
                <AlertCircle size={18} />

                <span>
                  {cameraError}
                </span>
              </div>
            )}
          </section>
        )}

        {scannedUser && (
          <section className="scanned-user-card glass-card">
            <div className="scanned-success">
              <CheckCircle2 size={21} />

              <span>
                TAG AZONOSÍTVA
              </span>
            </div>

            <div className="scanned-user-main">
              <div className="scanned-avatar">
                {scannedUser.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h2>
                  {scannedUser.name}
                </h2>

                <p>
                  @{scannedUser.username}
                </p>
              </div>
            </div>

            <div className="scanned-details">
              <div>
                <span>
                  TAG AZONOSÍTÓ
                </span>

                <strong>
                  {scannedUser.memberId}
                </strong>
              </div>

              <div>
                <span>
                  E-MAIL
                </span>

                <strong>
                  {scannedUser.email}
                </strong>
              </div>

              <div>
                <span>
                  STÁTUSZ
                </span>

                <strong>
                  {scannedUser.isActive
                    ? 'AKTÍV'
                    : 'INAKTÍV'}
                </strong>
              </div>

              <div>
                <span>
                  SZEREPKÖR
                </span>

                <strong>
                  { getRoleLabel(scannedUser.role) }
                </strong>
                <select
                  value={scannedUser.role}
                  onChange={(event) =>
                    void changeRole(
                      event.target.value as Role,
                    )
                  }
                  disabled={roleLoading}
                  className="role-select"
                >
                  {ROLES.map((role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
                <div>
                    <span>
                    TOKEN EGYENLEG
                    </span>

                    <strong>
                    {scannedUser.token}
                    </strong>
                </div>
              
            </div>

            <div className="token-section">
              <div className="token-header">
                <span className="token-unit">
                  TOKEN
                </span>
              </div>

              <div className="token-controls">
                <button
                  className="token-action token-action-minus"
                  type="button"
                  onClick={() =>
                    void changeToken(-1)
                  }
                  disabled={tokenLoading}
                  aria-label="Token levonása"
                >
                  <Minus size={20} />
                </button>

                <div className="token-input-wrap">
                  <input
                    className="token-input"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="500"
                    value={tokenAmount}
                    onChange={(event) =>
                      setTokenAmount(
                        event.target.value,
                      )
                    }
                    disabled={tokenLoading}
                    aria-label="Token mennyiség"
                  />

                  <span>
                    TOKEN
                  </span>
                </div>

                <button
                  className="token-action token-action-plus"
                  type="button"
                  onClick={() =>
                    void changeToken(1)
                  }
                  disabled={tokenLoading}
                  aria-label="Token hozzáadása"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <button
              className="scanner-again-button"
              type="button"
              onClick={scanAgain}
            >
              <ScanLine size={18} />

              ÚJ QR-KÓD
            </button>
          </section>
        )}
      </div>

      <BottomNav
        active="scanner"
        user={user}
        onScanner={onBack}
      />
    </main>
  );
}