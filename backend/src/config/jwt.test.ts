import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJwtSecret } from './jwt';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getJwtSecret', () => {
  it('returns the configured secret, ignoring surrounding whitespace', () => {
    vi.stubEnv('JWT_SECRET', '  a-strong-secret  ');

    expect(getJwtSecret()).toBe('a-strong-secret');
  });

  it('keeps the development fallback outside production', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');

    expect(getJwtSecret()).toBe('secreto_super_seguro');
  });

  it('refuses to start in production without a secret', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => getJwtSecret()).toThrow('JWT_SECRET must be set when NODE_ENV is production');
  });
});
