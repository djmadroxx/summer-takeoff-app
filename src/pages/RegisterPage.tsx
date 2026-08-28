import { useState } from 'react';
import type { SubmitEventHandler } from 'react';

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { AnimatedBackground } from '../components/AnimatedBackground';
import { Logo } from '../components/Logo';
import { notify } from '../lib/notifications';

interface RegisterPageProps {
  onRegister: (
    email: string,
    username: string,
    name: string,
    password: string,
  ) => Promise<void>;

  onBackToLogin: () => void;
}

export function RegisterPage({
  onRegister,
  onBackToLogin,
}: RegisterPageProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showPasswordAgain, setShowPasswordAgain] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> =
    async (event) => {
      event.preventDefault();

      if (
        !name.trim() ||
        !username.trim() ||
        !email.trim() ||
        !password ||
        !passwordAgain
      ) {
        notify('error', 'Minden mező kitöltése kötelező.');

        return;
      }

      if (!email.includes('@')) {
        notify('error', 'Érvényes e-mail címet adj meg.');

        return;
      }

      if (username.trim().length < 3) {
        notify('error', 'A felhasználónév legalább 3 karakteres legyen.');

        return;
      }

      if (password.length < 8) {
        notify('error', 'A jelszónak legalább 8 karakteresnek kell lennie.');

        return;
      }

      if (password !== passwordAgain) {
        notify('error', 'A két jelszó nem egyezik.');

        return;
      }

      setIsLoading(true);

      try {
        await onRegister(
          email.trim(),
          username.trim(),
          name.trim(),
          password,
        );
      } catch (error) {
        notify('error', error instanceof Error ? error.message : 'Sikertelen regisztráció.');
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

          <h1>Csatlakozz.</h1>

          <p>
            Hozd létre a saját Summer Takeoff
            fiókodat.
          </p>
        </div>

        <form
          className="auth-card glass-card"
          onSubmit={handleSubmit}
          noValidate
        >
          <label
            className="field-label"
            htmlFor="name"
          >
            Név
          </label>

          <div className="input-wrap">
            <UserRound
              size={19}
              aria-hidden="true"
            />

            <input
              autoComplete="name"
              id="name"
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Teljes neved"
              type="text"
              value={name}
            />
          </div>

          <label
            className="field-label"
            htmlFor="username"
          >
            Felhasználónév
          </label>

          <div className="input-wrap">
            <UserRound
              size={19}
              aria-hidden="true"
            />

            <input
              autoComplete="username"
              id="username"
              onChange={(event) =>
                setUsername(
                  event.target.value,
                )
              }
              placeholder="pl. madroxx"
              type="text"
              value={username}
            />
          </div>

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
                setEmail(event.target.value)
              }
              placeholder="te@email.com"
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
              autoComplete="new-password"
              id="password"
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Legalább 8 karakter"
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
              className="button button-icon"
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

          <label
            className="field-label"
            htmlFor="passwordAgain"
          >
            Jelszó újra
          </label>

          <div className="input-wrap">
            <LockKeyhole
              size={19}
              aria-hidden="true"
            />

            <input
              autoComplete="new-password"
              id="passwordAgain"
              onChange={(event) =>
                setPasswordAgain(
                  event.target.value,
                )
              }
              placeholder="Jelszó újra"
              type={
                showPasswordAgain
                  ? 'text'
                  : 'password'
              }
              value={passwordAgain}
            />

            <button
              aria-label={
                showPasswordAgain
                  ? 'Jelszó elrejtése'
                  : 'Jelszó megjelenítése'
              }
              className="button button-icon"
              onClick={() =>
                setShowPasswordAgain(
                  (value) => !value,
                )
              }
              type="button"
            >
              {showPasswordAgain ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <button
            className="button button-primary"
            disabled={isLoading}
            type="submit"
          >
            <span>
              {isLoading
                ? 'REGISZTRÁCIÓ…'
                : 'REGISZTRÁCIÓ'}
            </span>

            {!isLoading && (
              <ArrowRight size={21} />
            )}
          </button>

          <button
            className="button button-text"
            onClick={onBackToLogin}
            type="button"
          >
            Már van fiókod? <strong>Bejelentkezés</strong>
          </button>
        </form>

        <div className="auth-trust">
          <ShieldCheck size={17} />

          <span>
            Biztonságos regisztráció • Summer Takeoff
          </span>
        </div>
      </div>
    </main>
  );
}