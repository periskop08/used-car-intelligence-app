import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AiReportGeneratorService } from '../research/ai-report-generator.service';
import * as crypto from 'crypto';

export interface ListingAiContextWarning {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  affectedFields: string[];
}

export interface ListingAiContext {
  listing: {
    id: string;
    publicListingNo: string;
    title?: string;
    price?: {
      amount: string;
      currency: string;
    };
    city?: string;
    district?: string;
    createdAt: string;
    updatedAt: string;
  };
  vehicle: {
    brand?: string;
    model?: string;
    series?: string;
    year?: number;
    mileageKm?: number;
    bodyType?: string;
    engine?: string;
    enginePower?: string;
    engineVolume?: string;
    fuelType?: string;
    transmission?: string;
    traction?: string;
    trim?: string;
    color?: string;
  };
  condition: {
    heavyDamageDeclared?: boolean;
    damageRecordDeclared?: boolean;
    damageAmount?: string;
    paintedParts?: string[];
    localPaintedParts?: string[];
    changedParts?: string[];
    originalParts?: string[];
    warrantyDeclared?: boolean;
    serviceHistoryDeclared?: string;
    inspectionDeclared?: string;
  };
  verifiedDatabaseVehicleReport?: {
    reportId?: string;
    riskScore?: number;
    buyabilityScore?: number;
    biggestRisks?: any;
    sellerQuestions?: any;
    inspectionChecklist?: any;
    summary?: any;
  };
  knownDatabaseProblems?: Array<{ title: string; description: string; riskLevel?: string }>;
  knownDatabaseRecalls?: Array<{ title: string; description: string }>;
  sellerDescriptionFormatted?: string;
  missingFields: string[];
  warnings: ListingAiContextWarning[];
  photosMetadata: {
    photoCount: number;
    moderationStatus: string;
  };
  contextHash: string;
}

@Injectable()
export class ListingAiContextBuilderService {
  private readonly logger = new Logger(ListingAiContextBuilderService.name);

  constructor(
    private prisma: PrismaService,
    private aiReportGeneratorService: AiReportGeneratorService,
  ) {}

