import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Login from './Login';
import { getToken, isSessionExpired, logout } from './auth';

function useSession() {
  const [authed, setAuthed] = useState(() => !!getToken() && !isSessionExpired());

  useEffect(() => {
    const check = () => {
      if (!getToken() || isSessionExpired()) {
        logout();
        setAuthed(false);
      }
    };
    const interval = setInterval(check, 30000);
    window.addEventListener('mousemove', () => sessionStorage.setItem('lastActive', Date.now().toString()));
    window.addEventListener('keydown', () => sessionStorage.setItem('lastActive', Date.now().toString()));
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', () => {});
      window.removeEventListener('keydown', () => {});
    };
  }, []);

  return [authed, setAuthed] as const;
}

import Dashboard from './Dashboard';

function App() {
  const [authed, setAuthed] = useSession();
  return authed ? <Dashboard /> : <Login onLogin={() => setAuthed(true)} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
