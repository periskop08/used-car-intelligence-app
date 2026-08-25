import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface CanonicalMapping {
  variantId: string;
  brand: string;
  model: string;
  year: number;
  before: string;
  after: string;
  truthId: string;
}

export interface CanonicalAssetData {
  policyVersion: string;
  generatedAt: string;
  sourcePolicySHA: string;
  changeManifestSHA: string;
  generatedAssetSHA: string;
  changedVariantCount: number;
  mappings: CanonicalMapping[];
}

@Injectable()
export class CanonicalDisplayService implements OnModuleInit {
  private readonly logger = new Logger(CanonicalDisplayService.name);
  private mappingsByVariantId = new Map<string, CanonicalMapping>();
  private isLoadedSuccessfully = false;
  private featureFlagEnabled = false; // Default OFF!

  onModuleInit() {
    this.loadPolicyAsset();
  }

  public loadPolicyAsset() {
    try {
      // 1. Strict Explicit Default-OFF Feature Flag Check
      const envFlag = (process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION || '').trim().toLowerCase();
      this.featureFlagEnabled = (envFlag === 'true' || envFlag === '1');

      if (!this.featureFlagEnabled) {
        this.logger.log('Canonical Display Projection Feature Flag is OFF (Default-OFF). Fallback to raw DB display.');
        this.isLoadedSuccessfully = false;
        return;
      }

      // 2. Policy Version Pin Check
      const envVersion = (process.env.CANONICAL_DISPLAY_POLICY_VERSION || 'PHASE2P2_V2').trim();
      if (envVersion !== 'PHASE2P2_V2') {
        this.logger.warn(`Unsupported policy version requested: '${envVersion}'. Fallback to raw DB display.`);
        this.featureFlagEnabled = false;
        this.isLoadedSuccessfully = false;
        return;
      }

      // 3. Resolve Asset Path (supports src, dist, cwd, and monorepo root candidate paths)
      const candidatePaths = [
        path.join(__dirname, '../../data/canonical-display/phase2p2-v2.json'),
        path.join(__dirname, '../data/canonical-display/phase2p2-v2.json'),
        path.join(process.cwd(), 'src/data/canonical-display/phase2p2-v2.json'),
        path.join(process.cwd(), 'dist/src/data/canonical-display/phase2p2-v2.json'),
        path.join(process.cwd(), 'apps/api/src/data/canonical-display/phase2p2-v2.json'),
        path.join(process.cwd(), 'apps/api/dist/src/data/canonical-display/phase2p2-v2.json'),
      ];

      let assetPath = candidatePaths.find(p => fs.existsSync(p));
      if (!assetPath) {
        this.logger.warn(`Canonical policy asset missing. Fallback to raw DB display.`);
        this.featureFlagEnabled = false;
        this.isLoadedSuccessfully = false;
        return;
      }


      const assetContent = fs.readFileSync(assetPath, 'utf8');
      const assetData: CanonicalAssetData = JSON.parse(assetContent);

      if (!assetData || assetData.policyVersion !== 'PHASE2P2_V2' || !Array.isArray(assetData.mappings)) {
        this.logger.error('Invalid canonical policy asset metadata. Fallback to raw DB display.');
        this.featureFlagEnabled = false;
        this.isLoadedSuccessfully = false;
        return;
      }

      if (assetData.changedVariantCount !== 86 || assetData.mappings.length !== 86) {
        this.logger.error(`Asset mapping count discrepancy: expected 86, got ${assetData.mappings.length}`);
        this.featureFlagEnabled = false;
        this.isLoadedSuccessfully = false;
        return;
      }

      this.mappingsByVariantId.clear();
      assetData.mappings.forEach(m => {
        if (m.variantId) {
          this.mappingsByVariantId.set(m.variantId, m);
        }
      });

      this.isLoadedSuccessfully = true;
      this.logger.log(`Successfully loaded PHASE2P2_V2 Canonical Display Asset (${this.mappingsByVariantId.size} authorized variants).`);
    } catch (err: any) {
      this.logger.error(`Error loading canonical policy asset: ${err?.message}. Fallback to raw DB display.`);
      this.featureFlagEnabled = false;
      this.isLoadedSuccessfully = false;
    }
  }

  public isEnabled(): boolean {
    return this.featureFlagEnabled && this.isLoadedSuccessfully;
  }

  /**
   * Projects a raw engine display string to canonical display text for a specific variant UUID.
   * If variant UUID is not in the authorized manifest or feature flag is OFF, returns raw text unchanged.
   */
  public getProjectedEngineCode(variantId: string, rawEngineCode: string): string {
    if (!this.isEnabled() || !variantId || !rawEngineCode) {
      return rawEngineCode;
    }

    const mapping = this.mappingsByVariantId.get(variantId);
    if (mapping) {
      return mapping.after;
    }

    return rawEngineCode;
  }

  /**
   * Context-bound reverse resolution:
   * Resolves a user-selected target engine display string (e.g. "1.5") back to raw DB engine codes
   * (e.g. ["1.5", "1.5 Boxer"]) strictly restricted to actual candidate VehicleVariant rows in active parent scope!
   */
  public getRawEngineCodesForTarget(targetEngine: string, variants: Array<{ id: string; engine?: { code?: string } | null }>): string[] {
    if (!targetEngine) return [];

    const rawCodesSet = new Set<string>();
    const targetClean = targetEngine.trim().toLowerCase();

    variants.forEach(v => {
      const rawCode = v.engine?.code;
      if (!rawCode) return;

      const rawClean = rawCode.trim().toLowerCase();
      if (rawClean === targetClean) {
        rawCodesSet.add(rawCode);
      }

      // Check if variant projects to targetEngine
      if (this.isEnabled()) {
        const projected = this.getProjectedEngineCode(v.id, rawCode);
        if (projected.trim().toLowerCase() === targetClean) {
          rawCodesSet.add(rawCode);
        }
      }
    });

    if (rawCodesSet.size === 0) {
      rawCodesSet.add(targetEngine);
    }

    return Array.from(rawCodesSet);
  }
}
