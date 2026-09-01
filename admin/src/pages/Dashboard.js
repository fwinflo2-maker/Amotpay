import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Card, LoadingState, PageHeader, StatCard } from '../components/ui';
function providerTone(status) {
    const s = status.toLowerCase();
    if (s === 'connected' || s === 'configured')
        return 'success';
    if (s === 'unavailable' || s === 'not_configured')
        return 'warning';
    if (s === 'error')
        return 'error';
    return 'neutral';
}
export function DashboardPage() {
    const [data, setData] = useState(null);
    useEffect(() => {
        api('/admin/dashboard').then(setData).catch(console.error);
    }, []);
    if (!data)
        return _jsx(LoadingState, { label: "Loading dashboard\u2026" });
    const providers = data.providers ?? {};
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Dashboard", subtitle: "Real-time overview of platform operations and provider health." }), _jsxs("div", { className: "stat-grid", children: [_jsx(StatCard, { label: "Transfers today", value: String(data.transactions_today ?? '—') }), _jsx(StatCard, { label: "KYC pending", value: String(data.kyc_pending ?? '—'), tone: "warning" }), _jsx(StatCard, { label: "Cashramp", value: _jsx(Badge, { tone: providerTone(providers.cashramp ?? ''), children: providers.cashramp ?? 'unknown' }) }), _jsx(StatCard, { label: "Sumsub", value: _jsx(Badge, { tone: providerTone(providers.sumsub ?? ''), children: providers.sumsub ?? 'unknown' }) })] }), _jsxs(Card, { children: [_jsx("h2", { style: { margin: '0 0 0.75rem', fontSize: '1rem' }, children: "System snapshot" }), _jsx("pre", { className: "json-preview", style: { borderRadius: 'var(--radius-md)', maxHeight: 280 }, children: JSON.stringify(data, null, 2) })] })] }));
}
