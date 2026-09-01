import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { Shell } from './components/Shell';
import { getToken } from './api';
import './styles.css';
function Private({ children }) {
    if (!getToken())
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(Shell, { children: children });
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { basename: "/admin", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(Private, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/providers", element: _jsx(Private, { children: _jsx(ProvidersPage, {}) }) }), _jsx(Route, { path: "/kyc", element: _jsx(Private, { children: _jsx(KycPage, {}) }) }), _jsx(Route, { path: "/capabilities", element: _jsx(Private, { children: _jsx(CapabilitiesPage, {}) }) }), _jsx(Route, { path: "/transfers", element: _jsx(Private, { children: _jsx(TransfersPage, {}) }) }), _jsx(Route, { path: "/ledger", element: _jsx(Private, { children: _jsx(LedgerPage, {}) }) }), _jsx(Route, { path: "/reconciliation", element: _jsx(Private, { children: _jsx(ReconciliationPage, {}) }) }), _jsx(Route, { path: "/audit", element: _jsx(Private, { children: _jsx(AuditPage, {}) }) })] }) }) }));
