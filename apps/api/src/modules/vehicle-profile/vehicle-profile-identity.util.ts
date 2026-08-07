export interface VehicleProfileIdentityInput {
  brand: string;
  model: string;
  generation?: string | null;
  generationCode?: string | null;
  yearStart: number;
  yearEnd?: number | null;
  bodyType: string;
}

export function normalizeIdentitySlug(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

export function buildVehicleProfileIdentityKey(input: VehicleProfileIdentityInput): string {
  const normBrand = normalizeIdentitySlug(input.brand);
  const normModel = normalizeIdentitySlug(input.model);
  const normGen = normalizeIdentitySlug(input.generationCode || input.generation) || 'nogen';
  const yearStart = input.yearStart || 0;
  const yearEnd = input.yearEnd ? input.yearEnd : 'present';
  const normBody = normalizeIdentitySlug(input.bodyType) || 'unknown';

  return `${normBrand}|${normModel}|${normGen}|${yearStart}|${yearEnd}|${normBody}`;
}

export function buildVehicleProfileSlug(input: VehicleProfileIdentityInput): string {
  const normBrand = normalizeIdentitySlug(input.brand);
  const normModel = normalizeIdentitySlug(input.model);
  const normGen = normalizeIdentitySlug(input.generationCode || input.generation);
  const yearRange = `${input.yearStart}${input.yearEnd ? '-' + input.yearEnd : ''}`;
  const normBody = normalizeIdentitySlug(input.bodyType);

  const parts = [normBrand, normModel, normGen, normBody, yearRange].filter(Boolean);
  return parts.join('-');
}
