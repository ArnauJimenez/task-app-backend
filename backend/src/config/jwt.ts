const developmentSecret = 'secreto_super_seguro';

// Production must provide its own secret: the development fallback would let anyone forge tokens.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set when NODE_ENV is production');
  }

  return developmentSecret;
}
