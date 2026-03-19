import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Sparkles, UtensilsCrossed, LogOut, Menu, X, Sun, Moon, FolderOpen, Package } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/specials', icon: Sparkles, label: 'Specials' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/media', icon: FolderOpen, label: 'Media' },
];

export function Sidebar() {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary tracking-tight">
          Iggy's <span className="text-primary">Manager</span>
        </h1>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-dark border-l-3 border-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle + User & Sign Out */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <p className="px-3 text-xs text-text-muted truncate">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-danger transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-border shadow-card"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full bg-surface border-r border-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-hover"
            >
              <X size={18} />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-surface border-r border-border h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>
    </>
  );
}
