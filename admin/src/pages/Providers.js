import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, Badge, Button, Card, Field, LoadingState, PageHeader, } from '../components/ui';
function statusTone(status) {
    const s = (status ?? '').toLowerCase();
    if (s === 'connected')
        return 'success';
    if (s === 'unavailable' || s === 'not_configured')
        return 'warning';
    if (s === 'error')
        return 'error';
    return 'neutral';
}
export function ProvidersPage() {
    const [data, setData] = useState(null);
    const [msg, setMsg] = useState('');
    const [msgTone, setMsgTone] = useState('info');
    const [cashrampForm, setCashrampForm] = useState({
        CASHRAMP_API_URL: 'https://staging.api.useaccrue.com/cashramp/api/graphql',
        CASHRAMP_PUBLIC_KEY: '',
        CASHRAMP_SECRET_KEY: '',
        CASHRAMP_WEBHOOK_SECRET: '',
        CASHRAMP_ENVIRONMENT: 'sandbox',
    });
    const [sumsubForm, setSumsubForm] = useState({
        SUMSUB_BASE_URL: 'https://api.sumsub.com',
        SUMSUB_APP_TOKEN: '',
        SUMSUB_SECRET_KEY: '',
        SUMSUB_WEBHOOK_SECRET: '',
        SUMSUB_LEVEL_NAME: 'id-and-liveness',
    });
    async function load() {
        setData(await api('/admin/providers/overview'));
    }
    useEffect(() => {
        load();
    }, []);
    async function test(provider) {
        setMsg('');
        try {
            const r = await api(`/admin/providers/${provider.toLowerCase()}/test`, { method: 'POST', body: '{}' });
            setMsgTone(r.status === 'CONNECTED' ? 'success' : 'info');
            setMsg(`${provider}: ${r.status} (${r.latency_ms}ms)`);
            load();
        }
        catch (e) {
            setMsgTone('error');
            setMsg(e.message);
        }
    }
    async function save(provider) {
        setMsg('');
        try {
            const body = provider === 'cashramp' ? cashrampForm : sumsubForm;
            await api(`/admin/providers/${provider}`, { method: 'PUT', body: JSON.stringify(body) });
            setMsgTone('success');
            setMsg(`${provider} credentials saved (encrypted server-side)`);
            if (provider === 'cashramp') {
                setCashrampForm((f) => ({ ...f, CASHRAMP_SECRET_KEY: '', CASHRAMP_WEBHOOK_SECRET: '' }));
            }
            else {
                setSumsubForm((f) => ({ ...f, SUMSUB_SECRET_KEY: '', SUMSUB_WEBHOOK_SECRET: '', SUMSUB_APP_TOKEN: '' }));
            }
            load();
        }
        catch (e) {
            setMsgTone('error');
            setMsg(e.message);
        }
    }
    async function sync() {
        setMsg('');
        try {
            const r = await api('/admin/capabilities/sync', { method: 'POST', body: '{}' });
            setMsgTone('success');
            setMsg('Capabilities synced: ' + JSON.stringify(r));
        }
        catch (e) {
            setMsgTone('error');
            setMsg(e.message);
        }
    }
    function renderMasked(card) {
        if (!card?.credentials)
            return null;
        return (_jsx("ul", { className: "credential-list", children: Object.entries(card.credentials).map(([key, val]) => (_jsxs("li", { children: [_jsx("code", { children: key }), _jsx("span", { children: val.configured ? val.masked ?? '••••' : 'not set' })] }, key))) }));
    }
    if (!data)
        return _jsx(LoadingState, { label: "Loading providers\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Providers", subtitle: "Configure Cashramp and Sumsub sandbox credentials. Secrets are encrypted server-side.", actions: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => test('cashramp'), children: "Test Cashramp" }), _jsx(Button, { variant: "secondary", onClick: () => test('sumsub'), children: "Test Sumsub" }), _jsx(Button, { onClick: sync, children: "Sync capabilities" })] }) }), msg && _jsx(Alert, { tone: msgTone === 'error' ? 'error' : msgTone === 'success' ? 'success' : 'info', children: msg }), data.webhooks && (_jsxs(Card, { className: "provider-card", style: { marginBottom: '1.25rem' }, children: [_jsx("h2", { children: "Webhook endpoints" }), _jsx("ul", { className: "credential-list", children: Object.entries(data.webhooks).map(([k, v]) => (_jsxs("li", { children: [_jsx("strong", { children: k }), _jsx("code", { children: v })] }, k))) })] })), _jsxs("div", { className: "provider-grid", children: [_jsxs(Card, { className: "provider-card", children: [_jsxs("h2", { children: ["Cashramp", _jsx(Badge, { tone: statusTone(data.cashramp?.status), children: data.cashramp?.status ?? 'unknown' })] }), renderMasked(data.cashramp), _jsx(Field, { label: "Public key", children: _jsx("input", { value: cashrampForm.CASHRAMP_PUBLIC_KEY, onChange: (e) => setCashrampForm({ ...cashrampForm, CASHRAMP_PUBLIC_KEY: e.target.value }) }) }), _jsx(Field, { label: "Secret key", hint: "Never stored in the browser after save", children: _jsx("input", { type: "password", value: cashrampForm.CASHRAMP_SECRET_KEY, onChange: (e) => setCashrampForm({ ...cashrampForm, CASHRAMP_SECRET_KEY: e.target.value }) }) }), _jsx(Field, { label: "Webhook secret", children: _jsx("input", { type: "password", value: cashrampForm.CASHRAMP_WEBHOOK_SECRET, onChange: (e) => setCashrampForm({ ...cashrampForm, CASHRAMP_WEBHOOK_SECRET: e.target.value }) }) }), _jsx(Button, { onClick: () => save('cashramp'), children: "Save Cashramp" })] }), _jsxs(Card, { className: "provider-card", children: [_jsxs("h2", { children: ["Sumsub", _jsx(Badge, { tone: statusTone(data.sumsub?.status), children: data.sumsub?.status ?? 'unknown' })] }), renderMasked(data.sumsub), _jsx(Field, { label: "App token", children: _jsx("input", { type: "password", value: sumsubForm.SUMSUB_APP_TOKEN, onChange: (e) => setSumsubForm({ ...sumsubForm, SUMSUB_APP_TOKEN: e.target.value }) }) }), _jsx(Field, { label: "Secret key", children: _jsx("input", { type: "password", value: sumsubForm.SUMSUB_SECRET_KEY, onChange: (e) => setSumsubForm({ ...sumsubForm, SUMSUB_SECRET_KEY: e.target.value }) }) }), _jsx(Field, { label: "Webhook secret", children: _jsx("input", { type: "password", value: sumsubForm.SUMSUB_WEBHOOK_SECRET, onChange: (e) => setSumsubForm({ ...sumsubForm, SUMSUB_WEBHOOK_SECRET: e.target.value }) }) }), _jsx(Button, { onClick: () => save('sumsub'), children: "Save Sumsub" })] })] })] }));
}
