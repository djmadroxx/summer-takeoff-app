import { useState } from 'react';
import type { SubmitEventHandler } from 'react';

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { AnimatedBackground } from '../components/AnimatedBackground';
import { Logo } from '../components/Logo';
import { notify } from '../lib/notifications';

interface LoginPageProps {
  onLogin: (
    email: string,
    password: string,
  ) => Promise<void>;

  onRegister?: () => void;
}

export function LoginPage({
  onLogin,
  onRegister,
}: LoginPageProps) {
  
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('summer-takeoff-email') ?? '';
  });

  const [password, setPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(() => {
    return (
      localStorage.getItem('summer-takeoff-remember') === 'true'
    );
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> =
    async (event) => {
      event.preventDefault();

      if (!email.trim() || !password.trim()) {
        notify('error',
          'Add meg az e-mail címed és a jelszavad.',
        );
        return;
      }

      if (!email.includes('@')) {
        notify('error',
          'Érvényes e-mail címet adj meg.',
        );
        return;
      }

      setIsLoading(true);
      if (rememberMe) {
        localStorage.setItem(
          'summer-takeoff-email',
          email.trim(),
        );

        localStorage.setItem(
          'summer-takeoff-remember',
          'true',
        );
      } else {
        localStorage.removeItem(
          'summer-takeoff-email',
        );

        localStorage.removeItem(
          'summer-takeoff-remember',
        );
      }
      try {
        await onLogin(
          email.trim(),
          password,
        );
      } catch (error) {
        notify('error',
          error instanceof Error
            ? error.message
            : 'Sikertelen bejelentkezés.',
        );
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <main className="auth-shell">
      <AnimatedBackground />

      <div className="auth-container page-enter">
        <Logo />

        <div className="auth-heading">
          <div className="eyebrow">
            <span />
            SUMMER TAKEOFF
          </div>

          <h1>Üdv újra.</h1>

          <p>
            Jelentkezz be, és legyen nálad
            a saját QR-kódod.
          </p>
        </div>

        <form
          className="auth-card glass-card"
          onSubmit={handleSubmit}
          noValidate
        >
          <label
            className="field-label"
            htmlFor="email"
          >
            E-mail cím
          </label>

          <div className="input-wrap">
            <Mail
              size={19}
              aria-hidden="true"
            />

            <input
              autoComplete="email"
              id="email"
              inputMode="email"
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="E-mail cím"
              type="email"
              value={email}
            />
          </div>

          <label
            className="field-label"
            htmlFor="password"
          >
            Jelszó
          </label>

          <div className="input-wrap">
            <LockKeyhole
              size={19}
              aria-hidden="true"
            />

            <input
              autoComplete="current-password"
              id="password"
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="••••••••"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
            />

            <button
              aria-label={
                showPassword
                  ? 'Jelszó elrejtése'
                  : 'Jelszó megjelenítése'
              }
              className="aria-button"
              onClick={() =>
                setShowPassword(
                  (value) => !value,
                )
              }
              type="button"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
            <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) =>
                setRememberMe(event.target.checked)
              }
            />

            <span className="remember-box">
              <span className="remember-check">✓</span>
            </span>

            <span className="remember-text">
              Jegyezz meg
            </span>
          </label>

          <button
            className="primary-button"
            disabled={isLoading}
            type="submit"
          >
            <span>
              {isLoading
                ? 'Beléptetés…'
                : 'BEJELENTKEZÉS'}
            </span>

            {!isLoading && (
              <ArrowRight size={21} />
            )}
          </button>

          <button
            className="text-button"
            type="button"
          >
            Elfelejtetted a jelszavad?
          </button>

          <div className="auth-divider">
            <small className="auth-divider-text">VAGY</small>
          </div>

          <button
            className="text-button register-link"
            onClick={onRegister}
            type="button"
          >
            Nincs még fiókod?{' '}
            <strong>Regisztráció</strong>
          </button>
        </form>

        <div className="auth-trust">
          <ShieldCheck size={17} />

          <span>
            Biztonságos belépés • Summer
            Takeoff
          </span>
        </div>
      </div>
    </main>
  );
}