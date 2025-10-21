export async function authFetch(getToken, url, options={}) {
    const token = await getToken();
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
    };

    const res = await fetch(url, {...options, headers});
    if (!res.ok) {
        const json = await res.json().catch(() => null);
        const text = json?.detail || (await res.text().catch(() => null)) || res.statusText;
        const err = new Error(`HTTP ${res.status}: ${text}`);
        err.status = res.status;
        err.response = res;
        throw err;
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null); 
}