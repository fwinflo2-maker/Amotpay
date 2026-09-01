const API = import.meta.env.VITE_API_URL ?? 'https://amotpay-api.nexustechnologies.cloud';
let token = localStorage.getItem('amotpay_admin_token');
export function setToken(t) {
    token = t;
    if (t)
        localStorage.setItem('amotpay_admin_token', t);
    else
        localStorage.removeItem('amotpay_admin_token');
}
export function getToken() {
    return token;
}
export async function api(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token)
        headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}/api${path}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Request failed');
    }
    return json.data;
}
export async function login(username, password) {
    const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
        throw new Error(json.error?.message ?? 'Login failed');
    setToken(json.data.token);
}
