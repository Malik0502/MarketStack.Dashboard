export function resolveApiUrl(value: string | undefined) {
  const url = (value ?? 'https://localhost:7065/api').trim().replace(/\/+$/, '')
  if (!url || (!url.startsWith('/') && !/^https?:\/\//.test(url)) || url.startsWith('//') || /[?#]/.test(url)) {
    throw new Error('VITE_API_URL must be an HTTP(S) URL or a root-relative API path')
  }
  if (!url.startsWith('/')) {
    const parsed = new URL(url)
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error('VITE_API_URL must not contain credentials')
  }
  return url
}

export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL)
