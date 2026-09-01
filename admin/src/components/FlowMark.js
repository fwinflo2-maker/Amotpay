import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FlowMark({ size = 32, variant = 'dark' }) {
    const dot = variant === 'light' ? '#F6F7F5' : '#C9A227';
    const line = variant === 'light' ? 'rgba(246,247,245,0.35)' : 'rgba(201,162,39,0.45)';
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 48 48", fill: "none", "aria-hidden": true, children: [_jsx("circle", { cx: "14", cy: "24", r: "5", fill: dot }), _jsx("circle", { cx: "34", cy: "14", r: "4", fill: dot, opacity: "0.85" }), _jsx("circle", { cx: "34", cy: "34", r: "4", fill: dot, opacity: "0.85" }), _jsx("path", { d: "M19 24 C24 24 28 18 30 14 M19 24 C24 24 28 30 30 34", stroke: line, strokeWidth: "2.5", strokeLinecap: "round" })] }));
}
