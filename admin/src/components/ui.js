import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PageHeader({ title, subtitle, actions, }) {
    return (_jsxs("header", { className: "page-header", children: [_jsxs("div", { children: [_jsx("h1", { children: title }), subtitle && _jsx("p", { className: "page-subtitle", children: subtitle })] }), actions && _jsx("div", { className: "page-actions", children: actions })] }));
}
export function Card({ children, className = '', padding = true, style, }) {
    return (_jsx("div", { className: `surface-card ${padding ? 'surface-card--padded' : ''} ${className}`.trim(), style: style, children: children }));
}
export function StatCard({ label, value, hint, tone = 'default', }) {
    return (_jsxs("div", { className: `stat-card stat-card--${tone}`, children: [_jsx("span", { className: "stat-label", children: label }), _jsx("span", { className: "stat-value", children: value }), hint && _jsx("span", { className: "stat-hint", children: hint })] }));
}
export function Badge({ children, tone = 'neutral', }) {
    return _jsx("span", { className: `badge badge--${tone}`, children: children });
}
export function Button({ children, variant = 'primary', type = 'button', onClick, disabled, }) {
    return (_jsx("button", { type: type, className: `btn btn--${variant}`, onClick: onClick, disabled: disabled, children: children }));
}
export function Alert({ children, tone = 'info' }) {
    return _jsx("div", { className: `alert alert--${tone}`, children: children });
}
export function LoadingState({ label = 'Loading…' }) {
    return (_jsxs("div", { className: "loading-state", children: [_jsx("span", { className: "spinner", "aria-hidden": true }), _jsx("span", { children: label })] }));
}
export function EmptyState({ title, description }) {
    return (_jsxs("div", { className: "empty-state", children: [_jsx("p", { className: "empty-title", children: title }), description && _jsx("p", { className: "empty-desc", children: description })] }));
}
export function DataTable({ children }) {
    return (_jsx(Card, { padding: false, children: _jsx("div", { className: "table-wrap", children: _jsx("table", { children: children }) }) }));
}
export function Field({ label, children, hint, }) {
    return (_jsxs("label", { className: "field", children: [_jsx("span", { className: "field-label", children: label }), children, hint && _jsx("span", { className: "field-hint", children: hint })] }));
}
