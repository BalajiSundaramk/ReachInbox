import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ComposePage, EmailDetailPage, LoginPage, ScheduledPage, SentPage } from './pages';
import { authService } from './services/authService';

function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'fail'>('checking');

  useEffect(() => {
    authService.checkAuth().then((user) => {
      setStatus(user ? 'ok' : 'fail');
    });
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7470', fontSize: 15 }}>
        Loading…
      </div>
    );
  }

  if (status === 'fail') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/sent" element={<RequireAuth><SentPage /></RequireAuth>} />
      <Route path="/scheduled" element={<RequireAuth><ScheduledPage /></RequireAuth>} />
      <Route path="/compose" element={<RequireAuth><ComposePage /></RequireAuth>} />
      <Route path="/emails/:id" element={<RequireAuth><EmailDetailPage /></RequireAuth>} />

      {/* Default redirect to Sent page */}
      <Route path="/" element={<Navigate to="/sent" replace />} />
      <Route path="*" element={<Navigate to="/sent" replace />} />
    </Routes>
  );
}