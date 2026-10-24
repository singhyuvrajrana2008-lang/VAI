/**
 * Only same-origin internal paths may be used as a post-auth destination.
 * Rejects absolute URLs, protocol-relative URLs, auth-loop destinations and
 * backslash tricks that some browsers normalise into a new origin.
 */
export function safeRedirect(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  const value = candidate.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\\')) return fallback;
  const lower = value.toLowerCase();
  if (lower.startsWith('/login') || lower.startsWith('/signup') || lower.startsWith('/auth/')) {
    return fallback;
  }
  return value;
}
