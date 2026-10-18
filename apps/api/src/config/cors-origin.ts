export function isAllowedCorsOrigin(
  origin: string | undefined,
  configuredOrigins: readonly string[],
  isDevelopment: boolean,
): boolean {
  if (!origin || configuredOrigins.includes(origin)) return true;
  if (!isDevelopment) return false;

  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
