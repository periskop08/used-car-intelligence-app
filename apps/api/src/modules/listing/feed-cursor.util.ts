import * as crypto from 'crypto';
import { FeedCursorPayload } from '@used-car-intelligence/shared';
import { BadRequestException } from '@nestjs/common';

const CURSOR_SECRET = process.env.JWT_SECRET || 'torquescout-feed-cursor-secret-key-2026';
const CURSOR_VERSION = 1;

/**
 * Encodes a versioned, HMAC-signed tamper-resistant opaque cursor token.
 */
export function encodeFeedCursor(payload: Omit<FeedCursorPayload, 'version'>): string {
  const fullPayload: FeedCursorPayload = {
    version: CURSOR_VERSION,
    ...payload,
  };
  const json = JSON.stringify(fullPayload);
  const dataB64 = Buffer.from(json, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', CURSOR_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${hmac}`;
}

/**
 * Validates and decodes a tamper-resistant cursor token.
 * Throws BadRequestException if token is tampered or malformed.
 * If city context has changed, returns null (clean continuation reset).
 */
export function decodeFeedCursor(
  cursorToken?: string | null,
  expectedCityId?: string | null
): FeedCursorPayload | null {
  if (!cursorToken || typeof cursorToken !== 'string') return null;
  const parts = cursorToken.split('.');
  if (parts.length !== 2) {
    throw new BadRequestException('Malformed cursor token');
  }

  const [dataB64, hmac] = parts;
  if (!dataB64 || !hmac) {
    throw new BadRequestException('Invalid cursor token structure');
  }

  const expectedHmac = crypto.createHmac('sha256', CURSOR_SECRET).update(dataB64).digest('base64url');
  
  const hmacBuf = Buffer.from(hmac);
  const expectedHmacBuf = Buffer.from(expectedHmac);

  if (hmacBuf.length !== expectedHmacBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedHmacBuf)) {
    throw new BadRequestException('Invalid or tampered feed cursor');
  }

  try {
    const json = Buffer.from(dataB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as FeedCursorPayload;
    if (parsed.version !== CURSOR_VERSION) {
      throw new BadRequestException('Unsupported cursor version');
    }

    // City context verification:
    // If current city is different from cursor city, reset continuation cleanly (cross-city isolation)
    const normalizedExpectedCity = expectedCityId || null;
    const normalizedCursorCity = parsed.cityId || null;
    if (normalizedExpectedCity !== normalizedCursorCity) {
      return null;
    }

    return parsed;
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('Invalid cursor payload');
  }
}
