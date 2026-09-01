import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ProvidersPage } from './pages/Providers';
import { KycPage } from './pages/Kyc';
import { CapabilitiesPage } from './pages/Capabilities';
import { TransfersPage } from './pages/Transfers';
import { LedgerPage } from './pages/Ledger';
import { ReconciliationPage } from './pages/Reconciliation';
import { AuditPage } from './pages/Audit';
import { SettingsPage } from './pages/Settings';
import { Shell } from './components/Shell';
import { getToken } from './api';
import './styles.css';

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
        <Route path="/settings" element={<Private><SettingsPage /></Private>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
