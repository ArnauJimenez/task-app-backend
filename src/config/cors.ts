const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

function matchesOrigin(pattern: string, origin: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return pattern === origin;

  const expression = new RegExp(
    `^${pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`,
  );
  return expression.test(origin);
}

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  const configuredOrigins = (
    process.env.CORS_ORIGIN
    ?? process.env.FRONTEND_URL
    ?? DEFAULT_CORS_ORIGIN
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return configuredOrigins.some((pattern) => matchesOrigin(pattern, origin));
}
