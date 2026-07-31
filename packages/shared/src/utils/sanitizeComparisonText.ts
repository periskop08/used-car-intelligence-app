/**
 * TorqueScout Markdown & Text Sanitizer
 * Removes raw markdown syntax (**bold**, ### headers, leading code blocks & bullet points)
 * while strictly preserving numeric ranges and hyphens like "0-100 km/h", "2018-2022", "1.5-2.0 L/100km".
 */
export function sanitizeComparisonText(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = text;

  // Remove code block markers
  cleaned = cleaned.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');

  // Remove heading hashes at line starts (### Header -> Header)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Remove bold asterisks (**Text** -> Text)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

  // Remove italic asterisks (*Text* -> Text)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

  // Remove line-start bullet dashes (- Item -> Item) without touching numeric ranges (100-150)
  cleaned = cleaned.replace(/^[ \t]*-[ \t]+([^\d])/gm, '$1');

  // Remove double underscores (__Text__ -> Text)
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');

  // Trim extra empty lines or spaces
  return cleaned.trim();
}

/**
 * Deeply sanitizes all string fields of a VehicleComparisonResult object.
 */
export function sanitizeComparisonResult<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeComparisonText(obj) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeComparisonResult(item)) as unknown as T;
  }

  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (typeof val === 'string') {
      result[key] = sanitizeComparisonText(val);
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeComparisonResult(val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
