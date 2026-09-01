import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';
export function AuditPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/admin/audits')
            .then((d) => setItems(d.items))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(LoadingState, { label: "Loading audit logs\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Audit", subtitle: "Immutable log of admin actions and security events." }), items.length === 0 ? (_jsx(EmptyState, { title: "No audit entries", description: "Admin actions will be recorded here automatically." })) : (_jsxs(DataTable, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Action" }), _jsx("th", { children: "Resource" }), _jsx("th", { children: "IP" }), _jsx("th", { children: "At" })] }) }), _jsx("tbody", { children: items.map((a) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: String(a.action) }) }), _jsxs("td", { children: [String(a.resource_type), ":", String(a.resource_id ?? '—')] }), _jsx("td", { className: "muted", children: _jsx("code", { children: String(a.ip_address) }) }), _jsx("td", { className: "muted", children: String(a.created_at) })] }, String(a.id)))) })] }))] }));
}
