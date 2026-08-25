import { useEffect, useState } from 'react';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { QrPage } from './pages/QrPage';
import { ScannerPage } from './pages/ScannerPage';

import PWAOnly from './PWAOnly';
import { NotificationContainer } from './components/NotificationContainer';

import {
  getStoredUser,
  refreshUser,
  signIn,
  signOut,
  type User,
} from './lib/auth';

import './styles.css';
import './scanner.css';

type Page =
  | 'login'
  | 'register'
  | 'qr'
  | 'scanner';

function App() {
  return (
    <PWAOnly>
      <AppContent />
    </PWAOnly>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(
    () => getStoredUser(),
  );

  const [page, setPage] = useState<Page>(
    () => (getStoredUser() ? 'qr' : 'login'),
  );

  /*
   * USER ADATOK HÁTTÉRBEN TÖRTÉNŐ FRISSÍTÉSE
   *
   * Bejelentkezett user esetén 5 másodpercenként
   * lekérjük az aktuális adatokat a backendtől.
   */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const updateUser = async () => {
      const updatedUser = await refreshUser();

      if (!cancelled && updatedUser) {
        setUser(updatedUser);
      }
    };

    const interval = window.setInterval(
      updateUser,
      5000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  async function handleLogin(
    email: string,
    password: string,
  ) {
    const loggedInUser = await signIn(
      email,
      password,
    );

    setUser(loggedInUser);
    setPage('qr');
  }

  async function handleRegister(
    email: string,
    username: string,
    name: string,
    password: string,
  ) {
    const response = await fetch(
      '/api/auth/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          username,
          name,
          password,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ??
          'Sikertelen regisztráció.',
      );
    }

    setPage('login');
  }

  function handleLogout() {
    signOut();
    setUser(null);
    setPage('login');
  }

  function handleOpenScanner() {
    if (user?.role === 'admin') {
      setPage('scanner');
    }
  }

  function renderPage() {
    /*
     * NINCS BEJELENTKEZVE
     */
    if (!user) {
      if (page === 'register') {
        return (
          <RegisterPage
            onRegister={handleRegister}
            onBackToLogin={() =>
              setPage('login')
            }
          />
        );
      }

      return (
        <LoginPage
          onLogin={handleLogin}
          onRegister={() =>
            setPage('register')
          }
        />
      );
    }

    /*
     * SCANNER
     */
    if (page === 'scanner') {
      if (user.role !== 'admin') {
        setPage('qr');
        return null;
      }

      return (
        <ScannerPage
          user={user}
          onBack={() => setPage('qr')}
        />
      );
    }

    /*
     * QR / USER OLDAL
     */
    return (
      <QrPage
        user={user}
        onLogout={handleLogout}
        onOpenScanner={
          user.role === 'admin'
            ? handleOpenScanner
            : undefined
        }
      />
    );
  }

  return (
    <>
      <NotificationContainer />

      {renderPage()}
    </>
  );
}

export default App;