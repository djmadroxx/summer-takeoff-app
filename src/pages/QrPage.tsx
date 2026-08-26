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
import { Logo } from '../components/Logo';

import type { User } from '../lib/auth';

interface QrPageProps {
  user: User;
  onLogout: () => void;
}

export function QrPage({
  user,
  onLogout,
}: QrPageProps) {
  /*
   * Ez a QR kizárólag a felhasználó
   * azonosítására szolgál.
   *
   * A QR-ben csak az egyedi qrToken van.
   *
   * Nem tartalmaz ticketet,
   * egyenleget vagy egyéb változó adatot.
   */
  const qrValue = user.qrToken;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(
        user.memberId,
      );
    } catch {
      // Clipboard access can be blocked by the browser.
    }
  }

  return (
    <main className="app-shell">
      <AnimatedBackground />

      <div className="app-container page-enter">
        <header className="topbar">
          <Logo />

          <button
            className="logout-button"
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
              {getRoleLabel(user.role)}
            </h2>
          </div>

          <div className="qr-stage">
            <div className="qr-glow" />

            <div className="qr-frame">
              <QRCodeSVG
                bgColor="#ffffff"
                fgColor="#050505"
                includeMargin
                level="M"
                size={128}
                value={qrValue}
              />

              <div className="scan-line" />
            </div>
          </div>

          <div className="qr-caption">
            <ShieldCheck size={17} />

            <span>
              Ez a QR-kód az egyedi
              felhasználói azonosítód.
            </span>
          </div>

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
          A QR-kódod egyedi és állandó.
          Ne oszd meg másokkal.
        </p>
      </div>
    </main>
  );
}