  async buildContext(listingId: string): Promise<ListingAiContext> {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        seller: { select: { id: true, username: true } },
        vehicleVariant: {
          include: {
            model: { include: { brand: true } },
            generation: true,
            engine: true,
            transmission: true,
            trim: true,
            problems: { where: { status: 'APPROVED' } },
            recalls: { where: { status: 'APPROVED' } },
          },
        },
        media: { select: { id: true } },
      },
    });

    if (!listing) {
      throw new NotFoundException('İlan bulunamadı.');
    }

    const brand = listing.vehicleVariant?.model?.brand?.name || listing.customBrand || undefined;
    const model = listing.vehicleVariant?.model?.name || listing.customModel || undefined;
    const year = listing.modelYear || listing.customYear || undefined;
    const mileage = listing.kilometers;
    const fuel = listing.fuelType || listing.vehicleVariant?.engine?.fuelType || undefined;
    const transmission = listing.transmission || listing.vehicleVariant?.transmission?.type || listing.customTransmission || undefined;
    const bodyType = listing.bodyType || listing.vehicleVariant?.bodyType || undefined;

    // Fetch Database Problems & Recalls
    let knownDatabaseProblems: Array<{ title: string; description: string; riskLevel?: string }> = [];
    let knownDatabaseRecalls: Array<{ title: string; description: string }> = [];
    let verifiedDatabaseVehicleReport: any = null;

    // 1. Check or Generate Verified DB Report Cache for Variant
    if (listing.vehicleVariantId) {
      try {
        let existingReport = await this.prisma.aiVehicleReport.findUnique({
          where: {
            variantId_languageCode: {
              variantId: listing.vehicleVariantId,
              languageCode: 'tr',
            },
          },
        });

        // Auto-generate report in database if missing
        if (!existingReport) {
          this.logger.log(`No DB report cache for variant ${listing.vehicleVariantId}. Auto-generating report cache in database...`);
          existingReport = await this.aiReportGeneratorService.generateReportCache(listing.vehicleVariantId, 'tr');
        }

        if (existingReport) {
          verifiedDatabaseVehicleReport = {
            reportId: existingReport.id,
            riskScore: existingReport.riskScore,
            buyabilityScore: existingReport.buyabilityScore,
            biggestRisks: existingReport.biggestRisks,
            sellerQuestions: existingReport.sellerQuestions,
            inspectionChecklist: existingReport.inspectionChecklist,
            summary: existingReport.summary,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch or generate DB report cache: ${err?.message || err}`);
      }
    }

    // 2. Fetch Variant Problems if available
    if (listing.vehicleVariant?.problems && listing.vehicleVariant.problems.length > 0) {
      knownDatabaseProblems = listing.vehicleVariant.problems.map((p) => ({
        title: p.title,
        description: p.description,
        riskLevel: String(p.riskLevel),
      }));
    }
    if (listing.vehicleVariant?.recalls && listing.vehicleVariant.recalls.length > 0) {
      knownDatabaseRecalls = listing.vehicleVariant.recalls.map((r) => ({
        title: r.title,
        description: r.description,
      }));
    }

    // 3. Fallback: Search DB by Brand/Model if custom model
    if (knownDatabaseProblems.length === 0 && (model || brand)) {
      try {
        const matchingProblems = await this.prisma.commonProblem.findMany({
          where: {
            status: 'APPROVED',
            variant: {
              model: {
                name: { contains: model || '', mode: 'insensitive' },
              },
            },
          },
          take: 5,
        });
        if (matchingProblems && matchingProblems.length > 0) {
          knownDatabaseProblems = matchingProblems.map((p) => ({
            title: p.title,
            description: p.description,
            riskLevel: String(p.riskLevel),
          }));
        }
      } catch (e) {}
    }

    // Detect Missing Fields
    const missingFields: string[] = [];
    if (!brand) missingFields.push('Marka');
    if (!model) missingFields.push('Model/Seri');
    if (!year) missingFields.push('Model Yılı');
    if (!mileage) missingFields.push('Kilometre');
    if (!fuel) missingFields.push('Yakıt Türü');
    if (!transmission) missingFields.push('Şanzıman');
    if (!listing.engineDisplacement) missingFields.push('Motor Hacmi');
    if (!listing.description) missingFields.push('Satıcı Açıklaması');

    // Detect Contradictions / Warnings
    const warnings: ListingAiContextWarning[] = [];
    const descLower = (listing.description || '').toLowerCase();

    if (descLower.includes('kazasız') || descLower.includes('hatasız')) {
      if (listing.heavyDamage) {
        warnings.push({
          code: 'CONTRADICTION_HEAVY_DAMAGE_SELLER_CLAIM',
          severity: 'CRITICAL',
          message: 'Satıcı açıklamasında "kazasız/hatasız" yazılmış ancak ilanda Ağır Hasar beyanı mevcuttur.',
          affectedFields: ['description', 'heavyDamage'],
        });
      }
    }

    if (listing.heavyDamage && listing.priceAmount) {
      warnings.push({
        code: 'HEAVY_DAMAGE_DECLARED',
        severity: 'WARNING',
        message: 'İlanda ağır hasar beyan edilmiştir. Ekspertizde şase, podye ve hava yastıkları titizlikle incelenmelidir.',
        affectedFields: ['heavyDamage'],
      });
    }

    // Strip sensitive seller data (phones, emails) from description for AI context
    let safeDescription = (listing.description || '')
      .replace(/[0-9]{10,11}/g, '[TELEFON_GİZLENDİ]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EPOSTA_GİZLENDİ]');

    const sellerDescriptionFormatted = `<SELLER_DESCRIPTION>\n${safeDescription}\n</SELLER_DESCRIPTION>`;

    // Generate Canonical Object for Hashing
    const canonicalObject = {
      id: listing.id,
      title: listing.title,
      price: listing.priceAmount ? listing.priceAmount.toString() : '',
      currency: listing.currency,
      brand,
      model,
      year,
      mileage,
      fuel,
      transmission,
      bodyType,
      color: listing.color,
      heavyDamage: listing.heavyDamage,
      missingFields: missingFields.sort(),
      description: safeDescription.trim(),
      updatedAt: listing.updatedAt.toISOString(),
      reportId: verifiedDatabaseVehicleReport?.reportId || '',
    };

    const sortedKeysJson = JSON.stringify(canonicalObject, Object.keys(canonicalObject).sort());
    const contextHash = crypto.createHash('sha256').update(sortedKeysJson).digest('hex');

    const cleanPublicListingNo = `TS-L${listing.id.slice(0, 8).toUpperCase()}`;

    return {
      listing: {
        id: listing.id,
        publicListingNo: cleanPublicListingNo,
        title: listing.title,
        price: {
          amount: listing.priceAmount.toString(),
          currency: listing.currency || 'TRY',
        },
        city: listing.city,
        district: listing.district || undefined,
        createdAt: listing.createdAt.toISOString(),
        updatedAt: listing.updatedAt.toISOString(),
      },
      vehicle: {
        brand,
        model,
        year,
        mileageKm: mileage,
        bodyType: bodyType ? String(bodyType) : undefined,
        fuelType: fuel ? String(fuel) : undefined,
        transmission: transmission ? String(transmission) : undefined,
        color: listing.color || undefined,
      },
      condition: {
        heavyDamageDeclared: listing.heavyDamage,
        warrantyDeclared: listing.hasWarranty,
      },
      verifiedDatabaseVehicleReport,
      knownDatabaseProblems,
      knownDatabaseRecalls,
      sellerDescriptionFormatted,
      missingFields,
      warnings,
      photosMetadata: {
        photoCount: listing.media?.length || 0,
        moderationStatus: 'APPROVED',
      },
      contextHash,
    };
  }
}
