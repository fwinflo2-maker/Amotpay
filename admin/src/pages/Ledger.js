import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';
export function LedgerPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/admin/ledger')
            .then((d) => setItems(d.items))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(LoadingState, { label: "Loading ledger\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Ledger", subtitle: "Double-entry accounting \u2014 debits must equal credits." }), items.length === 0 ? (_jsx(EmptyState, { title: "Ledger empty", description: "Entries are created after transfer settlement." })) : (_jsxs(DataTable, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Reference" }), _jsx("th", { children: "Operation" }), _jsx("th", { children: "Account" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Amount" })] }) }), _jsx("tbody", { children: items.map((e, i) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: String(e.reference) }) }), _jsx("td", { children: String(e.operation_type) }), _jsxs("td", { children: [String(e.account_type), ":", String(e.account_id)] }), _jsx("td", { children: String(e.entry_type) }), _jsx("td", { children: _jsxs("strong", { children: [String(e.amount), " ", String(e.currency)] }) })] }, i))) })] }))] }));
}
