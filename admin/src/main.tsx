import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ProvidersPage } from './pages/Providers';
import { KycPage } from './pages/Kyc';
import { CapabilitiesPage } from './pages/Capabilities';
import { TransfersPage } from './pages/Transfers';
import { LedgerPage } from './pages/Ledger';
import { ReconciliationPage } from './pages/Reconciliation';
import { AuditPage } from './pages/Audit';
import { getToken, setToken } from './api';
import './styles.css';

function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = [
    ['/', 'Dashboard'],
    ['/providers', 'Providers'],
    ['/kyc', 'KYC'],
    ['/capabilities', 'Capabilities'],
    ['/transfers', 'Transfers'],
    ['/ledger', 'Ledger'],
    ['/reconciliation', 'Reconciliation'],
    ['/audit', 'Audit'],
  ];
  return (
    <div className="layout">
      <aside>
        <div className="brand">AMOTPay Admin</div>
        <nav>
          {nav.map(([to, label]) => (
            <Link key={to} to={to} className={loc.pathname === to ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <button className="ghost" onClick={() => { setToken(null); window.location.href = '/admin/login'; }}>Logout</button>
      </aside>
      <main>{children}</main>
    </div>
  );
}

function Private({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Private><DashboardPage /></Private>} />
        <Route path="/providers" element={<Private><ProvidersPage /></Private>} />
        <Route path="/kyc" element={<Private><KycPage /></Private>} />
        <Route path="/capabilities" element={<Private><CapabilitiesPage /></Private>} />
        <Route path="/transfers" element={<Private><TransfersPage /></Private>} />
        <Route path="/ledger" element={<Private><LedgerPage /></Private>} />
        <Route path="/reconciliation" element={<Private><ReconciliationPage /></Private>} />
        <Route path="/audit" element={<Private><AuditPage /></Private>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
