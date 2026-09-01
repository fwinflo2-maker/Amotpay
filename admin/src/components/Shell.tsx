import { Link, useLocation } from 'react-router-dom';
import { setToken } from '../api';
import { AmotpayLogo } from './AmotpayLogo';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/providers', label: 'Providers', icon: 'plug' },
  { to: '/kyc', label: 'KYC', icon: 'shield' },
  { to: '/capabilities', label: 'Capabilities', icon: 'globe' },
  { to: '/transfers', label: 'Transfers', icon: 'send' },
  { to: '/ledger', label: 'Ledger', icon: 'book' },
  { to: '/reconciliation', label: 'Reconciliation', icon: 'balance' },
  { to: '/audit', label: 'Audit', icon: 'list' },
] as const;

function NavIcon({ name }: { name: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 };
  switch (name) {
    case 'grid':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'plug':
      return (
        <svg {...props}>
          <path d="M12 22v-5" strokeLinecap="round" />
          <path d="M9 8V2h6v6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 12h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" strokeLinejoin="round" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case 'send':
      return (
        <svg {...props}>
          <path d="M22 2L11 13" strokeLinecap="round" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinejoin="round" />
        </svg>
      );
    case 'book':
      return (
        <svg {...props}>
          <path d="M5 4h11a3 3 0 0 1 3 3v14H8a3 3 0 0 1-3-3V4z" />
          <path d="M5 18h14" />
        </svg>
      );
    case 'balance':
      return (
        <svg {...props}>
          <path d="M12 3v18" strokeLinecap="round" />
          <path d="M5 7h14M7 12h10M9 17h6" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
        </svg>
      );
  }
}

export function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  return (
    <div className="nexus-dash app-shell">
      <div className="dash-ambient" aria-hidden>
        <div className="dash-grid" />
        <div className="dash-glow dash-glow--a" />
        <div className="dash-glow dash-glow--b" />
      </div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <AmotpayLogo size={34} />
          <div>
            <span className="sidebar-title">AMOTPay</span>
            <span className="sidebar-tag">Admin console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => {
            const active = loc.pathname === to;
            return (
              <Link key={to} to={to} className={`nav-link${active ? ' nav-link--active' : ''}`}>
                <NavIcon name={icon} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="env-pill">
            <span className="env-dot" />
            Production
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sidebar"
            onClick={() => {
              setToken(null);
              window.location.href = '/admin/login';
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
