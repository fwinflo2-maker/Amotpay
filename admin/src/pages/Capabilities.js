import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';
export function CapabilitiesPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/admin/capabilities')
            .then((d) => setItems(d.items))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(LoadingState, { label: "Loading capabilities\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Capabilities", subtitle: "Cashramp-sourced corridors, currencies, and payment methods." }), items.length === 0 ? (_jsx(EmptyState, { title: "No capabilities synced", description: "Run a provider sync from the Providers page." })) : (_jsxs(DataTable, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Type" }), _jsx("th", { children: "Key" }), _jsx("th", { children: "Country" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: items.map((c, i) => (_jsxs("tr", { children: [_jsx("td", { children: String(c.capability_type) }), _jsx("td", { children: _jsx("code", { children: String(c.capability_key) }) }), _jsx("td", { children: String(c.country_code ?? '—') }), _jsx("td", { children: _jsx(Badge, { tone: "success", children: String(c.status) }) })] }, i))) })] }))] }));
}
