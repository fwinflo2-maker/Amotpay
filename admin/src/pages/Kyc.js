import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';
function kycTone(status) {
    const s = status.toLowerCase();
    if (s === 'verified' || s === 'approved')
        return 'success';
    if (s === 'pending' || s === 'in_review')
        return 'warning';
    if (s === 'rejected' || s === 'failed')
        return 'error';
    return 'neutral';
}
export function KycPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api('/admin/kyc')
            .then((d) => setItems(d.items))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(LoadingState, { label: "Loading KYC records\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "KYC", subtitle: "Identity verification status across all users (Sumsub source of truth)." }), items.length === 0 ? (_jsx(EmptyState, { title: "No KYC records yet", description: "Applicants will appear here after onboarding." })) : (_jsxs(DataTable, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "User" }), _jsx("th", { children: "Country" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Level" }), _jsx("th", { children: "Applicant ID" }), _jsx("th", { children: "Updated" })] }) }), _jsx("tbody", { children: items.map((u) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("strong", { children: [String(u.first_name), " ", String(u.last_name)] }) }), _jsx("td", { children: String(u.country_code) }), _jsx("td", { children: _jsx(Badge, { tone: kycTone(String(u.kyc_status)), children: String(u.kyc_status) }) }), _jsx("td", { className: "muted", children: String(u.level_name ?? '—') }), _jsx("td", { className: "muted", children: _jsx("code", { children: String(u.sumsub_applicant_id ?? '—') }) }), _jsx("td", { className: "muted", children: String(u.kyc_updated_at ?? '—') })] }, String(u.id)))) })] }))] }));
}
