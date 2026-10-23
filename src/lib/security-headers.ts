/**
 * Response headers applied to every Start response.
 *
 * The CSP is intentionally a baseline: `default-src` is left alone because
 * the router/SSR bundle and Tailwind runtime may need inline styles/scripts.
 * `frame-ancestors`, `object-src`, `base-uri`, and `form-action` close the
 * high-risk embedding/plugin/redirect classes without breaking the app.
 */
export function securityHeaders(options: { production: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Content-Security-Policy':
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  }
  if (options.production) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
  return headers
}
