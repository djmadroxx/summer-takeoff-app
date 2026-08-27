import { useEffect, useState } from 'react';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { QrPage } from './pages/QrPage';
import { ScannerPage } from './pages/ScannerPage';
import { ShopPage } from './pages/ShopPage';
import { ProductsAdminPage } from './pages/ProductsAdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { EventsPage } from './pages/EventsPage';
import PWAOnly from './PWAOnly';

import { NotificationContainer } from './components/NotificationContainer';
import { BottomNav } from './components/BottomNav';

import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from './lib/notificationSocket';

import {
  getStoredUser,
  refreshUser,
  signIn,
  signOut,
  type User,
} from './lib/auth';

import './styles.css';
import './scanner.css';

import type {
  NavigationPage,
} from './components/BottomNav';

type Page =
  | 'login'
  | 'register'
  | 'products-admin'
  | NavigationPage;

function App() {
  return (
    <PWAOnly>
      <AppContent />
    </PWAOnly>
  );
}

function AppContent() {
  const [user, setUser] =
    useState<User | null>(
      () => getStoredUser(),
    );

  const [page, setPage] =
    useState<Page>(
      () =>
        getStoredUser()
          ? 'qr'
          : 'login',
    );

  /*
   * ========================================================
   * NOTIFICATION WEBSOCKET
   * ========================================================
   */

  useEffect(() => {
    if (!user) {
      disconnectNotificationSocket();
      return;
    }

    connectNotificationSocket();

    return () => {
      disconnectNotificationSocket();
    };
  }, [user]);

  /*
   * ========================================================
   * USER ADATOK FRISSÍTÉSE
   * ========================================================
   *
   * Bejelentkezett user esetén 5 másodpercenként
   * lekérjük az aktuális adatokat.
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const updateUser = async () => {
      const updatedUser =
        await refreshUser();

      if (
        !cancelled &&
        updatedUser
      ) {
        setUser(updatedUser);
      }
    };

    const interval =
      window.setInterval(
        updateUser,
        5000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval,
      );
    };
  }, [user]);

  /*
   * ========================================================
   * AUTH
   * ========================================================
   */

  async function handleLogin(
    email: string,
    password: string,
  ) {
    const loggedInUser =
      await signIn(
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
    const response =
      await fetch(
        '/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
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

    const data =
      await response.json();

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

  /*
   * ========================================================
   * NAVIGATION
   * ========================================================
   *
   * Minden navigáció egyetlen helyen történik.
   *
   * Az oldalaknak nem kell tudniuk a BottomNav-ról.
   */

  function navigate(
    nextPage: NavigationPage,
  ) {
    if (!user) {
      return;
    }

    /*
     * Scanner csak adminnak.
     */
    if (
      nextPage === 'scanner' &&
      user.role !== 'admin'
    ) {
      setPage('qr');
      return;
    }

    setPage(nextPage);
  }

  /*
   * ========================================================
   * PAGE RENDERING
   * ========================================================
   */

  function renderPage() {
    /*
     * --------------------------------------------------------
     * NINCS BEJELENTKEZVE
     * --------------------------------------------------------
     */

    if (!user) {
      if (
        page === 'register'
      ) {
        return (
          <RegisterPage
            onRegister={
              handleRegister
            }
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

    if (page === 'events') {
      return (
        <EventsPage
          user={user}
          onBack={() =>
            setPage('qr')
          }
        />
      );
    }
    /*
     * --------------------------------------------------------
     * SHOP
     * --------------------------------------------------------
     */

    if (page === 'shop') {
      return (
        <ShopPage
          user={user}
          onBack={() =>
            setPage('qr')
          }
          onOpenProductsAdmin={() =>
            setPage(
              'products-admin',
            )
          }
        />
      );
    }

    /*
     * --------------------------------------------------------
     * ADMIN - TERMÉKEK
     * --------------------------------------------------------
     */

    if (
      page ===
      'products-admin'
    ) {
      if (
        user.role !== 'admin'
      ) {
        setPage('qr');
        return null;
      }

      return (
        <ProductsAdminPage
          user={user}
          onBack={() =>
            setPage('qr')
          }
        />
      );
    }

    /*
     * --------------------------------------------------------
     * SCANNER
     * --------------------------------------------------------
     */

    if (
      page === 'scanner'
    ) {
      if (
        user.role !== 'admin'
      ) {
        setPage('qr');
        return null;
      }

      return (
        <ScannerPage
          user={user}
          onBack={() =>
            setPage('qr')
          }
        />
      );
    }

    /*
     * --------------------------------------------------------
     * PROFIL
     * --------------------------------------------------------
     */

    if (
      page === 'profile'
    ) {
      return (
        <ProfilePage
          user={user}
          onBack={() =>
            setPage('qr')
          }
          onUserUpdated={(
            updatedUser,
          ) => {
            setUser(
              updatedUser,
            );
          }}
        />
      );
    }

    /*
     * --------------------------------------------------------
     * QR / USER OLDAL
     * --------------------------------------------------------
     */

    return (
      <QrPage
        user={user}
        onLogout={
          handleLogout
        }
      />
    );
  }

  /*
   * ========================================================
   * APP
   * ========================================================
   */

  return (
    <>
      <NotificationContainer />

      {renderPage()}

      {user && (
        <BottomNav
          active={
            page === 'scanner'
              ? 'scanner'
              : page === 'shop' ||
                  page === 'products-admin'
                ? 'shop'
                : page === 'profile'
                  ? 'profile'
                  : page
          }
          user={user}
          onNavigate={navigate}
        />
      )}
    </>
  );
}

export default App;