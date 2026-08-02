import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
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
  constructor(private prisma: PrismaService) {}

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
