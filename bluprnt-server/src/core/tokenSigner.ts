import crypto from 'crypto';

const HMAC_SECRET = process.env.TOKEN_SIGNING_SECRET || 'bluprnt-distributed-signing-secret-key-2026';

export interface TokenPayload {
  featureKey: string;
  expiresAt: number; // epoch ms
}

/**
 * Creates an HMAC-SHA256 signed 24h unlock token.
 * Token structure: `<featureKey>@<expiresAt>.<signature>`
 */
export function generate24hUnlockToken(featureKey: string, durationMs = 24 * 60 * 60 * 1000): string {
  const expiresAt = Date.now() + durationMs;
  const payload = `${featureKey}@${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}.${signature}`;
}

/**
 * Validates token signature and checks expiry against the server clock.
 */
export function verifyUnlockToken(tokenString: string): { valid: boolean; payload?: TokenPayload; reason?: string } {
  try {
    const parts = tokenString.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'Malformed token structure' };
    }

    const [payloadStr, signature] = parts;
    const [featureKey, expiresAtStr] = payloadStr.split('@');
    const expiresAt = Number(expiresAtStr);

    if (!featureKey || isNaN(expiresAt)) {
      return { valid: false, reason: 'Invalid payload components' };
    }

    // Verify cryptographic signature
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(payloadStr)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, reason: 'Tampered cryptographic signature' };
    }

    // Check expiration
    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'Token has expired' };
    }

    return {
      valid: true,
      payload: { featureKey, expiresAt },
    };
  } catch (err: any) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}
