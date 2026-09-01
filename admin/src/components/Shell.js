import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { setToken } from '../api';
import { FlowMark } from './FlowMark';
const NAV = [
    { to: '/', label: 'Dashboard', icon: 'grid' },
    { to: '/providers', label: 'Providers', icon: 'plug' },
    { to: '/kyc', label: 'KYC', icon: 'shield' },
    { to: '/capabilities', label: 'Capabilities', icon: 'globe' },
    { to: '/transfers', label: 'Transfers', icon: 'send' },
    { to: '/ledger', label: 'Ledger', icon: 'book' },
    { to: '/reconciliation', label: 'Reconciliation', icon: 'balance' },
    { to: '/audit', label: 'Audit', icon: 'list' },
];
function NavIcon({ name }) {
    const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 };
    switch (name) {
        case 'grid':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" })] }));
        case 'plug':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M12 22v-5", strokeLinecap: "round" }), _jsx("path", { d: "M9 8V2h6v6", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M8 12h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z" })] }));
        case 'shield':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z", strokeLinejoin: "round" }) }));
        case 'globe':
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("path", { d: "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" })] }));
        case 'send':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M22 2L11 13", strokeLinecap: "round" }), _jsx("path", { d: "M22 2l-7 20-4-9-9-4 20-7z", strokeLinejoin: "round" })] }));
        case 'book':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M5 4h11a3 3 0 0 1 3 3v14H8a3 3 0 0 1-3-3V4z" }), _jsx("path", { d: "M5 18h14" })] }));
        case 'balance':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M12 3v18", strokeLinecap: "round" }), _jsx("path", { d: "M5 7h14M7 12h10M9 17h6", strokeLinecap: "round" })] }));
        default:
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", strokeLinecap: "round" }) }));
    }
}
export function Shell({ children }) {
    const loc = useLocation();
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-brand", children: [_jsx(FlowMark, { size: 36, variant: "light" }), _jsxs("div", { children: [_jsx("span", { className: "sidebar-title", children: "AMOTPay" }), _jsx("span", { className: "sidebar-tag", children: "Operations" })] })] }), _jsx("nav", { className: "sidebar-nav", children: NAV.map(({ to, label, icon }) => {
                            const active = loc.pathname === to;
                            return (_jsxs(Link, { to: to, className: `nav-link${active ? ' nav-link--active' : ''}`, children: [_jsx(NavIcon, { name: icon }), _jsx("span", { children: label }), active && _jsx("span", { className: "nav-indicator", "aria-hidden": true })] }, to));
                        }) }), _jsxs("div", { className: "sidebar-footer", children: [_jsxs("div", { className: "env-pill", children: [_jsx("span", { className: "env-dot" }), "Production"] }), _jsx("button", { type: "button", className: "btn btn--ghost btn--sidebar", onClick: () => {
                                    setToken(null);
                                    window.location.href = '/admin/login';
                                }, children: "Sign out" })] })] }), _jsxs("div", { className: "main-area", children: [_jsx("div", { className: "main-glow", "aria-hidden": true }), _jsx("main", { className: "main-content", children: children })] })] }));
}
