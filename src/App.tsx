import { useState } from 'react';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { QrPage } from './pages/QrPage';
import { ScannerPage } from './pages/ScannerPage';


import {
  getStoredUser,
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
  const [user, setUser] = useState<User | null>(
    () => getStoredUser(),
  );

  const [page, setPage] = useState<Page>(
    () => (getStoredUser() ? 'qr' : 'login'),
  );

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

export default App;