const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface TaxonomyOption {
  label: string;
  value: string;
}

export interface MatchVariantParams {
  brand: string;
  model: string;
  year: string | number;
  bodyType: string;
  engine: string;
  fuelType: string;
  transmission: string;
  trim: string;
}

export const vehicleTaxonomyApi = {
  async getBrands(): Promise<TaxonomyOption[]> {
    const res = await fetch(`${API_URL}/vehicle-filters/brands`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getModels(brand: string): Promise<TaxonomyOption[]> {
    if (!brand) return [];
    const res = await fetch(`${API_URL}/vehicle-filters/models?brand=${encodeURIComponent(brand)}`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getYears(brand: string, model: string): Promise<TaxonomyOption[]> {
    if (!brand || !model) return [];
    const res = await fetch(
      `${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(brand)}&modelFamily=${encodeURIComponent(model)}`
    );
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getBodyTypes(brand: string, model: string, year: string | number): Promise<TaxonomyOption[]> {
    if (!brand || !model || !year) return [];
    const res = await fetch(
      `${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(brand)}&modelFamily=${encodeURIComponent(model)}&year=${encodeURIComponent(String(year))}`
    );
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getEngines(brand: string, model: string, year: string | number, bodyType?: string): Promise<TaxonomyOption[]> {
    if (!brand || !model || !year) return [];
    const query = new URLSearchParams({
      brand,
      modelFamily: model,
      year: String(year),
      ...(bodyType ? { bodyType } : {}),
    });
    const res = await fetch(`${API_URL}/vehicle-filters/engines?${query.toString()}`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getFuelTypes(
    brand: string,
    model: string,
    year: string | number,
    bodyType?: string,
    engine?: string
  ): Promise<TaxonomyOption[]> {
    if (!brand || !model || !year) return [];
    const query = new URLSearchParams({
      brand,
      modelFamily: model,
      year: String(year),
      ...(bodyType ? { bodyType } : {}),
      ...(engine ? { engineVersion: engine } : {}),
    });
    const res = await fetch(`${API_URL}/vehicle-filters/fuel-types?${query.toString()}`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getTransmissions(
    brand: string,
    model: string,
    year: string | number,
    bodyType?: string,
    engine?: string,
    fuelType?: string
  ): Promise<TaxonomyOption[]> {
    if (!brand || !model || !year) return [];
    const query = new URLSearchParams({
      brand,
      modelFamily: model,
      year: String(year),
      ...(bodyType ? { bodyType } : {}),
      ...(engine ? { engineVersion: engine } : {}),
      ...(fuelType ? { fuelType } : {}),
    });
    const res = await fetch(`${API_URL}/vehicle-filters/transmissions?${query.toString()}`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async getTrims(
    brand: string,
    model: string,
    year: string | number,
    bodyType?: string,
    engine?: string,
    fuelType?: string,
    transmission?: string
  ): Promise<TaxonomyOption[]> {
    if (!brand || !model || !year) return [];
    const query = new URLSearchParams({
      brand,
      modelFamily: model,
      year: String(year),
      ...(bodyType ? { bodyType } : {}),
      ...(engine ? { engineVersion: engine } : {}),
      ...(fuelType ? { fuelType } : {}),
      ...(transmission ? { transmissionType: transmission } : {}),
    });
    const res = await fetch(`${API_URL}/vehicle-filters/trims?${query.toString()}`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  async matchVariant(params: MatchVariantParams): Promise<{ success: boolean; variantId: string | null }> {
    const query = new URLSearchParams({
      brand: params.brand,
      modelFamily: params.model,
      year: String(params.year),
      bodyType: params.bodyType,
      engineVersion: params.engine,
      fuelType: params.fuelType,
      transmissionType: params.transmission,
      trimPackage: params.trim,
    });
    const res = await fetch(`${API_URL}/vehicle-filters/match-variant?${query.toString()}`);
    const json = await res.json();
    return {
      success: !!json.success && !!json.variantId,
      variantId: json.variantId || null,
    };
  },

  async getVariantDetail(variantId: string, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/vehicles/variants/${variantId}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  },

  async getTechnicalSpecs(variantId: string): Promise<{
    variantId: string;
    engineDisplacement?: {
      value?: number | null;
      valueCc?: number | null;
      status?: 'VERIFIED' | 'MISSING' | 'CONFLICT' | 'RESEARCHING';
      verified: boolean;
      sourceType: string | null;
      evidence?: string | null;
      evidenceQuality?: 'STRONG' | 'MODERATE' | 'WEAK' | null;
      suspicionReason?: string | null;
    };
    enginePower?: {
      value?: number | null;
      valueHp?: number | null;
      status?: 'VERIFIED' | 'MISSING' | 'CONFLICT' | 'RESEARCHING';
      verified: boolean;
      sourceType: string | null;
      evidence?: string | null;
      evidenceQuality?: 'STRONG' | 'MODERATE' | 'WEAK' | null;
      suspicionReason?: string | null;
    };
    engineDisplacementCc: number | null;
    enginePowerHp: number | null;
    drivetrain?: 'FWD' | 'RWD' | 'AWD' | null;
    drivetrainNameTr?: string | null;
    isComplete: boolean;
    isCatalogVerified: boolean;
    sources?: { displacement?: string; power?: string; drivetrain?: string };
    unresolvedConflict?: boolean;
  } | null> {
    if (!variantId) return null;
    try {
      const res = await fetch(`${API_URL}/vehicles/variants/${variantId}/technical-specs`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async enrichTechnicalSpecs(variantId: string, token?: string): Promise<{
    variantId: string;
    engineDisplacement?: {
      value?: number | null;
      valueCc?: number | null;
      status?: 'VERIFIED' | 'MISSING' | 'CONFLICT' | 'RESEARCHING';
      verified: boolean;
      sourceType: string | null;
      evidence?: string | null;
      evidenceQuality?: 'STRONG' | 'MODERATE' | 'WEAK' | null;
      suspicionReason?: string | null;
    };
    enginePower?: {
      value?: number | null;
      valueHp?: number | null;
      status?: 'VERIFIED' | 'MISSING' | 'CONFLICT' | 'RESEARCHING';
      verified: boolean;
      sourceType: string | null;
      evidence?: string | null;
      evidenceQuality?: 'STRONG' | 'MODERATE' | 'WEAK' | null;
      suspicionReason?: string | null;
    };
    engineDisplacementCc: number | null;
    enginePowerHp: number | null;
    drivetrain?: 'FWD' | 'RWD' | 'AWD' | null;
    drivetrainNameTr?: string | null;
    isComplete: boolean;
    isCatalogVerified: boolean;
    sources?: { displacement?: string; power?: string; drivetrain?: string };
    unresolvedConflict?: boolean;
  } | null> {
    if (!variantId) return null;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/vehicles/variants/${variantId}/enrich-technical-specs`, {
        method: "POST",
        headers,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};
