import { afterEach, describe, expect, it } from 'vitest';
import { isCorsOriginAllowed } from './cors';

const originalCorsOrigin = process.env.CORS_ORIGIN;
const originalFrontendUrl = process.env.FRONTEND_URL;

afterEach(() => {
  if (originalCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = originalCorsOrigin;

  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe('isCorsOriginAllowed', () => {
  it('uses the local frontend origin by default and allows requests without an Origin header', () => {
    delete process.env.CORS_ORIGIN;
    delete process.env.FRONTEND_URL;

    expect(isCorsOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isCorsOriginAllowed('https://untrusted.example')).toBe(false);
    expect(isCorsOriginAllowed(undefined)).toBe(true);
  });

  it('allows configured comma-separated origins and wildcard patterns', () => {
    process.env.CORS_ORIGIN = 'https://app.example.com,https://*.preview.example.com';

    expect(isCorsOriginAllowed('https://app.example.com')).toBe(true);
    expect(isCorsOriginAllowed('https://pr-42.preview.example.com')).toBe(true);
    expect(isCorsOriginAllowed('https://example.com')).toBe(false);
  });

  it('allows all origins only when an explicit wildcard is configured', () => {
    process.env.CORS_ORIGIN = '*';

    expect(isCorsOriginAllowed('https://any.example')).toBe(true);
  });
});
