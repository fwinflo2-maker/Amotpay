import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';
export function ReconciliationPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/admin/reconciliation')
            .then((d) => setItems(d.items))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(LoadingState, { label: "Loading reconciliation\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Reconciliation", subtitle: "Match AMOTPay transfers against Cashramp and ledger entries." }), items.length === 0 ? (_jsx(EmptyState, { title: "Nothing to reconcile", description: "Reconciliation runs after transfer completion." })) : (_jsxs(DataTable, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Transfer" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Cashramp" }), _jsx("th", { children: "Ledger" }), _jsx("th", { children: "Updated" })] }) }), _jsx("tbody", { children: items.map((r, i) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: String(r.transfer_reference ?? r.reference ?? '—') }) }), _jsx("td", { children: _jsx(Badge, { tone: String(r.status) === 'MATCHED' ? 'success' : 'warning', children: String(r.status ?? '—') }) }), _jsx("td", { className: "muted", children: String(r.cashramp_reference ?? '—') }), _jsx("td", { className: "muted", children: String(r.ledger_reference ?? '—') }), _jsx("td", { className: "muted", children: String(r.updated_at ?? '—') })] }, i))) })] }))] }));
}
