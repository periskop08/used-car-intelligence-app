import { Request } from 'express';

/**
 * Detects actual image content type from buffer magic bytes.
 */
export function detectImageContentType(buffer: Buffer, fallbackContentType?: string): string {
  if (!buffer || buffer.length === 0) {
    return fallbackContentType || 'image/jpeg';
  }

  // JPEG / JFIF / EXIF: ff d8 ff
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4e 47 0d 0a 1a 0a
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // GIF: GIF87a or GIF89a
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'GIF8') {
    return 'image/gif';
  }

  // HEIC / HEIF: ....ftypheic or ....ftypmif1
  if (
    buffer.length >= 12 &&
    (buffer.toString('ascii', 4, 12) === 'ftypheic' ||
      buffer.toString('ascii', 4, 12) === 'ftypmif1' ||
      buffer.toString('ascii', 4, 8) === 'ftyp')
  ) {
    return 'image/heic';
  }

  return fallbackContentType || 'image/jpeg';
}

/**
 * Derives the base URL for the listing media proxy endpoint.
 */
export function getBaseProxyUrl(req?: any): string {
  if (req) {
    const host = req.get ? req.get('host') : (req.headers ? (req.headers['host'] as string) : '');
    const protocol = (req.headers && req.headers['x-forwarded-proto']) || (req.protocol ? req.protocol : 'https');
    if (host) {
      return `${protocol}://${host}/listings/media-proxy`;
    }
  }

  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, '')}/listings/media-proxy`;
  }

  return '/listings/media-proxy';
}

/**
 * Resolves a single media item's delivery URL through the canonical media proxy.
 */
export function resolveCanonicalMediaUrl(urlOrStorageKey?: string | null, baseProxyUrl?: string): string {
  if (!urlOrStorageKey) return '';
  if (urlOrStorageKey.startsWith('data:')) return urlOrStorageKey;

  // Idempotency: if already wrapped in media-proxy, return as-is
  if (urlOrStorageKey.includes('/listings/media-proxy/')) {
    return urlOrStorageKey;
  }

  // Extract storageKey from R2 public dev or S3 storage URL
  let storageKey = urlOrStorageKey;
  if (urlOrStorageKey.includes('.r2.dev/')) {
    storageKey = urlOrStorageKey.split('.r2.dev/')[1];
  } else if (urlOrStorageKey.includes('cloudflarestorage.com/')) {
    const parts = urlOrStorageKey.split('cloudflarestorage.com/')[1]?.replace(/^\//, '');
    const pathParts = parts?.split('/');
    if (pathParts && pathParts[0] === 'torquescout-listings') {
      storageKey = pathParts.slice(1).join('/');
    } else {
      storageKey = parts || '';
    }
  }

  // If storageKey is a valid path (starts with listings/ or relative path without protocol)
  if (storageKey && !storageKey.startsWith('http://') && !storageKey.startsWith('https://')) {
    const base = baseProxyUrl || getBaseProxyUrl();
    return `${base}/${storageKey}`;
  }

  return urlOrStorageKey;
}

export interface MediaLike {
  id?: string;
  url?: string | null;
  storageKey?: string | null;
  thumbnailUrl?: string | null;
  mediumUrl?: string | null;
  [key: string]: any;
}

/**
 * Formats a media item with canonical delivery URLs.
 */
export function resolveCanonicalMediaItem<T extends MediaLike>(item: T, baseProxyUrl?: string): T {
  if (!item) return item;
  const storageKey = item.storageKey || (item.url?.includes('.r2.dev/') ? item.url.split('.r2.dev/')[1] : null);

  if (storageKey) {
    const canonicalUrl = resolveCanonicalMediaUrl(storageKey, baseProxyUrl);
    return {
      ...item,
      url: canonicalUrl,
      thumbnailUrl: canonicalUrl,
      mediumUrl: canonicalUrl,
    };
  }

  if (item.url) {
    const canonicalUrl = resolveCanonicalMediaUrl(item.url, baseProxyUrl);
    return {
      ...item,
      url: canonicalUrl,
      thumbnailUrl: item.thumbnailUrl ? resolveCanonicalMediaUrl(item.thumbnailUrl, baseProxyUrl) : canonicalUrl,
      mediumUrl: item.mediumUrl ? resolveCanonicalMediaUrl(item.mediumUrl, baseProxyUrl) : canonicalUrl,
    };
  }

  return item;
}

/**
 * Formats a list of media items with canonical delivery URLs.
 * This is the SINGLE CANONICAL MEDIA RESOLVER for all backend responses.
 */
export function resolveCanonicalMediaList<T extends MediaLike>(list: T[], reqOrBaseUrl?: any): T[] {
  if (!Array.isArray(list)) return [];
  const baseProxyUrl = typeof reqOrBaseUrl === 'string' ? reqOrBaseUrl : getBaseProxyUrl(reqOrBaseUrl);
  return list.map((item) => resolveCanonicalMediaItem(item, baseProxyUrl));
}
