import { LogOut, Mail, Menu, PenLine, Send, Clock, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Avatar } from './ui';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const logout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <span className="brand-mark">R</span>
        ReachInbox
        <button className="close" type="button" onClick={onClose} aria-label="Close sidebar">
          <X size={18} />
        </button>
      </div>

      <div className="profile">
        <Avatar label={user?.name?.[0] || 'U'} src={user?.avatar} />
        <div className="profile-info">
          <b>{user?.name || 'User'}</b>
          <small>{user?.email || ''}</small>
        </div>
      </div>

      <button type="button" className="compose-btn" onClick={() => { navigate('/compose'); onClose(); }}>
        <PenLine size={16} /> Compose
      </button>

      <div className="nav-section">
        <div className="nav-label">CORE</div>
        <nav>
          <NavLink to="/sent" onClick={onClose}>
            <Send size={17} /> Sent
          </NavLink>
          <NavLink to="/scheduled" onClick={onClose}>
            <Clock size={17} /> Scheduled
          </NavLink>
        </nav>
      </div>

      <button className="logout" type="button" onClick={logout}>
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="app-main">
        <header className="mobile-head">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <b>ReachInbox</b>
          <Mail size={19} />
        </header>
        {children}
      </main>
    </div>
  );
}