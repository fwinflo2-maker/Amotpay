const API = import.meta.env.VITE_API_URL ?? 'https://amotpay-api.nexustechnologies.cloud';
let token = localStorage.getItem('amotpay_admin_token');
let accountStatus = null;
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
export function setAccountStatus(status) {
    accountStatus = status;
    if (status?.password_change_required) {
        localStorage.setItem('amotpay_admin_password_change', '1');
    }
    else {
        localStorage.removeItem('amotpay_admin_password_change');
    }
}
export function passwordChangeRequired() {
    return accountStatus?.password_change_required === true
        || localStorage.getItem('amotpay_admin_password_change') === '1';
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
        const code = json.error?.code;
        const err = new Error(json.error?.message ?? 'Request failed');
        err.code = code;
        throw err;
    }
    return json.data;
}
export async function login(username, password, totpCode) {
    const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            password,
            ...(totpCode ? { totp_code: totpCode } : {}),
        }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
        const err = new Error(json.error?.message ?? 'Login failed');
        err.code = json.error?.code;
        throw err;
    }
    const data = json.data;
    setToken(data.token);
    setAccountStatus({
        password_change_required: data.password_change_required,
        totp_enabled: data.totp_enabled,
        username: data.username,
    });
    return data;
}
export async function logout() {
    try {
        if (token)
            await api('/admin/logout', { method: 'POST', body: '{}' });
    }
    finally {
        setToken(null);
        setAccountStatus(null);
    }
}
