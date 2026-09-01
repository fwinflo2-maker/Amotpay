import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';
export function TransfersPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/admin/transfers/v2')
            .then((d) => setItems(d.items))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(LoadingState, { label: "Loading transfers\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Transfers", subtitle: "Universal send v2 \u2014 sandbox and production execution log." }), items.length === 0 ? (_jsx(EmptyState, { title: "No transfers yet", description: "Completed transfers will appear here with provider references." })) : (_jsxs(DataTable, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Reference" }), _jsx("th", { children: "User" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Provider ref" })] }) }), _jsx("tbody", { children: items.map((t) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: String(t.reference) }) }), _jsx("td", { children: String(t.user_id) }), _jsx("td", { children: _jsxs("strong", { children: [String(t.source_amount), " ", String(t.source_currency)] }) }), _jsx("td", { children: _jsx(Badge, { tone: "accent", children: String(t.status) }) }), _jsx("td", { className: "muted", children: String(t.provider_reference ?? '—') })] }, String(t.reference)))) })] }))] }));
}
