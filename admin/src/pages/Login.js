import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { FlowMark } from '../components/FlowMark';
import { Button } from '../components/ui';
export function LoginPage() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const nav = useNavigate();
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await login(pin);
            nav('/');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("div", { className: "login-page", children: [_jsxs("section", { className: "login-hero", children: [_jsxs("div", { className: "login-hero-brand", children: [_jsx(FlowMark, { size: 44, variant: "light" }), _jsx("span", { children: "AMOTPay" })] }), _jsxs("div", { className: "login-hero-copy", children: [_jsx("h1", { children: "Operations console" }), _jsx("p", { children: "Monitor transfers, identity verification, provider health, and financial reconciliation \u2014 all in one secure workspace." })] }), _jsx("p", { className: "login-hero-footer", children: "Cashramp \u00B7 Sumsub \u00B7 Ledger" })] }), _jsx("section", { className: "login-panel", children: _jsxs("div", { className: "login-card", children: [_jsx("h2", { children: "Welcome back" }), _jsx("p", { className: "login-lead", children: "Sign in with your admin PIN to continue." }), _jsxs("form", { onSubmit: submit, children: [_jsxs("label", { className: "field", htmlFor: "admin-pin", children: [_jsx("span", { className: "field-label", children: "Admin PIN" }), _jsx("input", { id: "admin-pin", type: "password", value: pin, onChange: (e) => setPin(e.target.value), autoComplete: "current-password", placeholder: "Enter your PIN", disabled: busy })] }), error && _jsx("p", { className: "error", children: error }), _jsx(Button, { type: "submit", disabled: busy || !pin.trim(), children: busy ? 'Signing in…' : 'Sign in' })] })] }) })] }));
}
