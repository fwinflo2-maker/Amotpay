import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { MigrationsPage } from './pages/Migrations';
import { Shell } from './components/Shell';
import { api, getToken, passwordChangeRequired, setAccountStatus } from './api';
import './styles.css';
function Private({ children }) {
    const location = useLocation();
    const [ready, setReady] = useState(false);
    const [mustChangePassword, setMustChangePassword] = useState(passwordChangeRequired());
    useEffect(() => {
        if (!getToken()) {
            setReady(true);
            return;
        }
        api('/admin/account')
            .then((data) => {
            setAccountStatus({
                password_change_required: data.password_change_required,
                username: data.username,
                totp_enabled: data.totp_enabled,
            });
            setMustChangePassword(data.password_change_required);
        })
            .catch(() => undefined)
            .finally(() => setReady(true));
    }, [location.pathname]);
    if (!getToken())
        return _jsx(Navigate, { to: "/login", replace: true });
    if (!ready)
        return null;
    if (mustChangePassword && location.pathname !== '/settings') {
        return _jsx(Navigate, { to: "/settings", replace: true });
    }
    return _jsx(Shell, { children: children });
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { basename: "/admin", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(Private, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/providers", element: _jsx(Private, { children: _jsx(ProvidersPage, {}) }) }), _jsx(Route, { path: "/kyc", element: _jsx(Private, { children: _jsx(KycPage, {}) }) }), _jsx(Route, { path: "/capabilities", element: _jsx(Private, { children: _jsx(CapabilitiesPage, {}) }) }), _jsx(Route, { path: "/transfers", element: _jsx(Private, { children: _jsx(TransfersPage, {}) }) }), _jsx(Route, { path: "/ledger", element: _jsx(Private, { children: _jsx(LedgerPage, {}) }) }), _jsx(Route, { path: "/reconciliation", element: _jsx(Private, { children: _jsx(ReconciliationPage, {}) }) }), _jsx(Route, { path: "/audit", element: _jsx(Private, { children: _jsx(AuditPage, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(Private, { children: _jsx(SettingsPage, {}) }) }), _jsx(Route, { path: "/migrations", element: _jsx(Private, { children: _jsx(MigrationsPage, {}) }) })] }) }) }));
