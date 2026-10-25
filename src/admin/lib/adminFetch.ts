// Browser-side client for the Go admin API. The access cookie is HttpOnly, so every call
// goes out with credentials and the browser sets Origin/Sec-Fetch-Site itself.

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public body?: unknown,
    ) {
        super(message)
    }
}

const LOGIN_URL = '/auth/google/login'

let refreshing: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
    refreshing ??= fetch('/auth/refresh', { method: 'POST', credentials: 'same-origin' })
        .then((r) => r.ok)
        .catch(() => false)
        .finally(() => {
            setTimeout(() => (refreshing = null), 1000)
        })
    return refreshing
}

function toLogin(): never {
    const back = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `${LOGIN_URL}?return=${back}`
    throw new ApiError(401, 'Sessão expirada')
}

async function raw(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const res = await fetch(`/api/v1/admin${path}`, { credentials: 'same-origin', ...init })
    if (res.status === 401 && retry) {
        if (await refreshSession()) return raw(path, init, false)
        toLogin()
    }
    return res
}

async function fail(res: Response): Promise<never> {
    const body = await res.json().catch(() => undefined)
    const msg = (body as { title?: string; detail?: string } | undefined)?.detail
        ?? (body as { title?: string } | undefined)?.title
        ?? `Erro ${res.status}`
    throw new ApiError(res.status, msg, body)
}

export async function api<T = unknown>(
    path: string,
    opts: { method?: string; json?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers }
    let body: BodyInit | undefined
    if (opts.json !== undefined) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(opts.json)
    }
    const res = await raw(path, { method: opts.method ?? 'GET', headers, body })
    if (!res.ok) await fail(res)
    if (res.status === 204) return undefined as T
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
}

export async function upload<T = unknown>(path: string, form: FormData): Promise<T> {
    const res = await raw(path, { method: 'POST', body: form })
    if (!res.ok) await fail(res)
    return res.json()
}

/** Downloads a file endpoint (CSV exports) using the filename the server suggests. */
export async function download(path: string, fallbackName: string): Promise<void> {
    const res = await raw(path)
    if (!res.ok) await fail(res)
    const blob = await res.blob()
    const name = /filename="?([^";]+)"?/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

export function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : 'Erro inesperado'
}
